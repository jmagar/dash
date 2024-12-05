export interface KeyDistributionStatus {
    status: string;
    details: string;
    progress: number;
    agentKeys: Map<string, string>;
}

export interface KeyDistributionCommand {
    hostUrl: string;
    agents: string[];
}
