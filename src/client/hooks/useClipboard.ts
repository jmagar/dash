import { useState, useCallback } from 'react';

interface UseClipboardOptions {
  timeout?: number;
}

interface UseClipboardReturn {
  copyToClipboard: (text: string) => Promise<void>;
  hasCopied: boolean;
  error: Error | null;
}

export function useClipboard({ timeout = 2000 }: UseClipboardOptions = {}): UseClipboardReturn {
  const [hasCopied, setHasCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const copyToClipboard = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setHasCopied(true);
        setError(null);

        setTimeout(() => {
          setHasCopied(false);
        }, timeout);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to copy text to clipboard'));
        setHasCopied(false);
      }
    },
    [timeout]
  );

  return { copyToClipboard, hasCopied, error };
}

export default useClipboard;
