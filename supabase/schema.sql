-- Poker Manager – Supabase schema
-- Run this in the Supabase SQL Editor

-- Players
CREATE TABLE IF NOT EXISTS players (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  photo_url  TEXT
);

ALTER TABLE players REPLICA IDENTITY FULL;

-- Games
CREATE TABLE IF NOT EXISTS games (
  id         TEXT PRIMARY KEY,
  date       TEXT NOT NULL,
  buy_in     FLOAT NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('in_progress', 'finished')),
  winner_id  TEXT,
  second_id  TEXT,
  pot        FLOAT,
  players    JSONB NOT NULL DEFAULT '[]',
  results    JSONB,
  shared_win BOOLEAN
);

-- Migration: add shared_win if the table already exists without it
ALTER TABLE games ADD COLUMN IF NOT EXISTS shared_win BOOLEAN;

ALTER TABLE games REPLICA IDENTITY FULL;

-- Enable Realtime on both tables
-- (run in Supabase dashboard: Database > Replication > add players & games)

-- Storage bucket for player photos
-- Create a public bucket named "player-photos" in Supabase Storage

-- RLS: allow all operations (adjust for production if needed)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all players" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all games"   ON games   FOR ALL USING (true) WITH CHECK (true);

-- Storage policy: allow public reads + authenticated uploads
-- (configure in Supabase dashboard > Storage > player-photos > Policies)
