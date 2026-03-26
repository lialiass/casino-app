import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Player, Game, GamePlayer, GameResult, PlayerStats } from './types';
import { supabase, hasSupabase } from './lib/supabase';

const STORAGE_KEY = 'poker_manager_data';

interface AppData {
  players: Player[];
  games: Game[];
}

interface AppContextType {
  players: Player[];
  games: Game[];
  isLoading: boolean;
  addPlayer: (name: string) => void;
  updatePlayer: (id: string, name: string, photoUrl?: string) => void;
  deletePlayer: (id: string) => void;
  uploadPlayerPhoto: (playerId: string, file: File) => Promise<string | null>;
  createGame: (playerIds: string[], buyIn: number) => Game;
  addRebuy: (gameId: string, playerId: string) => void;
  finishGame: (gameId: string, winnerId: string, secondId: string) => Game;
  deleteGame: (gameId: string) => void;
  getActiveGame: () => Game | undefined;
  getGameById: (id: string) => Game | undefined;
  getPlayerById: (id: string) => Player | undefined;
  getPlayerStats: () => PlayerStats[];
}

const AppContext = createContext<AppContextType | null>(null);

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppData;
  } catch {}
  return { players: [], games: [] };
}

function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// --- Supabase DB <-> TypeScript mappers ---

function dbToPlayer(row: Record<string, unknown>): Player {
  return {
    id: row.id as string,
    name: row.name as string,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    photoUrl: (row.photo_url as string | null) ?? undefined,
  };
}

function playerToDb(p: Player): Record<string, unknown> {
  return {
    id: p.id,
    name: p.name,
    created_at: p.createdAt,
    photo_url: p.photoUrl ?? null,
  };
}

function dbToGame(row: Record<string, unknown>): Game {
  return {
    id: row.id as string,
    date: row.date as string,
    buyIn: row.buy_in as number,
    status: row.status as 'in_progress' | 'finished',
    winnerId: (row.winner_id as string | null) ?? undefined,
    secondId: (row.second_id as string | null) ?? undefined,
    pot: (row.pot as number | null) ?? undefined,
    players: (row.players as GamePlayer[]) ?? [],
    results: (row.results as GameResult[] | null) ?? undefined,
  };
}

function gameToDb(g: Game): Record<string, unknown> {
  return {
    id: g.id,
    date: g.date,
    buy_in: g.buyIn,
    status: g.status,
    winner_id: g.winnerId ?? null,
    second_id: g.secondId ?? null,
    pot: g.pot ?? null,
    players: g.players,
    results: g.results ?? null,
  };
}

// --- Image compression ---

