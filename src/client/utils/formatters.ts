// Format bytes to human readable string
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Format percentage
export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Format number with thousands separator
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat().format(value);
};

// Format bytes per second
export const formatBytesPerSecond = (bytes: number): string => {
  return `${formatBytes(bytes)}/s`;
};

// Format duration in seconds to human readable string
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
};

// Format date to locale string
export const formatDate = (date: string | number | Date): string => {
  return new Date(date).toLocaleString();
};

// Format load average
export const formatLoadAvg = (loadAvg: number[]): string => {
  return loadAvg.map(v => v.toFixed(2)).join(', ');
};

// Format network speed
export const formatSpeed = (bytesPerSecond: number): string => {
  return formatBytesPerSecond(bytesPerSecond);
};
