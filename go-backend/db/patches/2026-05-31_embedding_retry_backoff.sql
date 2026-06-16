-- Patch: add retry/backoff tracking to the embedding pipeline.
--
-- Problem: the embedding worker selected `pending_embeddings = TRUE LIMIT 5` with
-- no retry counter and no ordering. A handful of permanently-failing ("poison") rows
-- stayed pending forever, permanently occupied the LIMIT 5 window, and starved every
-- other user from ever being embedded — silently breaking matchmaking platform-wide.
--
-- Fix: track attempts and a next-retry time so the worker can apply exponential
-- backoff and give up (clear pending) after a max number of attempts.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS embedding_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS embedding_next_attempt_at TIMESTAMPTZ;
