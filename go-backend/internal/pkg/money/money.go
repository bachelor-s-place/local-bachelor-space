// Package money centralizes rupee<->paise conversion so all payment math is done
// in exact integer paise (int64) and never with chained floating-point arithmetic.
//
// The database stores money as NUMERIC(12,2) rupees and the API exposes rupees, so
// values cross the boundary as float64 rupees with exactly two decimals. Inside the
// payment logic we convert to integer paise, do exact arithmetic and comparisons,
// then convert back. This avoids float rounding drift (and the "- 0.01" fudge factors
// it used to require) — important for customer trust in amounts charged and compared.
package money

import "math"

// ToPaise converts a rupee amount (a NUMERIC(12,2) value carried as float64) into
// exact integer paise, rounding to the nearest paise.
func ToPaise(rupees float64) int64 {
	return int64(math.Round(rupees * 100))
}

// ToRupees converts integer paise back into a rupee float with exactly two decimals,
// suitable for storing in a NUMERIC(12,2) column or returning in an API response.
func ToRupees(paise int64) float64 {
	return float64(paise) / 100
}

// PercentOf returns `percent` percent of a paise amount, in exact paise (rounded).
// percent is a NUMERIC(4,2) value (e.g. 5.00 for 5%). Computing the token this way
// keeps the result aligned to whole paise so the gateway and webhook amounts match.
func PercentOf(paise int64, percent float64) int64 {
	return int64(math.Round(float64(paise) * percent / 100))
}
