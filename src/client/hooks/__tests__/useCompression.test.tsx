import { renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { act } from '@testing-library/react';
import { useCompression } from '../useCompression';
import { compressionApi } from '../../api/compression';
import uiReducer from '../../store/uiSlice';
import notificationReducer from '../../store/notificationSlice';
import type { CompressionError, ListArchiveResponse } from '../../../types/api/compression';

// Mock the compression API
jest.mock('../../api/compression', () => ({
  compressionApi: {
    compressFiles: jest.fn(),
    extractFiles: jest.fn(),
    listArchiveContents: jest.fn(),
  },
}));

class TestCompressionError extends Error implements CompressionError {
  constructor(
    message: string,
    public code: CompressionError['code'],
    public details?: CompressionError['details']
  ) {
    super(message);
    this.name = 'CompressionError';
    Object.setPrototypeOf(this, TestCompressionError.prototype);
  }
}

describe('useCompression', () => {
  const mockStore = configureStore({
    reducer: {
      ui: uiReducer,
      notification: notificationReducer,
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={mockStore}>{children}</Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle successful compression', async () => {
    const { result } = renderHook(() => useCompression(), { wrapper });

    (compressionApi.compressFiles as jest.Mock).mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.compressFiles('host1', ['file1.txt'], 'archive.zip');
    });

    expect(compressionApi.compressFiles).toHaveBeenCalledWith(
      'host1',
      ['file1.txt'],
      'archive.zip'
    );
  });

  it('should handle compression error', async () => {
    const { result } = renderHook(() => useCompression(), { wrapper });
    const error = new TestCompressionError('Compression failed', 'COMPRESSION_ERROR', {
      hostId: 'host1',
      sourcePaths: ['file1.txt'],
      targetPath: 'archive.zip',
    });

    (compressionApi.compressFiles as jest.Mock).mockRejectedValueOnce(error);

    await expect(
      act(async () => {
        await result.current.compressFiles('host1', ['file1.txt'], 'archive.zip');
      })
    ).rejects.toThrow('Compression failed');

    expect(error.code).toBe('COMPRESSION_ERROR');
    expect(error.details).toEqual({
      hostId: 'host1',
      sourcePaths: ['file1.txt'],
      targetPath: 'archive.zip',
    });
  });

  it('should handle extraction error', async () => {
    const { result } = renderHook(() => useCompression(), { wrapper });
    const error = new TestCompressionError('Extraction failed', 'EXTRACTION_ERROR', {
      hostId: 'host1',
      sourcePath: 'archive.zip',
      targetPath: 'target/',
    });

    (compressionApi.extractFiles as jest.Mock).mockRejectedValueOnce(error);

    await expect(
      act(async () => {
        await result.current.extractFiles('host1', 'archive.zip', 'target/');
      })
    ).rejects.toThrow('Extraction failed');

    expect(error.code).toBe('EXTRACTION_ERROR');
    expect(error.details).toEqual({
      hostId: 'host1',
      sourcePath: 'archive.zip',
      targetPath: 'target/',
    });
  });

  it('should handle successful extraction', async () => {
    const { result } = renderHook(() => useCompression(), { wrapper });

    (compressionApi.extractFiles as jest.Mock).mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.extractFiles('host1', 'archive.zip', 'target/');
    });

    expect(compressionApi.extractFiles).toHaveBeenCalledWith(
      'host1',
      'archive.zip',
      'target/'
    );
  });

  it('should handle successful archive listing', async () => {
    const { result } = renderHook(() => useCompression(), { wrapper });
    const mockContents: ListArchiveResponse = {
      contents: ['file1.txt', 'file2.txt'],
      totalSize: 1000,
      compressedSize: 500,
      format: 'zip',
    };

    (compressionApi.listArchiveContents as jest.Mock).mockResolvedValueOnce(mockContents);

    await act(async () => {
      const contents = await result.current.listArchiveContents('host1', 'archive.zip');
      expect(contents).toEqual(mockContents);
    });

    expect(compressionApi.listArchiveContents).toHaveBeenCalledWith(
      'host1',
      'archive.zip'
    );
  });

  it('should handle archive listing error', async () => {
    const { result } = renderHook(() => useCompression(), { wrapper });
    const error = new TestCompressionError('Listing failed', 'LIST_ERROR', {
      hostId: 'host1',
      archivePath: 'archive.zip',
    });

    (compressionApi.listArchiveContents as jest.Mock).mockRejectedValueOnce(error);

    await expect(
      act(async () => {
        await result.current.listArchiveContents('host1', 'archive.zip');
      })
    ).rejects.toThrow('Listing failed');

    expect(error.code).toBe('LIST_ERROR');
    expect(error.details).toEqual({
      hostId: 'host1',
      archivePath: 'archive.zip',
    });
  });

  it('should handle unknown errors', async () => {
    const { result } = renderHook(() => useCompression(), { wrapper });
    const error = new Error('Unknown error');

    (compressionApi.compressFiles as jest.Mock).mockRejectedValueOnce(error);

    await expect(
      act(async () => {
        await result.current.compressFiles('host1', ['file1.txt'], 'archive.zip');
      })
    ).rejects.toThrow('Unknown error');
  });

  it('should show and hide loading state', async () => {
    const { result } = renderHook(() => useCompression(), { wrapper });

    (compressionApi.compressFiles as jest.Mock).mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.compressFiles('host1', ['file1.txt'], 'archive.zip');
    });

    const state = mockStore.getState();
    expect(state.ui.loading).toBe(false);
    expect(state.ui.loadingCount).toBe(0);
  });
});
