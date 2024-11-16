package security

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"go.uber.org/zap"
)

type RuleType string

const (
	RuleTypePermission RuleType = "permission"
	RuleTypeOwnership RuleType = "ownership"
	RuleTypeContent   RuleType = "content"
)

type Rule struct {
	Type        RuleType `json:"type"`
	Target      string   `json:"target"`
	Permission  os.FileMode `json:"permission,omitempty"`
	Owner       string   `json:"owner,omitempty"`
	Group       string   `json:"group,omitempty"`
	Pattern     string   `json:"pattern,omitempty"`
}

type ScanConfig struct {
	Paths []string `json:"paths"`
	Rules []Rule   `json:"rules"`
}

type ScanResult struct {
	Path     string `json:"path"`
	RuleType RuleType `json:"rule_type"`
	Message  string `json:"message"`
	Severity string `json:"severity"`
}

type Scanner struct {
	logger *zap.Logger
	config ScanConfig
}

func NewScanner(logger *zap.Logger) *Scanner {
	return &Scanner{
		logger: logger,
	}
}

func (s *Scanner) Configure(config ScanConfig) {
	s.config = config
}

func (s *Scanner) Scan(ctx context.Context, config ScanConfig) ([]ScanResult, error) {
	var results []ScanResult

	for _, path := range config.Paths {
		err := filepath.Walk(path, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}

			for _, rule := range config.Rules {
				matched, err := filepath.Match(rule.Target, filepath.Base(path))
				if err != nil {
					s.logger.Error("Invalid pattern", zap.String("pattern", rule.Target), zap.Error(err))
					continue
				}

				if !matched {
					continue
				}

				switch rule.Type {
				case RuleTypePermission:
					if info.Mode().Perm() != rule.Permission {
						results = append(results, ScanResult{
							Path:     path,
							RuleType: RuleTypePermission,
							Message:  fmt.Sprintf("Invalid permissions: %v (expected %v)", info.Mode().Perm(), rule.Permission),
							Severity: "high",
						})
					}
				case RuleTypeOwnership:
					// Ownership checks would go here
					// This would require platform-specific implementations
					continue
				case RuleTypeContent:
					// Content pattern matching would go here
					continue
				}
			}

			return nil
		})

		if err != nil {
			return nil, fmt.Errorf("scan failed for path %s: %w", path, err)
		}
	}

	return results, nil
}

func (s *Scanner) HealthCheck(ctx context.Context) error {
	return nil
}
