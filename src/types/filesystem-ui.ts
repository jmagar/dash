import { SvgIconProps } from '@mui/material';
import {
  FolderRounded,
  InsertDriveFileRounded,
  ImageRounded,
  MovieRounded,
  AudiotrackRounded,
  DescriptionRounded,
  CodeRounded,
  ArchiveRounded,
  TextSnippetRounded,
  ArticleRounded,
} from '@mui/icons-material';

// File type categories with their associated Material icons and colors
export const FileTypeConfig = {
  directory: {
    icon: FolderRounded,
    color: 'primary.main',
    selectable: true,
  },
  image: {
    icon: ImageRounded,
    color: '#4CAF50', // Material Green
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'],
    mimeTypes: ['image/*'],
  },
  video: {
    icon: MovieRounded,
    color: '#F44336', // Material Red
    extensions: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm'],
    mimeTypes: ['video/*'],
  },
  audio: {
    icon: AudiotrackRounded,
    color: '#9C27B0', // Material Purple
    extensions: ['.mp3', '.wav', '.ogg', '.m4a', '.flac'],
    mimeTypes: ['audio/*'],
  },
  document: {
    icon: DescriptionRounded,
    color: '#2196F3', // Material Blue
    extensions: ['.doc', '.docx', '.pdf', '.odt', '.rtf'],
    mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
  code: {
    icon: CodeRounded,
    color: '#FF9800', // Material Orange
    extensions: ['.js', '.ts', '.py', '.java', '.cpp', '.html', '.css', '.php', '.rb', '.go'],
  },
  archive: {
    icon: ArchiveRounded,
    color: '#795548', // Material Brown
    extensions: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'],
    mimeTypes: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'],
  },
  text: {
    icon: TextSnippetRounded,
    color: '#607D8B', // Material Blue Grey
    extensions: ['.txt', '.md', '.log', '.json', '.xml', '.csv'],
    mimeTypes: ['text/*'],
  },
  default: {
    icon: ArticleRounded,
    color: '#9E9E9E', // Material Grey
    selectable: true,
  },
} as const;

export type FileType = keyof typeof FileTypeConfig;

// Interface for file items in the UI
export interface FileItemUI {
  id: string;
  name: string;
  path: string;
  type: FileType;
  size?: number;
  modified?: Date;
  icon: typeof FileTypeConfig[FileType]['icon'];
  color: string;
  selected?: boolean;
  locationId: string;
}

// Interface for file operation UI elements
export interface FileOperationUI {
  id: string;
  type: 'copy' | 'move' | 'delete' | 'upload' | 'download';
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  source: {
    locationId: string;
    path: string;
  };
  target?: {
    locationId: string;
    path: string;
  };
  error?: string;
}

// Interface for file selection dialog configuration
export interface FileSelectionConfig {
  title: string;
  type: 'file' | 'directory';
  multiple?: boolean;
  filter?: {
    extensions?: string[];
    mimeTypes?: string[];
  };
  initialPath?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

// Theme configuration for the file explorer
export const FileExplorerTheme = {
  spacing: 1, // Base spacing unit in Material UI (8px)
  borderRadius: 1, // Border radius for cards and elements
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
    },
  },
  components: {
    fileItem: {
      height: 40,
      iconSize: 24,
      selectedBgColor: 'rgba(25, 118, 210, 0.08)', // Light blue background for selected items
      hoverBgColor: 'rgba(0, 0, 0, 0.04)',
    },
    toolbar: {
      height: 48,
      buttonSize: 'small' as const,
    },
    breadcrumbs: {
      height: 40,
      maxItems: 4,
    },
    dropZone: {
      borderColor: 'primary.main',
      borderStyle: '2px dashed',
      borderRadius: 1,
      padding: 2,
    },
  },
};
