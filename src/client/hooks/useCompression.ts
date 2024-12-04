import { useCallback } from 'react';
import { compressionApi } from '../api/compression';
import { useLoadingOverlay } from './useLoadingOverlay';
import { useSnackbar } from './useSnackbar';
import { frontendLogger } from '../utils/frontendLogger';
import type { ListArchiveResponse, CompressionError } from '../../types/api/compression';
import type { NotificationSeverity } from '../store/types';
import { LoggingManager } from '../../server/utils/logging/LoggingManager';

export function useCompression() {
  const { showLoading, hideLoading } = useLoadingOverlay();
  const { showSnackbar } = useSnackbar();

  const handleError = useCallback((error: unknown, defaultMessage: string): never => {
    const message = error instanceof Error ? error.message : defaultMessage;
    const severity: NotificationSeverity = 'error';

    if (error instanceof Error && 'code' in error) {
      const compressionError = error as CompressionError;
      const errorDetails = compressionError.details
        ? ` (${Object.entries(compressionError.details)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join(', ')})`
        : '';
      showSnackbar(`${message}${errorDetails}`, severity);
    } else {
      showSnackbar(message, severity);
    }

    if (error instanceof Error) {
      throw error;
    }
    throw new Error(defaultMessage);
  }, [showSnackbar]);

  const compressFiles = useCallback(
    async (hostId: string, sourcePaths: string[], targetPath: string): Promise<void> => {
      showLoading();
      try {
        frontendLoggerLoggingManager.getInstance().();

        await compressionApi.compressFiles(hostId, sourcePaths, targetPath);
        showSnackbar('Files compressed successfully', 'success');
        return;
      } catch (error) {
        frontendLoggerLoggingManager.getInstance().();
        return handleError(error, 'Failed to compress files');
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading, handleError]
  );

  const extractFiles = useCallback(
    async (hostId: string, sourcePath: string, targetPath: string): Promise<void> => {
      showLoading();
      try {
        frontendLoggerLoggingManager.getInstance().();

        await compressionApi.extractFiles(hostId, sourcePath, targetPath);
        showSnackbar('Files extracted successfully', 'success');
        return;
      } catch (error) {
        frontendLoggerLoggingManager.getInstance().();
        return handleError(error, 'Failed to extract files');
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading, handleError]
  );

  const listArchiveContents = useCallback(
    async (hostId: string, archivePath: string): Promise<ListArchiveResponse> => {
      showLoading();
      try {
        frontendLoggerLoggingManager.getInstance().();

        const contents = await compressionApi.listArchiveContents(hostId, archivePath);
        return contents;
      } catch (error) {
        frontendLoggerLoggingManager.getInstance().();
        return handleError(error, 'Failed to list archive contents');
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading, handleError]
  );

  return {
    compressFiles,
    extractFiles,
    listArchiveContents,
  };
}

