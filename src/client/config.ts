interface Config {
  websocketUrl: string;
  apiUrl: string;
  maxFileSize: number;
  maxUploadSize: number;
  defaultTheme: 'light' | 'dark';
  tokenRefreshInterval: number;
}

export const config: Config = {
  websocketUrl: process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:4000',
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:4000',
  maxFileSize: parseInt(process.env.REACT_APP_MAX_FILE_SIZE || '52428800', 10), // 50MB
  maxUploadSize: parseInt(process.env.REACT_APP_MAX_UPLOAD_SIZE || '104857600', 10), // 100MB
  defaultTheme: (process.env.REACT_APP_DEFAULT_THEME || 'light') as 'light' | 'dark',
  tokenRefreshInterval: parseInt(process.env.REACT_APP_TOKEN_REFRESH_INTERVAL || '300000', 10), // 5 minutes
};
