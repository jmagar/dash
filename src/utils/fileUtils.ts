import { Socket } from 'socket.io-client';

// Utility functions for file-related operations
export const createSocketConnection = (_url: string): Socket => {
  // Placeholder for socket connection logic
  throw new Error('Not implemented');
};

export const parseFileName = (filePath: string): string => {
  const parts = filePath.split('/');
  return parts[parts.length - 1];
};

export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

export const isValidFileName = (fileName: string): boolean => {
  // Basic filename validation
  const invalidChars = /[<>:"/\\|?*]/;
  return fileName.length > 0 &&
         fileName.length <= 255 &&
         !invalidChars.test(fileName);
};

export const getFileExtension = (fileName: string): string => {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

export default {
  createSocketConnection,
  parseFileName,
  formatFileSize,
  isValidFileName,
  getFileExtension,
};
