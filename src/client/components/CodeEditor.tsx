import * as monaco from '@monaco-editor/react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Alert,
  SelectChangeEvent,
} from '@mui/material';
import { editor } from 'monaco-editor';
import React, { useEffect, useRef, useState } from 'react';

import { useKeyPress } from '../hooks';

interface CodeEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (content: string) => Promise<void>;
  initialContent: string;
  title: string;
  language?: string;
  readOnly?: boolean;
  files?: Array<{
    name: string;
    content: string;
    language?: string;
  }>;
  onFileChange?: (fileName: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  open,
  onClose,
  onSave,
  initialContent,
  title,
  language = 'yaml',
  readOnly = false,
  files,
  onFileChange,
}) => {
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleEditorDidMount: monaco.OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;

    // Configure editor
    monacoInstance.editor.defineTheme('customTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e1e',
      },
    });

    monacoInstance.editor.setTheme('customTheme');

    // Add keyboard shortcuts
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
      void handleSave();
    });
  };

  const handleSave = async (): Promise<void> => {
    try {
      setSaving(true);
      setError(null);
      await onSave(content);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Add keyboard shortcuts
  useKeyPress('s', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      void handleSave();
    }
  });

  useKeyPress('Escape', () => {
    if (!saving) {
      onClose();
    }
  });

  const handleFileSelect = (event: SelectChangeEvent<string>): void => {
    onFileChange?.(event.target.value);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '80vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          {files && files.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>File</InputLabel>
              <Select
                value={title}
                onChange={handleFileSelect}
                label="File"
              >
                {files.map((file) => (
                  <MenuItem key={file.name} value={file.name}>
                    {file.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      </DialogTitle>
      <DialogContent sx={{ flexGrow: 1, p: '0 !important' }}>
        {error && (
          <Alert severity="error" onClose={(): void => setError(null)}>
            {error}
          </Alert>
        )}
        <monaco.default
          height="100%"
          defaultLanguage={language}
          value={content}
          onChange={(value: string | undefined): void => setContent(value || '')}
          onMount={handleEditorDidMount}
          options={{
            readOnly,
            minimap: { enabled: true },
            lineNumbers: 'on',
            renderWhitespace: 'boundary',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            fontSize: 14,
            tabSize: 2,
          }}
        />
      </DialogContent>
      <DialogActions>
        <Typography variant="caption" color="textSecondary" sx={{ mr: 2 }}>
          Ctrl+S to save, Esc to close
        </Typography>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={(): void => void handleSave()}
          variant="contained"
          disabled={saving || readOnly}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CodeEditor;
