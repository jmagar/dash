/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format percentage to human readable string
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format date to human readable string
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString();
}

/**
 * Format duration to human readable string
 */
export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  seconds -= days * 24 * 60 * 60;
  const hours = Math.floor(seconds / (60 * 60));
  seconds -= hours * 60 * 60;
  const minutes = Math.floor(seconds / 60);
  seconds -= minutes * 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${Math.floor(seconds)}s`);

  return parts.join(' ') || '0s';
}

/**
 * Format number to human readable string
 */
export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format bits per second to human readable string
 */
export function formatBitrate(bps: number, decimals = 1): string {
  if (bps === 0) return '0 bps';

  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps'];

  const i = Math.floor(Math.log(bps) / Math.log(k));

  return `${parseFloat((bps / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format file permissions to human readable string
 */
export function formatPermissions(mode: number): string {
  const octal = (mode & 0o777).toString(8);
  return octal.padStart(3, '0');
}

/**
 * Format file size with appropriate units
 */
export function formatFileSize(size: number): string {
  return formatBytes(size);
}
