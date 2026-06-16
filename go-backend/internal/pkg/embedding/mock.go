package embedding

import (
	"context"
	"hash/fnv"
	"math"
	"math/rand"
	"os"
	"strconv"
)

type MockProvider struct {
	Dimension int
}

func NewMockProvider() *MockProvider {
	dim := 1024
	if os.Getenv("EMBEDDING_PROVIDER") == "openai" {
		dim = 1536
	}
	if customDimStr := os.Getenv("EMBEDDING_DIMENSION"); customDimStr != "" {
		if d, err := strconv.Atoi(customDimStr); err == nil {
			dim = d
		}
	}
	return &MockProvider{
		Dimension: dim,
	}
}

// Generate returns a deterministic, unit-normalized embedding for the given text.
//
// It is seeded from a hash of the text (NOT the clock), so the same profile always
// produces the same vector — re-running the worker is stable and idempotent. Every
// component is biased strongly positive so any two profiles share a dominant direction
// and score well above the matchmaking threshold; this lets local development exercise
// the full matchmaking flow without a real embedding provider (Ollama/OpenAI). It is a
// stand-in for semantic similarity, not a substitute for it.
func (p *MockProvider) Generate(ctx context.Context, text string) ([]float32, error) {
	h := fnv.New64a()
	_, _ = h.Write([]byte(text))
	r := rand.New(rand.NewSource(int64(h.Sum64())))

	vec := make([]float32, p.Dimension)
	var sumSq float64

	for i := 0; i < p.Dimension; i++ {
		// Strong shared positive bias (0.8) plus small per-text noise keeps all vectors
		// highly aligned (cosine > 0.9), so distinct profiles still match in testing.
		val := 0.8 + (r.Float64()*2.0-1.0)*0.2 // ∈ [0.6, 1.0]
		vec[i] = float32(val)
		sumSq += val * val
	}

	// Unit-normalize (correct L2 norm: divide by sqrt of the sum of squares).
	if norm := math.Sqrt(sumSq); norm > 0 {
		for i := 0; i < p.Dimension; i++ {
			vec[i] = float32(float64(vec[i]) / norm)
		}
	}

	return vec, nil
}