async function compressImage(file: File, maxSize = 500): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Compression failed'));
      }, 'image/jpeg', 0.8);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Load failed')); };
    img.src = url;
  });
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(loadData);
  const [isLoading, setIsLoading] = useState(hasSupabase);
  const skipNextSaveRef = useRef(false);

  // Fetch all data from Supabase
  const fetchFromSupabase = useCallback(async () => {
    if (!supabase) return;
    const [{ data: pRows }, { data: gRows }] = await Promise.all([
      supabase.from('players').select('*'),
      supabase.from('games').select('*'),
    ]);
    if (!pRows || !gRows) return;
    const newData: AppData = {
      players: pRows.map(r => dbToPlayer(r as Record<string, unknown>)),
      games: gRows.map(r => dbToGame(r as Record<string, unknown>)),
    };
    skipNextSaveRef.current = true;
    setData(newData);
    saveData(newData);
  }, []);

  // Initial load from Supabase
  useEffect(() => {
    if (!supabase) return;
    fetchFromSupabase().finally(() => setIsLoading(false));
  }, [fetchFromSupabase]);

  // Realtime subscription
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, fetchFromSupabase)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, fetchFromSupabase)
      .subscribe();
    return () => { client.removeChannel(channel); };
  }, [fetchFromSupabase]);

  // Persist to localStorage on every change
  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    saveData(data);
  }, [data]);

  const addPlayer = useCallback((name: string) => {
    const player: Player = {
      id: generateId(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };
    setData(prev => ({ ...prev, players: [...prev.players, player] }));
    supabase?.from('players').insert(playerToDb(player));
  }, []);

  const updatePlayer = useCallback((id: string, name: string, photoUrl?: string) => {
    setData(prev => ({
      ...prev,
      players: prev.players.map(p =>
        p.id === id
          ? { ...p, name: name.trim(), ...(photoUrl !== undefined ? { photoUrl } : {}) }
          : p
      ),
    }));
    supabase?.from('players').update({
      name: name.trim(),
      ...(photoUrl !== undefined ? { photo_url: photoUrl } : {}),
    }).eq('id', id);
  }, []);

  const deletePlayer = useCallback((id: string) => {
    setData(prev => ({ ...prev, players: prev.players.filter(p => p.id !== id) }));
    supabase?.from('players').delete().eq('id', id);
  }, []);

  const uploadPlayerPhoto = useCallback(async (playerId: string, file: File): Promise<string | null> => {
    if (!supabase) return null;
    try {
      const compressed = await compressImage(file);
      const ext = 'jpg';
      const path = `${playerId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('player-photos').upload(path, compressed, {
        contentType: 'image/jpeg',
        upsert: true,
      });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('player-photos').getPublicUrl(path);
      const photoUrl = urlData.publicUrl;
      // Update player record
      setData(prev => ({
        ...prev,
        players: prev.players.map(p => p.id === playerId ? { ...p, photoUrl } : p),
      }));
      await supabase.from('players').update({ photo_url: photoUrl }).eq('id', playerId);
      return photoUrl;
    } catch (err) {
      console.error('Photo upload failed:', err);
      return null;
    }
  }, []);

  const createGame = useCallback((playerIds: string[], buyIn: number): Game => {
    const gamePlayers: GamePlayer[] = playerIds.map(id => ({ playerId: id, rebuys: 0 }));
    const game: Game = {
      id: generateId(),
      date: new Date().toISOString(),
      buyIn,
      players: gamePlayers,
      status: 'in_progress',
    };
    setData(prev => ({ ...prev, games: [...prev.games, game] }));
    supabase?.from('games').insert(gameToDb(game));
    return game;
  }, []);

  const addRebuy = useCallback((gameId: string, playerId: string) => {
    let updatedGame: Game | undefined;
    setData(prev => {
      const games = prev.games.map(g => {
        if (g.id !== gameId) return g;
        const updated = {
          ...g,
          players: g.players.map(p =>
            p.playerId === playerId ? { ...p, rebuys: p.rebuys + 1 } : p
          ),
        };
        updatedGame = updated;
        return updated;
      });
      return { ...prev, games };
    });
    if (updatedGame) {
      supabase?.from('games').update({ players: updatedGame.players }).eq('id', gameId);
    }
  }, []);

  const finishGame = useCallback((gameId: string, winnerId: string, secondId: string): Game => {
    let finishedGame!: Game;
    setData(prev => {
      const game = prev.games.find(g => g.id === gameId);
      if (!game) return prev;
      const pot = game.players.reduce((sum, p) => sum + game.buyIn * (1 + p.rebuys), 0);
      const otherLosses = game.players
        .filter(p => p.playerId !== winnerId && p.playerId !== secondId)
        .reduce((sum, p) => sum + game.buyIn * (1 + p.rebuys), 0);
      const results: GameResult[] = game.players.map(p => {
        const totalEngaged = game.buyIn * (1 + p.rebuys);
        let netResult: number;
        let rank: GameResult['rank'];
        if (p.playerId === winnerId) {
          netResult = otherLosses;
          rank = 'winner';
        } else if (p.playerId === secondId) {
          netResult = 0;
          rank = 'second';
        } else {
          netResult = -totalEngaged;
          rank = 'other';
        }
        return { playerId: p.playerId, totalEngaged, netResult, rank };
      });
      finishedGame = { ...game, status: 'finished', winnerId, secondId, results, pot };
      return { ...prev, games: prev.games.map(g => (g.id === gameId ? finishedGame : g)) };
    });
    supabase?.from('games').update(gameToDb(finishedGame)).eq('id', gameId);
    return finishedGame;
  }, []);

  const deleteGame = useCallback((gameId: string) => {
    setData(prev => ({ ...prev, games: prev.games.filter(g => g.id !== gameId) }));
    supabase?.from('games').delete().eq('id', gameId);
  }, []);

  const getActiveGame = useCallback((): Game | undefined => {
    return data.games.find(g => g.status === 'in_progress');
  }, [data.games]);

  const getGameById = useCallback(
    (id: string): Game | undefined => data.games.find(g => g.id === id),
    [data.games]
  );

  const getPlayerById = useCallback(
    (id: string): Player | undefined => data.players.find(p => p.id === id),
    [data.players]
  );

  const getPlayerStats = useCallback((): PlayerStats[] => {
    return data.players.map(player => {
      const finishedGames = data.games.filter(
        g => g.status === 'finished' && g.players.some(p => p.playerId === player.id)
      );
      let netResult = 0, wins = 0, seconds = 0, totalRebuys = 0, totalEngaged = 0;
      for (const game of finishedGames) {
        const result = game.results?.find(r => r.playerId === player.id);
        const gp = game.players.find(p => p.playerId === player.id);
        if (result) {
          netResult += result.netResult;
          totalEngaged += result.totalEngaged;
          if (result.rank === 'winner') wins++;
          if (result.rank === 'second') seconds++;
        }
        if (gp) totalRebuys += gp.rebuys;
      }
      return { player, totalGames: finishedGames.length, wins, seconds, netResult, totalRebuys, totalEngaged };
    });
  }, [data]);

  return (
    <AppContext.Provider
      value={{
        players: data.players,
        games: data.games,
        isLoading,
        addPlayer,
        updatePlayer,
        deletePlayer,
        uploadPlayerPhoto,
        createGame,
        addRebuy,
        finishGame,
        deleteGame,
        getActiveGame,
        getGameById,
        getPlayerById,
        getPlayerStats,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useStore(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useStore must be used within AppProvider');
  return ctx;
}
