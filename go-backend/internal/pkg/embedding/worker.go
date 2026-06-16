package embedding

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

type Worker struct {
	pool     *pgxpool.Pool
	provider Provider
}

func NewWorker(pool *pgxpool.Pool, provider Provider) *Worker {
	return &Worker{
		pool:     pool,
		provider: provider,
	}
}

func (w *Worker) Start(ctx context.Context) {
	go func() {
		log.Info().Msg("embedding worker started")
			
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				w.processPending(ctx)
			}
		}
	}()
}

// maxEmbeddingAttempts is how many times a single user's embedding is retried
// before the worker gives up on it (clears pending) so it can never starve the queue.
const maxEmbeddingAttempts = 5

// embeddingCallTimeout bounds a single provider call so a hung provider can't
// freeze the worker loop indefinitely.
const embeddingCallTimeout = 30 * time.Second

func (w *Worker) processPending(ctx context.Context) {
	// Only pick rows that are due: under the attempt cap and past their backoff time.
	// Oldest-due first so no row can be perpetually skipped.
	const findQuery = `
		SELECT id, lifestyle_tags, bio
		FROM users
		WHERE pending_embeddings = TRUE
		  AND deleted_at IS NULL
		  AND embedding_attempts < $1
		  AND (embedding_next_attempt_at IS NULL OR embedding_next_attempt_at <= NOW())
		ORDER BY embedding_next_attempt_at ASC NULLS FIRST
		LIMIT 5`

	rows, err := w.pool.Query(ctx, findQuery, maxEmbeddingAttempts)
	if err != nil {
		log.Error().Err(err).Msg("failed to query pending users")
		return
	}

	// Materialize the batch first so the connection is free for the per-row updates.
	type pending struct {
		id   string
		tags []string
		bio  *string
	}
	var batch []pending
	for rows.Next() {
		var p pending
		if err := rows.Scan(&p.id, &p.tags, &p.bio); err != nil {
			log.Error().Err(err).Msg("failed to scan pending user row")
			continue
		}
		batch = append(batch, p)
	}
	rows.Close()

	for _, p := range batch {
		// Prepare text for embedding: combine tags and bio
		text := strings.Join(p.tags, ", ")
		if p.bio != nil {
			text = text + ". " + *p.bio
		}
		if text == "" {
			text = "lifestyle profile"
		}

		callCtx, cancel := context.WithTimeout(ctx, embeddingCallTimeout)
		embedding, err := w.provider.Generate(callCtx, text)
		cancel()
		if err != nil {
			w.recordFailure(ctx, p.id, err)
			continue
		}

		// Format embedding as pgvector string: [0.1,0.2,...]
		strParts := make([]string, len(embedding))
		for i, v := range embedding {
			strParts[i] = fmt.Sprintf("%g", v)
		}
		vectorStr := "[" + strings.Join(strParts, ",") + "]"

		// On success, clear pending and reset the retry counter.
		const updateQuery = `
			UPDATE users
			SET personality_embedding = $1,
			    pending_embeddings = FALSE,
			    embedding_attempts = 0,
			    embedding_next_attempt_at = NULL
			WHERE id = $2`

		if _, err := w.pool.Exec(ctx, updateQuery, vectorStr, p.id); err != nil {
			w.recordFailure(ctx, p.id, err)
		} else {
			log.Info().Str("user_id", p.id).Msg("successfully updated personality embedding")
		}
	}
}

// recordFailure increments the attempt counter and schedules an exponential-backoff
// retry. Once the attempt cap is reached it clears pending_embeddings so the poison
// row stops being selected and can never starve other users.
func (w *Worker) recordFailure(ctx context.Context, userID string, cause error) {
	log.Error().Err(cause).Str("user_id", userID).Msg("embedding generation failed")

	// Backoff grows with attempts: ~1m, 2m, 4m, 8m, ... capped by the attempt limit.
	const updateQuery = `
		UPDATE users
		SET embedding_attempts = embedding_attempts + 1,
		    embedding_next_attempt_at = NOW() + (interval '1 minute' * POWER(2, embedding_attempts)),
		    pending_embeddings = (embedding_attempts + 1 < $2)
		WHERE id = $1`

	if _, err := w.pool.Exec(ctx, updateQuery, userID, maxEmbeddingAttempts); err != nil {
		log.Error().Err(err).Str("user_id", userID).Msg("failed to record embedding failure")
	}
}
