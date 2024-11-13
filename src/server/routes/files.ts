import path from 'path';

import { Router } from 'express';
import { Client } from 'ssh2';

import { createApiError } from '../../types/error';
import { AuthenticatedRequestHandler, createAuthHandler } from '../../types/express';
import {
  FileItem,
  FileListResponse,
  FileOperationResponse,
  FileUploadRequest,
  HostConnection,
  SFTPError,
  SFTPWrapper,
} from '../../types/files';
import type { LogMetadata } from '../../types/logger';
import { query } from '../db';
import { logger } from '../utils/logger';

const router: Router = Router();

interface RequestParams {
  hostId: string;
}

interface RequestQuery {
  path?: string;
}

// List directory contents
const listDirectory: AuthenticatedRequestHandler<
  RequestParams,
  FileListResponse,
  any,
  RequestQuery
> = async (req, res) => {
  const { path: dirPath = '/' } = req.query;
  const normalizedPath = path.normalize(dirPath || '').replace(/^(\.\.[\\/])+/, '');
  const username = process.env.DISABLE_AUTH === 'true' ? 'dev' : req.user?.username;
  const { hostId } = req.params;

  try {
    logger.info('Listing directory', { hostId, path: normalizedPath });

    // Get host connection details
    const result = await query<HostConnection>(
      'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
      [hostId],
    );

    if (result.rows.length === 0) {
      logger.warn('Host not found', { hostId });
      res.status(404).json({ success: false, error: 'Host not found' });
      return;
    }

    const host = result.rows[0];
    const conn = new Client();

    const listDirectory = new Promise<FileItem[]>((resolve, reject) => {
      conn.on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) {
            reject(err);
            return;
          }

          const sftpWrapper = sftp as unknown as SFTPWrapper;
          sftpWrapper.readdir(normalizedPath, (err, list) => {
            if (err) {
              reject(err);
              return;
            }

            const files: FileItem[] = list.map(item => ({
              name: item.filename,
              path: path.join(normalizedPath, item.filename),
              type: item.attrs.isDirectory() ? 'directory' : 'file',
              size: item.attrs.size,
              modified: new Date(item.attrs.mtime * 1000),
              permissions: item.attrs.mode.toString(8).slice(-3),
            }));

            resolve(files);
            conn.end();
          });
        });
      });

      conn.on('error', reject);

      conn.connect({
        host: host.hostname,
        port: host.port,
        username,
        privateKey: host.private_key,
        passphrase: host.passphrase,
      });
    });

    const files = await listDirectory;
    logger.info('Directory listed successfully', {
      hostId,
      path: normalizedPath,
      count: files.length,
    });
    res.json({ success: true, data: files });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId,
      path: normalizedPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to list directory:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to list directory',
      500,
      metadata,
    );
    res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

// Download file
const downloadFile: AuthenticatedRequestHandler<
  RequestParams,
  any,
  any,
  RequestQuery
> = async (req, res) => {
  const { path: filePath } = req.query;
  const { hostId } = req.params;

  if (!filePath) {
    const error = createApiError('File path is required', 400);
    logger.warn('No file path provided', { hostId });
    res.status(400).json({
      success: false,
      error: error.message,
    });
    return;
  }

  const normalizedPath = path.normalize(filePath).replace(/^(\.\.[\\/])+/, '');
  const username = process.env.DISABLE_AUTH === 'true' ? 'dev' : req.user?.username;

  try {
    logger.info('Downloading file', { hostId, path: normalizedPath });

    const result = await query<HostConnection>(
      'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
      [hostId],
    );

    if (result.rows.length === 0) {
      const error = createApiError('Host not found', 404);
      logger.warn('Host not found', { hostId });
      res.status(404).json({
        success: false,
        error: error.message,
      });
      return;
    }

    const host = result.rows[0];
    const conn = new Client();

    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          const metadata: LogMetadata = {
            hostId,
            path: normalizedPath,
            error: err.message,
          };
          logger.error('SFTP error:', metadata);
          const apiError = createApiError('SFTP connection failed', 500, metadata);
          res.status(500).json({
            success: false,
            error: apiError.message,
          });
          return;
        }

        const sftpWrapper = sftp as unknown as SFTPWrapper;
        const readStream = sftpWrapper.createReadStream(normalizedPath);

        readStream.on('error', (err: Error) => {
          const metadata: LogMetadata = {
            hostId,
            path: normalizedPath,
            error: err.message,
          };
          logger.error('File read error:', metadata);
          const apiError = createApiError('Failed to read file', 500, metadata);
          res.status(500).json({
            success: false,
            error: apiError.message,
          });
          conn.end();
        });

        res.attachment(path.basename(normalizedPath));
        readStream.pipe(res);

        readStream.on('end', () => {
          logger.info('File downloaded successfully', {
            hostId,
            path: normalizedPath,
          });
          conn.end();
        });
      });
    });

    conn.on('error', (err: Error) => {
      const metadata: LogMetadata = {
        hostId,
        path: normalizedPath,
        error: err.message,
      };
      logger.error('SSH connection error:', metadata);
      const apiError = createApiError('SSH connection failed', 500, metadata);
      res.status(500).json({
        success: false,
        error: apiError.message,
      });
    });

    conn.connect({
      host: host.hostname,
      port: host.port,
      username,
      privateKey: host.private_key,
      passphrase: host.passphrase,
    });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId,
      path: normalizedPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to download file:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to download file',
      500,
      metadata,
    );
    res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

