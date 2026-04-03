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
  deletePlayer: (id: string) => Promise<void>;
  resetPlayers: () => Promise<void>;
  uploadPlayerPhoto: (playerId: string, file: File) => Promise<string | null>;
  createGame: (playerIds: string[], buyIn: number) => Game;
  addRebuy: (gameId: string, playerId: string) => void;
  finishGame: (gameId: string, winnerId: string, secondId: string, shareGains?: boolean) => Game;
  deleteGame: (gameId: string) => Promise<void>;
  updateGameDate: (gameId: string, newDate: string) => Promise<void>;
  getActiveGame: () => Game | undefined;
  getGameById: (id: string) => Game | undefined;
  getPlayerById: (id: string) => Player | undefined;
  getPlayerStats: () => PlayerStats[];
}

const AppContext = createContext<AppContextType | null>(null);

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      // Ne jamais restaurer une partie "in_progress" depuis le cache local au démarrage.
      // Si Supabase est actif, fetchFromSupabase va de toute façon réécrire les games.
      // Si Supabase n'est pas actif, on ne veut pas non plus réafficher une vieille partie.
      return {
        players: parsed.players ?? [],
        games: (parsed.games ?? []).filter((g: { status: string }) => g.status !== 'in_progress'),
      };
    }
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
    sharedWin: (row.shared_win as boolean | null) ?? undefined,
  } as Game;
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
    shared_win: g.sharedWin ?? null,
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
  // isInitialLoad=true : filtre les parties in_progress (on ne restaure pas une vieille session)
  // isInitialLoad=false : mise à jour realtime, on garde tout
  const fetchFromSupabase = useCallback(async (isInitialLoad = false) => {
    if (!supabase) return;
    const [
      { data: pRows, error: pErr },
      { data: gRows, error: gErr },
    ] = await Promise.all([
      supabase.from('players').select('*'),
      supabase.from('games').select('*'),
    ]);
    if (pErr) console.error('fetchFromSupabase players error:', pErr);
    if (gErr) console.error('fetchFromSupabase games error:', gErr);
    if (!pRows && !gRows) return;
    skipNextSaveRef.current = true;
    setData(prev => {
      // Pour les joueurs : Supabase est la source de vérité si elle retourne des données.
      // Si Supabase retourne une liste vide et qu'on a des joueurs en local, on garde les locaux
      // (protection contre un problème temporaire de RLS ou de connexion).
      const players = (pRows && pRows.length > 0)
        ? pRows.map(r => dbToPlayer(r as Record<string, unknown>))
        : (pRows && pRows.length === 0 && prev.players.length > 0)
          ? prev.players
          : prev.players;
      // Pour les games : au chargement initial on ne restaure jamais une partie in_progress
      // (évite l'affichage fantôme d'une ancienne session).
      // En realtime, on accepte tout (une partie peut être en cours dans la session active).
      let games: Game[];
      if (gRows) {
        const mapped = gRows.map(r => dbToGame(r as Record<string, unknown>));
        if (isInitialLoad) {
          games = mapped.filter(g => g.status !== 'in_progress');
        } else {
          games = mapped;
        }
      } else {
        games = prev.games;
      }
      const newData: AppData = { players, games };
      saveData(newData);
      return newData;
    });
  }, []);

  // Initial load from Supabase
  useEffect(() => {
    if (!supabase) return;
    fetchFromSupabase(true).finally(() => setIsLoading(false));
  }, [fetchFromSupabase]);

  // Realtime subscription
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => fetchFromSupabase(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => fetchFromSupabase(false))
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
    if (supabase) {
      supabase.from('players').insert(playerToDb(player))
        .then(({ error }) => {
          if (error) {
            console.error('addPlayer Supabase error:', error);
            // En cas d'échec, on retire le joueur fantôme du state local
            // pour éviter qu'il disparaisse au prochain fetch Supabase
            setData(prev => ({ ...prev, players: prev.players.filter(p => p.id !== player.id) }));
          }
        });
    }
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

  const deletePlayer = useCallback(async (id: string): Promise<void> => {
    if (supabase) {
      const { error } = await supabase.from('players').delete().eq('id', id);
      if (error) {
        console.error('deletePlayer Supabase error:', error);
        return; // Ne pas modifier le state local si Supabase a échoué
      }
    }
    setData(prev => ({ ...prev, players: prev.players.filter(p => p.id !== id) }));
  }, []);

  const resetPlayers = useCallback(async (): Promise<void> => {
    if (supabase) {
      // Supprimer tous les joueurs de Supabase un par un pour respecter les contraintes RLS
      const { data: rows, error: fetchErr } = await supabase.from('players').select('id');
      if (fetchErr) {
        console.error('resetPlayers fetch error:', fetchErr);
        return;
      }
      if (rows && rows.length > 0) {
        const ids = rows.map((r: Record<string, unknown>) => r.id as string);
        const { error: delErr } = await supabase.from('players').delete().in('id', ids);
        if (delErr) {
          console.error('resetPlayers delete error:', delErr);
          return;
        }
      }
    }
    setData(prev => ({ ...prev, players: [] }));
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
    if (supabase) {
      supabase.from('games').insert(gameToDb(game))
        .then(({ error }) => { if (error) console.error('createGame Supabase error:', error); });
    }
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

  const finishGame = useCallback((
    gameId: string,
    winnerId: string,
    secondId: string,
    shareGains = false,
  ): Game => {
    const game = data.games.find(g => g.id === gameId);
    if (!game) throw new Error(`Game ${gameId} not found`);

    const pot = game.players.reduce((sum, p) => sum + game.buyIn * (1 + p.rebuys), 0);

    let results: GameResult[];
    let sharedWin: boolean | undefined;

    if (shareGains) {
      // ── MODE PARTAGE (2 finalistes seulement) ──────────────────────────────
      // Formule : gain_i = S_i + (P - S_winner - S_second) / 2
      // Les "others" ont déjà perdu leur mise, elle est dans le pot.
      // Le reste après remboursement des 2 finalistes est partagé à parts égales.
      const winnerGp = game.players.find(p => p.playerId === winnerId)!;
      const secondGp  = game.players.find(p => p.playerId === secondId)!;
      const sWinner   = game.buyIn * (1 + winnerGp.rebuys);
      const sSecond   = game.buyIn * (1 + secondGp.rebuys);
      // Pertes des autres joueurs : ils ont déjà perdu leur mise, elle est dans le pot.
      const othersTotal = game.players
        .filter(p => p.playerId !== winnerId && p.playerId !== secondId)
        .reduce((sum, p) => sum + game.buyIn * (1 + p.rebuys), 0);
      // Reste à partager entre les 2 finalistes = pot - leurs mises remboursées
      const remainder = pot - sWinner - sSecond; // = othersTotal
      const shareEach = remainder / 2;           // part égale du bénéfice

      results = game.players.map(p => {
        const totalEngaged = game.buyIn * (1 + p.rebuys);
        if (p.playerId === winnerId) {
          return { playerId: p.playerId, totalEngaged, netResult: shareEach, rank: 'shared' as const };
        } else if (p.playerId === secondId) {
          return { playerId: p.playerId, totalEngaged, netResult: shareEach, rank: 'shared' as const };
        } else {
          return { playerId: p.playerId, totalEngaged, netResult: -totalEngaged, rank: 'other' as const };
        }
      });
      sharedWin = true;
    } else {
      // ── MODE STANDARD ──────────────────────────────────────────────────────
      const secondPlayer    = game.players.find(p => p.playerId === secondId);
      const secondRebuyCost = secondPlayer ? game.buyIn * secondPlayer.rebuys : 0;
      const otherLosses     = game.players
        .filter(p => p.playerId !== winnerId && p.playerId !== secondId)
        .reduce((sum, p) => sum + game.buyIn * (1 + p.rebuys), 0);

      results = game.players.map(p => {
        const totalEngaged = game.buyIn * (1 + p.rebuys);
        let netResult: number;
        let rank: GameResult['rank'];
        if (p.playerId === winnerId) {
          netResult = otherLosses + secondRebuyCost;
          rank = 'winner';
        } else if (p.playerId === secondId) {
          netResult = -secondRebuyCost;
          rank = 'second';
        } else {
          netResult = -totalEngaged;
          rank = 'other';
        }
        return { playerId: p.playerId, totalEngaged, netResult, rank };
      });
      sharedWin = undefined;
    }

    const finishedGame: Game = {
      ...game,
      status: 'finished',
      winnerId,
      secondId,
      results,
      pot,
      ...(sharedWin ? { sharedWin: true } : {}),
    };

    setData(prev => ({
      ...prev,
      games: prev.games.map(g => (g.id === gameId ? finishedGame : g)),
    }));

    if (supabase) {
      supabase.from('games').update(gameToDb(finishedGame)).eq('id', gameId)
        .then(({ error }) => { if (error) console.error('finishGame Supabase error:', error); });
    }
    return finishedGame;
  }, [data.games]);

  const updateGameDate = useCallback(async (gameId: string, newDate: string): Promise<void> => {
    if (supabase) {
      const { error } = await supabase.from('games').update({ date: newDate }).eq('id', gameId);
      if (error) {
        console.error('updateGameDate Supabase error:', error);
        return;
      }
    }
    setData(prev => ({
      ...prev,
      games: prev.games.map(g => g.id === gameId ? { ...g, date: newDate } : g),
    }));
  }, []);

  const deleteGame = useCallback(async (gameId: string): Promise<void> => {
    if (supabase) {
      const { error } = await supabase.from('games').delete().eq('id', gameId);
      if (error) {
        console.error('deleteGame Supabase error:', error);
        return; // Ne pas modifier le state local si Supabase a échoué
      }
    }
    setData(prev => ({ ...prev, games: prev.games.filter(g => g.id !== gameId) }));
  }, []);

  const getActiveGame = useCallback((): Game | undefined => {
    return data.games.find(g => g.status === 'in_progress' && !g.results && !g.winnerId);
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
          if (result.rank === 'winner' || result.rank === 'shared') wins++;
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
        resetPlayers,
        uploadPlayerPhoto,
        createGame,
        addRebuy,
        finishGame,
        deleteGame,
        updateGameDate,
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
