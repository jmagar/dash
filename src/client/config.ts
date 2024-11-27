interface Config {
  socketUrl: string;
  apiUrl: string;
  maxFileSize: number;
  maxUploadSize: number;
  defaultTheme: 'light' | 'dark';
  tokenRefreshInterval: number;
  maxRequestSize: number;
}

const env = process.env.NODE_ENV || 'development';

export const config: Config = {
  socketUrl: env === 'production' ? window.location.origin.replace(/^http/, 'ws') : 'ws://localhost:4000',
  apiUrl: env === 'production' ? '/api' : 'http://localhost:4000',
  maxFileSize: parseInt(process.env.REACT_APP_MAX_FILE_SIZE || '52428800', 10), // 50MB
  maxUploadSize: parseInt(process.env.REACT_APP_MAX_UPLOAD_SIZE || '104857600', 10), // 100MB
  defaultTheme: (process.env.REACT_APP_DEFAULT_THEME || 'light') as 'light' | 'dark',
  tokenRefreshInterval: parseInt(process.env.REACT_APP_TOKEN_REFRESH_INTERVAL || '300000', 10), // 5 minutes
  maxRequestSize: 50 * 1024 * 1024, // 50MB
};
