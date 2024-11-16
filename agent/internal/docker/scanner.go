package docker

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/volume"
	"github.com/docker/docker/client"
	"go.uber.org/zap"
)

type Scanner struct {
	client *client.Client
	logger *zap.Logger
}

func NewScanner(logger *zap.Logger) (*Scanner, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv)
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker client: %w", err)
	}

	return &Scanner{
		client: cli,
		logger: logger,
	}, nil
}

func (s *Scanner) ScanContainers(ctx context.Context) ([]types.Container, error) {
	containers, err := s.client.ContainerList(ctx, types.ContainerListOptions{All: true})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	return containers, nil
}

func (s *Scanner) ScanImages(ctx context.Context) ([]types.ImageSummary, error) {
	images, err := s.client.ImageList(ctx, types.ImageListOptions{All: true})
	if err != nil {
		return nil, fmt.Errorf("failed to list images: %w", err)
	}

	return images, nil
}

func (s *Scanner) ScanNetworks(ctx context.Context) ([]types.NetworkResource, error) {
	networks, err := s.client.NetworkList(ctx, types.NetworkListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list networks: %w", err)
	}

	return networks, nil
}

func (s *Scanner) ScanVolumes(ctx context.Context) ([]*volume.Volume, error) {
	volumes, err := s.client.VolumeList(ctx, volume.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list volumes: %w", err)
	}

	return volumes.Volumes, nil
}

func (s *Scanner) GetContainerStats(ctx context.Context, containerID string) (*types.StatsJSON, error) {
	stats, err := s.client.ContainerStats(ctx, containerID, false)
	if err != nil {
		return nil, fmt.Errorf("failed to get container stats: %w", err)
	}
	defer stats.Body.Close()

	var statsJSON types.StatsJSON
	decoder := json.NewDecoder(stats.Body)
	if err := decoder.Decode(&statsJSON); err != nil {
		return nil, fmt.Errorf("failed to decode stats: %w", err)
	}

	return &statsJSON, nil
}

func (s *Scanner) GetContainerLogs(ctx context.Context, containerID string, since time.Time) (string, error) {
	options := types.ContainerLogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Since:      since.Format(time.RFC3339),
		Timestamps: true,
	}

	logs, err := s.client.ContainerLogs(ctx, containerID, options)
	if err != nil {
		return "", fmt.Errorf("failed to get container logs: %w", err)
	}
	defer logs.Close()

	var logBuilder strings.Builder
	_, err = io.Copy(&logBuilder, logs)
	if err != nil {
		return "", fmt.Errorf("failed to read logs: %w", err)
	}

	return logBuilder.String(), nil
}

func (s *Scanner) Close() error {
	if s.client != nil {
		return s.client.Close()
	}
	return nil
}
