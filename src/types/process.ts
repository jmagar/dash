export interface ProcessInfo {
  pid: number;
  ppid: number;
  name: string;
  command: string;
  args: string[];
  status: string;
  user: string;
  cpu: number;
  memory: number;
  startTime: Date;
  children?: ProcessInfo[];
}
