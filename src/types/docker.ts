export interface DockerPort {
  ip: string;
  privatePort: number;
  publicPort: number;
  type: string;
}

export interface DockerContainer {
  id: string;
  names: string[];
  image: string;
  status: string;
  state: string;
  created: number;
  ports: DockerPort[];
  labels: Record<string, string>;
}

export interface DockerNetwork {
  id: string;
  name: string;
  driver: string;
  scope: string;
  internal: boolean;
  enableIPv6: boolean;
  ipam: {
    driver: string;
    options: Record<string, string>;
    config: Array<{
      subnet: string;
      gateway: string;
    }>;
  };
  containers: Record<string, {
    name: string;
    endpointId: string;
    macAddress: string;
    ipv4Address: string;
    ipv6Address: string;
  }>;
  options: Record<string, string>;
  labels: Record<string, string>;
}

export interface DockerVolume {
  name: string;
  driver: string;
  mountpoint: string;
  status: Record<string, string>;
  labels: Record<string, string>;
  scope: string;
  options: Record<string, string>;
  usageData: {
    size: number;
    refCount: number;
  };
}

export interface DockerStats {
  read: string;
  preread: string;
  pidsStats: {
    current: number;
    limit: number;
  };
  blkioStats: {
    ioServiceBytesRecursive: Array<{
      major: number;
      minor: number;
      op: string;
      value: number;
    }>;
    ioServicedRecursive: Array<{
      major: number;
      minor: number;
      op: string;
      value: number;
    }>;
  };
  cpuStats: {
    cpuUsage: {
      totalUsage: number;
      perCpuUsage: number[];
      usageInKernelmode: number;
      usageInUsermode: number;
    };
    systemCpuUsage: number;
    onlineCpus: number;
    throttlingData: {
      periods: number;
      throttledPeriods: number;
      throttledTime: number;
    };
  };
  precpuStats: {
    cpuUsage: {
      totalUsage: number;
      perCpuUsage: number[];
      usageInKernelmode: number;
      usageInUsermode: number;
    };
    systemCpuUsage: number;
    onlineCpus: number;
    throttlingData: {
      periods: number;
      throttledPeriods: number;
      throttledTime: number;
    };
  };
  memoryStats: {
    usage: number;
    maxUsage: number;
    stats: {
      activeAnon: number;
      activeFile: number;
      cache: number;
      dirty: number;
      hierarchicalMemoryLimit: number;
      hierarchicalMemswLimit: number;
      inactiveAnon: number;
      inactiveFile: number;
      mappedFile: number;
      pgfault: number;
      pgmajfault: number;
      pgpgin: number;
      pgpgout: number;
      rss: number;
      rssHuge: number;
      totalActiveAnon: number;
      totalActiveFile: number;
      totalCache: number;
      totalDirty: number;
      totalInactiveAnon: number;
      totalInactiveFile: number;
      totalMappedFile: number;
      totalPgfault: number;
      totalPgmajfault: number;
      totalPgpgin: number;
      totalPgpgout: number;
      totalRss: number;
      totalRssHuge: number;
      totalUnevictable: number;
      totalWriteback: number;
      unevictable: number;
      writeback: number;
    };
    limit: number;
  };
  networks: Record<string, {
    rxBytes: number;
    rxPackets: number;
    rxErrors: number;
    rxDropped: number;
    txBytes: number;
    txPackets: number;
    txErrors: number;
    txDropped: number;
  }>;
}

export interface ContainerStats {
  hostId: string;
  containerId: string;
  stats: DockerStats;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormattedContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  created: number;
  ports: string[];
}

export interface DockerResponse {
  success?: boolean;
  error?: string;
}
