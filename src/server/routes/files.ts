import path from 'path';

import express, { Router, RequestHandler } from 'express';
import { Client } from 'ssh2';

import {
  FileItem,
  FileListResponse,
  FileOperationResponse,
  FileUploadRequest,
  HostConnection,
  SFTPError,
  SFTPWrapper,
} from '../../types/files';
import { serverLogger as logger } from '../../utils/serverLogger';
import { query } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router: Router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

interface RequestParams {
  hostId: string;
}

interface RequestQuery {
  path?: string;
}

type FileListHandler = RequestHandler<
  RequestParams,
  FileListResponse,
  any,
  RequestQuery
>;

type FileDownloadHandler = RequestHandler<
  RequestParams,
  any,
  any,
  RequestQuery
>;

type FileUploadHandler = RequestHandler<
  RequestParams,
  FileOperationResponse,
  FileUploadRequest
>;

type FileDeleteHandler = RequestHandler<
  RequestParams,
  FileOperationResponse,
  any,
  RequestQuery
>;

// List directory contents
const listDirectory: FileListHandler = async (req, res) => {
  const { path: dirPath = '/' } = req.query;
  const normalizedPath = path.normalize(dirPath || '').replace(/^(\.\.[\\/])+/, '');
  const authenticatedReq = req as AuthenticatedRequest<RequestParams>;

  try {
    // Get host connection details
    const result = await query<HostConnection>(
      'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
      [req.params.hostId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Host not found' });
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
        username: authenticatedReq.user.username,
        privateKey: host.private_key,
        passphrase: host.passphrase,
      });
    });

    const files = await listDirectory;
    res.json({ success: true, data: files });
  } catch (err) {
    logger.error('Error listing directory:', { error: (err as Error).message, stack: (err as Error).stack });
    res.status(500).json({ success: false, error: (err as Error).message });
  }
};

// Download file
const downloadFile: FileDownloadHandler = async (req, res) => {
  const { path: filePath } = req.query;
  if (!filePath) {
    return res.status(400).json({ success: false, error: 'File path required' });
  }

  const normalizedPath = path.normalize(filePath).replace(/^(\.\.[\\/])+/, '');
  const authenticatedReq = req as AuthenticatedRequest<RequestParams>;

  try {
    const result = await query<HostConnection>(
      'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
      [req.params.hostId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Host not found' });
    }

    const host = result.rows[0];
    const conn = new Client();

    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          res.status(500).json({ success: false, error: err.message });
          return;
        }

        const sftpWrapper = sftp as unknown as SFTPWrapper;
        const readStream = sftpWrapper.createReadStream(normalizedPath);

        readStream.on('error', (err: Error) => {
          res.status(500).json({ success: false, error: err.message });
          conn.end();
        });

        res.attachment(path.basename(normalizedPath));
        readStream.pipe(res);

        readStream.on('end', () => {
          conn.end();
        });
      });
    });

    conn.on('error', (err: Error) => {
      res.status(500).json({ success: false, error: err.message });
    });

    conn.connect({
      host: host.hostname,
      port: host.port,
      username: authenticatedReq.user.username,
      privateKey: host.private_key,
      passphrase: host.passphrase,
    });
  } catch (err) {
    logger.error('Error downloading file:', { error: (err as Error).message, stack: (err as Error).stack });
    res.status(500).json({ success: false, error: (err as Error).message });
  }
};

// Upload file
const uploadFile: FileUploadHandler = async (req, res) => {
  const { path: uploadPath, content } = req.body;
  if (!uploadPath || !content) {
    return res.status(400).json({ success: false, error: 'Path and content required' });
  }

  const normalizedPath = path.normalize(uploadPath).replace(/^(\.\.[\\/])+/, '');
  const authenticatedReq = req as AuthenticatedRequest<RequestParams>;

  try {
    const result = await query<HostConnection>(
      'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
      [req.params.hostId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Host not found' });
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
        username: authenticatedReq.user.username,
        privateKey: host.private_key,
        passphrase: host.passphrase,
      });
    });

    await uploadFile;
    res.json({ success: true });
  } catch (err) {
    logger.error('Error uploading file:', { error: (err as Error).message, stack: (err as Error).stack });
    res.status(500).json({ success: false, error: (err as Error).message });
  }
};

// Delete file/directory
const deleteFile: FileDeleteHandler = async (req, res) => {
  const { path: deletePath } = req.query;
  if (!deletePath) {
    return res.status(400).json({ success: false, error: 'Path required' });
  }

  const normalizedPath = path.normalize(deletePath).replace(/^(\.\.[\\/])+/, '');
  const authenticatedReq = req as AuthenticatedRequest<RequestParams>;

  try {
    const result = await query<HostConnection>(
      'SELECT h.*, sk.private_key, sk.passphrase FROM hosts h LEFT JOIN ssh_keys sk ON h.ssh_key_id = sk.id WHERE h.id = $1',
      [req.params.hostId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Host not found' });
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
        username: authenticatedReq.user.username,
        privateKey: host.private_key,
        passphrase: host.passphrase,
      });
    });

    await deleteFile;
    res.json({ success: true });
  } catch (err) {
    logger.error('Error deleting file:', { error: (err as Error).message, stack: (err as Error).stack });
    res.status(500).json({ success: false, error: (err as Error).message });
  }
};

// Register routes
router.get('/:hostId/list', listDirectory);
router.get('/:hostId/download', downloadFile);
router.post('/:hostId/upload', uploadFile);
router.delete('/:hostId', deleteFile);

export default router;
