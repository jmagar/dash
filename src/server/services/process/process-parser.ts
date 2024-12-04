import { LoggingManager } from '../../managers/LoggingManager';
import { ProcessInfo, createProcessId } from './types';

interface RawProcessInfo {
  pid: string | number;
  ppid: string | number;
  name: string;
  command: string;
  args: string[];
  user: string;
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
  const pid = typeof raw.pid === 'string' ? parseInt(raw.pid, 10) : raw.pid;
  const ppid = typeof raw.ppid === 'string' ? parseInt(raw.ppid, 10) : raw.ppid;

  return {
    id: `process-${pid}`,
    pid: createProcessId(pid),
    ppid: createProcessId(ppid),
    name: raw.name,
    command: raw.command,
    args: raw.args,
    user: raw.user,
    cpu: typeof raw.cpu === 'string' ? parseFloat(raw.cpu) : raw.cpu,
    memory: typeof raw.memory === 'string' ? parseFloat(raw.memory) : raw.memory,
    cpuUsage: raw.cpuUsage,
    memoryUsage: raw.memoryUsage,
    memoryRss: raw.memoryRss,
    memoryVms: raw.memoryVms,
    status: parseProcessStatus(raw.status),
    startTime: raw.startTime,
    threads: raw.threads,
    fds: raw.fds,
    diskRead: 0,
    diskWrite: 0,
    netRead: 0,
    netWrite: 0,
    timestamp: now,
    createdAt: now,
    updatedAt: now
  };
}

export function parseProcessList(output: string): ProcessInfo[] {
  const lines = output.trim().split('\n');
  if (lines.length < 2) return [];

  const processes: ProcessInfo[] = [];
  const logger = LoggingManager.getInstance();

  // Skip header line
  for (const line of lines.slice(1)) {
    try {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 12) {
        logger.warn('Invalid process line format', { line });
        continue;
      }

      const [
        pidStr,
        ppidStr,
        user,
        cpuStr,
        memStr,
        vszStr,
        rssStr,
        _tty,
        stat,
        start,
        _time,
        comm,
        ...args
      ] = parts;

      // Validate required fields
      if (!pidStr || !ppidStr || !user || !cpuStr || !memStr || !vszStr || !rssStr || !stat || !start || !comm) {
        logger.warn('Missing required process fields', { line });
        continue;
      }

      const processInfo = parseProcessInfo({
        pid: pidStr,
        ppid: ppidStr,
        name: comm,
        command: comm,
        args: args || [],
        user,
        cpu: cpuStr,
        memory: memStr,
        cpuUsage: parseFloat(cpuStr),
        memoryUsage: parseFloat(memStr),
        memoryRss: parseInt(rssStr, 10) * 1024,
        memoryVms: parseInt(vszStr, 10) * 1024,
        status: stat,
        startTime: start,
        threads: 0,
        fds: 0,
      });

      processes.push(processInfo);
    } catch (error) {
      logger.error('Failed to parse process line', {
        line,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return processes;
}

export function filterProcesses(processes: ProcessInfo[], filter: Partial<ProcessInfo>): ProcessInfo[] {
  return processes.filter(process => {
    return Object.entries(filter).every(([key, value]) => {
      const processKey = key as keyof ProcessInfo;
      return process[processKey] === value;
    });
  });
}

export function sortProcesses(
  processes: ProcessInfo[],
  sortBy: keyof ProcessInfo = 'pid',
  order: 'asc' | 'desc' = 'asc'
): ProcessInfo[] {
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
