declare module 'dockerode' {
    import { EventEmitter } from 'events';
    
interface DockerOptions {
        socketPath?: string;
        host?: string;
        port?: number;
        protocol?: string;
        ca?: string | string[] | Buffer | Buffer[];
        cert?: string | string[] | Buffer | Buffer[];
        key?: string | string[] | Buffer | Buffer[];
        version?: string;
        timeout?: number;
    }

    interface ContainerCreateOptions {
        name?: string;
        Hostname?: string;
        User?: string;
        AttachStdin?: boolean;
        AttachStdout?: boolean;
        AttachStderr?: boolean;
        Tty?: boolean;
        OpenStdin?: boolean;
        StdinOnce?: boolean;
        Env?: string[];
        Cmd?: string[];
        Image?: string;
        WorkingDir?: string;
        Entrypoint?: string[];
        HostConfig?: {
            Binds?: string[];
            PortBindings?: { [key: string]: { HostPort: string }[] };
            RestartPolicy?: { Name: string; MaximumRetryCount?: number };
            AutoRemove?: boolean;
            NetworkMode?: string;
        };
    }

    interface ContainerInfo {
        Id: string;
        Names: string[];
        Image: string;
        ImageID: string;
        Command: string;
        Created: number;
        Ports: Array<{
            IP?: string;
            PrivatePort: number;
            PublicPort?: number;
            Type: string;
        }>;
        State: string;
        Status: string;
    }

    interface Container {
        id: string;
        start(): Promise<void>;
        stop(): Promise<void>;
        remove(): Promise<void>;
        inspect(): Promise<Record<string, unknown>>;
        logs(options?: { stdout?: boolean; stderr?: boolean; follow?: boolean }): Promise<string>;
        exec(options: { Cmd: string[]; AttachStdout?: boolean; AttachStderr?: boolean }): Promise<Exec>;
    }

    interface Exec extends EventEmitter {
        start(options?: { hijack?: boolean; stdin?: boolean }): Promise<void>;
        inspect(): Promise<Record<string, unknown>>;
    }

    interface ImageInfo {
        Id: string;
        ParentId: string;
        RepoTags: string[];
        RepoDigests: string[];
        Created: number;
        Size: number;
        VirtualSize: number;
        Labels: Record<string, string>;
    }

    class Docker {
      constructor(options?: DockerOptions);
      createContainer(options: ContainerCreateOptions): Promise<Container>;
      listContainers(options?: { all?: boolean }): Promise<ContainerInfo[]>;
      getContainer(id: string): Container;
      listImages(): Promise<ImageInfo[]>;
      pull(repoTag: string, options?: Record<string, unknown>): Promise<void>;
      getImage(name: string): { remove(): Promise<void>; tag(options: Record<string, string>): Promise<void> };
      buildImage(file: string | NodeJS.ReadableStream, options?: Record<string, unknown>): Promise<void>;
    }

    export = Docker;
}
