import MonacoEditor from '@monaco-editor/react';
import React from 'react';

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  theme: string;
}

export default function CodeEditor({
  value,
  onChange,
  language,
  theme,
}: CodeEditorProps): JSX.Element {
  return (
    <MonacoEditor
      height="100%"
      defaultLanguage={language}
      defaultValue={value}
      theme={theme}
      onChange={(value): void => onChange(value || '')}
      options={{
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        tabSize: 2,
        wordWrap: 'on',
      }}
    />
  );
}
