import { Stats } from 'fs';
import { Readable } from 'stream';

export interface IFilesystemService {
    isDirectory(path: string): Promise<boolean>;
    stat(path: string): Promise<Stats>;
    createReadStream(path: string): Promise<Readable>;
    createZipStream(path: string): Promise<Readable>;
}

export interface ShareSecurity {
    csrfProtection?: boolean;
    csrfToken?: string;
}

export interface ShareMetadata {
    allowZipDownload?: boolean;
    security?: ShareSecurity;
    path: string;
    csrfToken?: string;
}

export interface FileStats extends Stats {
    isDirectory(): boolean;
    size: number;
}
