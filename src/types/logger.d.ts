export interface LogMetadata {
  userId?: string;
  username?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  path?: string;
  timestamp?: string;
  statusCode?: number;
  error?: string | Error;
}
