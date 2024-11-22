export interface FileOperation {
  id: string;
  message: string;
  progress: number;
  completed?: boolean;
}

export interface DragData {
  files: FileInfo[];
  sourceHostId: string;
  sourcePath: string;
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  mode: number;
  modTime: string;
  owner: string;
  group: string;
}
