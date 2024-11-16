import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@mui/material';
import { Computer as ComputerIcon } from '@mui/icons-material';
import { useHost } from '../hooks/useHost';
import { FileListItem } from './FileListItem';
import { HostSelector } from './HostSelector';
import type { Host } from '../../types/models-shared';

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

export function FileExplorer() {
  const navigate = useNavigate();
  const { hostId = '', path = '/' } = useParams();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHostSelectorOpen, setIsHostSelectorOpen] = useState(!hostId);
  const { host } = useHost({ hostId });

  useEffect(() => {
    const fetchFiles = async () => {
      if (!hostId) {
        setFiles([]);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/hosts/${hostId}/files?path=${encodeURIComponent(path)}`);
        const data = await response.json();

        if (data.success && data.data) {
          setFiles(data.data.map((file: any) => ({
            ...file,
            isDirectory: file.isDir,
          })));
        } else {
          setError(data.error || 'Failed to fetch files');
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch files');
      } finally {
        setLoading(false);
      }
    };

    void fetchFiles();
  }, [hostId, path]);

  const handleHostSelect = (host: Host) => {
    navigate(`/files/${host.id}`);
  };

  const handleFileClick = (file: FileInfo) => {
    if (file.isDirectory) {
      navigate(`/files/${hostId}${file.path}`);
    }
  };

  if (!hostId) {
    return (
      <div className="p-4">
        <Button
          variant="outlined"
          startIcon={<ComputerIcon />}
          onClick={() => setIsHostSelectorOpen(true)}
        >
          Select Host
        </Button>
        <HostSelector
          open={isHostSelectorOpen}
          onClose={() => setIsHostSelectorOpen(false)}
          onSelect={handleHostSelect}
        />
      </div>
    );
  }

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <Button
          variant="outlined"
          startIcon={<ComputerIcon />}
          onClick={() => setIsHostSelectorOpen(true)}
        >
          {host?.name || 'Select Host'}
        </Button>
        <HostSelector
          open={isHostSelectorOpen}
          onClose={() => setIsHostSelectorOpen(false)}
          onSelect={handleHostSelect}
        />
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="grid grid-cols-12 gap-4 p-4 border-b font-medium text-gray-500">
          <div className="col-span-6">Name</div>
          <div className="col-span-2">Size</div>
          <div className="col-span-2">Modified</div>
          <div className="col-span-2">Permissions</div>
        </div>

        {files.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No files found
          </div>
        ) : (
          <div className="divide-y">
            {files.map((file) => (
              <FileListItem
                key={file.path}
                file={file}
                onClick={() => handleFileClick(file)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
