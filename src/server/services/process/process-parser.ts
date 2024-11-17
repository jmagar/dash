import { logger } from '../../utils/logger';
import type { ProcessInfo } from '../../../types/metrics';

interface RawProcessInfo {
  pid: string | number;
  ppid: string | number;
  name: string;
  command: string;
  args: string[];
  user: string;
  username: string;
  cpu: string | number;
  memory: string | number;
  cpuUsage: number;
  memoryUsage: number;
  memoryRss: number;
  memoryVms: number;
  status: string;
  startTime: string;
  threads: number;
  fds: number;
}

export function parseProcessInfo(raw: RawProcessInfo): ProcessInfo {
  const now = new Date();
  return {
    pid: typeof raw.pid === 'string' ? parseInt(raw.pid, 10) : raw.pid,
    ppid: typeof raw.ppid === 'string' ? parseInt(raw.ppid, 10) : raw.ppid,
    name: raw.name,
    command: raw.command,
    args: raw.args,
    user: raw.user,
    username: raw.username,
    cpu: typeof raw.cpu === 'string' ? parseFloat(raw.cpu) : raw.cpu,
    memory: typeof raw.memory === 'string' ? parseFloat(raw.memory) : raw.memory,
    cpuUsage: raw.cpuUsage,
    memoryUsage: raw.memoryUsage,
    memoryRss: raw.memoryRss,
    memoryVms: raw.memoryVms,
    status: parseProcessStatus(raw.status),
    startTime: parseStartTime(raw.startTime),
    threads: raw.threads,
    fds: raw.fds,
    createdAt: now,
    updatedAt: now,
  };
}

export function parseProcessList(output: string): ProcessInfo[] {
  const lines = output.trim().split('\n');
  if (lines.length < 2) return [];

  const processes: ProcessInfo[] = [];

  // Skip header line
  for (const line of lines.slice(1)) {
    try {
      const [
        pid,
        ppid,
        user,
        cpu,
        mem,
        vsz,
        rss,
        tty,
        stat,
        start,
        time,
        comm,
        ...args
      ] = line.trim().split(/\s+/);

      const processInfo = parseProcessInfo({
        pid,
        ppid,
        name: comm,
        command: comm,
        args,
        user,
        username: user,
        cpu,
        memory: mem,
        cpuUsage: parseFloat(cpu),
        memoryUsage: parseFloat(mem),
        memoryRss: parseInt(rss, 10) * 1024,
        memoryVms: parseInt(vsz, 10) * 1024,
        status: stat,
        startTime: start,
        threads: 0,
        fds: 0,
      });

      processes.push(processInfo);
    } catch (error) {
      logger.error('Failed to parse process line:', {
        line,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return processes;
}

export function filterProcesses(processes: ProcessInfo[], filter: Partial<ProcessInfo> = {}): ProcessInfo[] {
  return processes.filter(process => {
    for (const [key, value] of Object.entries(filter)) {
      if (process[key as keyof ProcessInfo] !== value) {
        return false;
      }
    }
    return true;
  });
}

export function sortProcesses(processes: ProcessInfo[], sortBy: keyof ProcessInfo = 'pid', order: 'asc' | 'desc' = 'asc'): ProcessInfo[] {
  return [...processes].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    if (aValue === bValue) return 0;
    if (aValue === undefined) return order === 'asc' ? -1 : 1;
    if (bValue === undefined) return order === 'asc' ? 1 : -1;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    return order === 'asc' ? 1 : -1;
  });
}

function parseProcessStatus(stat: string): ProcessInfo['status'] {
  switch (stat.charAt(0)) {
    case 'R':
      return 'running';
    case 'S':
      return 'sleeping';
    case 'T':
      return 'stopped';
    case 'Z':
      return 'zombie';
    default:
      return 'unknown';
  }
}

function parseStartTime(start: string): Date {
  const now = new Date();
  const [hour, minute] = start.split(':');

  // If the process started today
  const startTime = new Date(now);
  startTime.setHours(parseInt(hour, 10));
  startTime.setMinutes(parseInt(minute, 10));
  startTime.setSeconds(0);
  startTime.setMilliseconds(0);

  // If the start time is in the future, it must be from yesterday
  if (startTime > now) {
    startTime.setDate(startTime.getDate() - 1);
  }

  return startTime;
}
