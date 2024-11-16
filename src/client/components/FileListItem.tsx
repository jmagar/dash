import React from 'react';
import { formatBytes, formatDate, formatPermissions } from '../utils/formatters';

interface FileInfo {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  mode: number;
  modTime: string;
  owner: string;
  group: string;
}

interface FileListItemProps {
  file: FileInfo;
  onClick: () => void;
}

export function FileListItem({ file, onClick }: FileListItemProps) {
  const getFileIcon = (file: FileInfo): string => {
    if (file.isDirectory) return '📁';
    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'txt':
      case 'md':
      case 'log':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      case 'mp3':
      case 'wav':
      case 'ogg':
        return '🎵';
      case 'mp4':
      case 'avi':
      case 'mov':
        return '🎥';
      case 'zip':
      case 'tar':
      case 'gz':
      case '7z':
        return '📦';
      case 'pdf':
        return '📕';
      case 'doc':
      case 'docx':
        return '📘';
      case 'xls':
      case 'xlsx':
        return '📗';
      case 'ppt':
      case 'pptx':
        return '📙';
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return '⚡';
      case 'html':
      case 'css':
        return '🌐';
      case 'json':
      case 'yml':
      case 'yaml':
        return '⚙️';
      case 'sh':
      case 'bash':
        return '💻';
      default:
        return '📄';
    }
  };

  return (
    <button
      onClick={onClick}
      className="w-full grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 text-left"
    >
      <div className="col-span-6 flex items-center space-x-2">
        <span role="img" aria-label={file.isDirectory ? 'Folder' : 'File'}>
          {getFileIcon(file)}
        </span>
        <span className="truncate">{file.name}</span>
      </div>
      <div className="col-span-2 text-gray-500">
        {file.isDirectory ? '--' : formatBytes(file.size)}
      </div>
      <div className="col-span-2 text-gray-500">
        {formatDate(file.modTime)}
      </div>
      <div className="col-span-2 text-gray-500 font-mono">
        {formatPermissions(file.mode)}
      </div>
    </button>
  );
}
