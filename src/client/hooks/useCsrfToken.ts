import { useState, useEffect } from 'react';
import { api } from '../api/api';

interface CsrfResponse {
  token: string;
}

export function useCsrfToken() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await api.get<CsrfResponse>('/api/csrf-token');
        setCsrfToken(response.data.token);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch CSRF token'));
      } finally {
        setLoading(false);
      }
    };

    void fetchCsrfToken();
  }, []);

  return { csrfToken, loading, error };
} 