// Upload file
const uploadFile: AuthenticatedRequestHandler<
  RequestParams,
  FileOperationResponse,
  FileUploadRequest
> = async (req, res) => {
  const { path: uploadPath, content } = req.body;
  const { hostId } = req.params;

  if (!uploadPath || !content) {
    const error = createApiError('Path and content are required', 400);
    logger.warn('Missing path or content', { hostId });
    res.status(400).json({
      success: false,
      error: error.message,
    });
    return;
  }

  const normalizedPath = path.normalize(uploadPath).replace(/^(\.\.[\\/])+/, '');
  const username = process.env.DISABLE_AUTH === 'true' ? 'dev' : req.user?.username;

  try {
    logger.info('Uploading file', { hostId, path: normalizedPath });

    const result = await query<HostConnection>(
      'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
      [hostId],
    );

    if (result.rows.length === 0) {
      const error = createApiError('Host not found', 404);
      logger.warn('Host not found', { hostId });
      res.status(404).json({
        success: false,
        error: error.message,
      });
      return;
    }

    const host = result.rows[0];
    const conn = new Client();

    const uploadFile = new Promise<void>((resolve, reject) => {
      conn.on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) {
            reject(err);
            return;
          }

          const sftpWrapper = sftp as unknown as SFTPWrapper;
          const writeStream = sftpWrapper.createWriteStream(normalizedPath);

          writeStream.on('error', reject);
          writeStream.on('close', resolve);

          writeStream.write(content);
          writeStream.end();
        });
      });

      conn.on('error', reject);

      conn.connect({
        host: host.hostname,
        port: host.port,
        username,
        privateKey: host.private_key,
        passphrase: host.passphrase,
      });
    });

    await uploadFile;
    logger.info('File uploaded successfully', {
      hostId,
      path: normalizedPath,
    });
    res.json({ success: true });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId,
      path: normalizedPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to upload file:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to upload file',
      500,
      metadata,
    );
    res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

// Delete file/directory
const deleteFile: AuthenticatedRequestHandler<
  RequestParams,
  FileOperationResponse,
  any,
  RequestQuery
> = async (req, res) => {
  const { path: deletePath } = req.query;
  const { hostId } = req.params;

  if (!deletePath) {
    const error = createApiError('Path is required', 400);
    logger.warn('No path provided', { hostId });
    res.status(400).json({
      success: false,
      error: error.message,
    });
    return;
  }

  const normalizedPath = path.normalize(deletePath).replace(/^(\.\.[\\/])+/, '');
  const username = process.env.DISABLE_AUTH === 'true' ? 'dev' : req.user?.username;

  try {
    logger.info('Deleting file/directory', { hostId, path: normalizedPath });

    const result = await query<HostConnection>(
      'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
      [hostId],
    );

    if (result.rows.length === 0) {
      const error = createApiError('Host not found', 404);
      logger.warn('Host not found', { hostId });
      res.status(404).json({
        success: false,
        error: error.message,
      });
      return;
    }

    const host = result.rows[0];
    const conn = new Client();

    const deleteFile = new Promise<void>((resolve, reject) => {
      conn.on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) {
            reject(err);
            return;
          }

          const sftpWrapper = sftp as unknown as SFTPWrapper;
          sftpWrapper.unlink(normalizedPath, (err?: Error) => {
            if (err) {
              // If file not found try removing as directory
              const sftpError = err as SFTPError;
              if (sftpError.code === 2) {
                sftpWrapper.rmdir(normalizedPath, (err?: Error) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                  resolve();
                });
                return;
              }
              reject(err);
              return;
            }
            resolve();
          });
        });
      });

      conn.on('error', reject);

      conn.connect({
        host: host.hostname,
        port: host.port,
        username,
        privateKey: host.private_key,
        passphrase: host.passphrase,
      });
    });

    await deleteFile;
    logger.info('File/directory deleted successfully', {
      hostId,
      path: normalizedPath,
    });
    res.json({ success: true });
  } catch (error) {
    const metadata: LogMetadata = {
      hostId,
      path: normalizedPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to delete file/directory:', metadata);

    const apiError = createApiError(
      error instanceof Error ? error.message : 'Failed to delete file/directory',
      500,
      metadata,
    );
    res.status(apiError.status || 500).json({
      success: false,
      error: apiError.message,
    });
  }
};

// Register routes
router.get('/:hostId/list', createAuthHandler(listDirectory));
router.get('/:hostId/download', createAuthHandler(downloadFile));
router.post('/:hostId/upload', createAuthHandler(uploadFile));
router.delete('/:hostId', createAuthHandler(deleteFile));

export default router;
