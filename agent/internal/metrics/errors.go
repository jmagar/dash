package metrics

import "errors"

var (
	// ErrStaleMetrics indicates that metrics haven't been updated recently
	ErrStaleMetrics = errors.New("metrics are stale")
)
