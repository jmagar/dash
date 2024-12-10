import { Router, Request, Response, NextFunction } from 'express';
import type { RequestHandler } from 'express';
import multer, { FileFilterCallback, Multer, MulterError } from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { requireAuth } from '../../middleware/auth';
import { LoggingManager } from '../../utils/logging/LoggingManager';
import type { LogMetadata } from '../../utils/logging/LoggingManager';
import { ParamsDictionary, Request as CoreRequest } from 'express-serve-static-core';

// File type validation
const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp',
  // Documents
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Text
  'text/plain', 'text/html', 'text/css', 'text/javascript',
  // Archives
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  // Video
  'video/mp4', 'video/avi', 'video/quicktime', 'video/x-ms-wmv'
] as const);

type AllowedMimeType = typeof ALLOWED_MIME_TYPES extends Set<infer T> ? T : never;

interface UploadError {
  error: string;
}

interface UploadResponse {
  message: string;
  file: {
    filename: string;
    path: string;
    size: number;
  };
}

interface UploadRequestBody {
  path?: string;
}

type FileUploadRequest = Request<
  ParamsDictionary,
  UploadError | UploadResponse,
  UploadRequestBody
>;

const router: Router = Router();
const logger: LoggingManager = LoggingManager.getInstance();

// Ensure upload directory exists
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', '..', 'uploads');

// Create base upload directory if it doesn't exist
async function ensureUploadDirExists(): Promise<void> {
  try {
    await fs.mkdir(UPLOAD_BASE_DIR, { recursive: true });
    const metadata: LogMetadata = { path: UPLOAD_BASE_DIR };
    logger.info('Upload directory created/verified', metadata);
  } catch (error) {
    const metadata: LogMetadata = {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: UPLOAD_BASE_DIR
    };
    logger.error('Failed to create upload directory', metadata);
    throw error;
  }
}

// Initialize upload directory
void ensureUploadDirExists();

// File filter function
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype as AllowedMimeType)) {
    cb(new Error(`File type not allowed. Allowed types: ${Array.from(ALLOWED_MIME_TYPES).join(', ')}`));
    return;
  }
  cb(null, true);
};

// Define base multer request type
interface BaseMulterRequest extends CoreRequest {
  file?: Express.Multer.File;
  requestId: string;
}

type MulterRequest = Request & BaseMulterRequest;

// Configure multer for file uploads
const storage: multer.StorageEngine = multer.diskStorage({
  destination: (
    req: Request<ParamsDictionary, unknown, UploadRequestBody>,
    _file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => {
    void (async () => {
      try {
        const uploadPath = path.join(UPLOAD_BASE_DIR, req.body.path || '');
        const normalizedPath = path.normalize(uploadPath);
        if (!normalizedPath.startsWith(UPLOAD_BASE_DIR)) {
          throw new Error('Invalid upload path');
        }
        await fs.mkdir(normalizedPath, { recursive: true });
        cb(null, normalizedPath);
      } catch (error) {
        const metadata: LogMetadata = {
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        logger.error('Failed to create upload subdirectory', metadata);
        cb(error as Error, '');
      }
    })();
  },
  filename: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    const timestamp = Date.now();
    const sanitizedName = path.basename(file.originalname).replace(/[^a-zA-Z0-9.-]/g, '_');
    const ext = path.extname(sanitizedName);
    const name = path.basename(sanitizedName, ext);
    cb(null, `${name}-${timestamp}${ext}`);
  }
});

const upload: Multer = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    files: 1, // Only allow one file at a time
  },
});

// Error handler middleware
const handleUploadError = (
  err: Error,
  _req: Request,
  res: Response<UploadError>,
  _next: NextFunction
): void => {
  if (err instanceof MulterError) {
    // Multer error handling
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        res.status(413).json({ error: 'File too large' });
        return;
      case 'LIMIT_FILE_COUNT':
        res.status(400).json({ error: 'Too many files' });
        return;
      default:
        res.status(400).json({ error: err.message });
        return;
    }
  }
  // Other errors
  const metadata: LogMetadata = {
    error: err.message,
    stack: err.stack,
  };
  logger.error('File upload error:', metadata);
  res.status(500).json({ error: err.message });
};

// File upload endpoint
router.post<ParamsDictionary, UploadError | UploadResponse, UploadRequestBody>(
  '/upload',
  requireAuth as RequestHandler,
  ((req: FileUploadRequest, res: Response<UploadError>, next: NextFunction) => {
    const uploadMiddleware = upload.single('file');
    uploadMiddleware(req as unknown as MulterRequest, res, (err: unknown) => {
      if (err) {
        handleUploadError(err as Error, req as unknown as MulterRequest, res, next);
      } else {
        next();
      }
    });
  }) as RequestHandler<ParamsDictionary, UploadError | UploadResponse, UploadRequestBody>,
  ((req: FileUploadRequest & { file?: Express.Multer.File }, res: Response<UploadResponse | UploadError>) => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' } as UploadError);
      return;
    }

    try {
      const file = {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size
      };

      res.status(200).json({
        message: 'File uploaded successfully',
        file
      } as UploadResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message } as UploadError);
    }
  }) as RequestHandler<ParamsDictionary, UploadError | UploadResponse, UploadRequestBody>
);

export default router;
