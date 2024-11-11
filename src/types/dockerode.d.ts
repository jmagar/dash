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
        inspect(): Promise<any>;
        logs(options?: { stdout?: boolean; stderr?: boolean; follow?: boolean }): Promise<any>;
        exec(options: { Cmd: string[]; AttachStdout?: boolean; AttachStderr?: boolean }): Promise<Exec>;
    }

    interface Exec extends EventEmitter {
        start(options?: { hijack?: boolean; stdin?: boolean }): Promise<void>;
        inspect(): Promise<any>;
    }

    interface PullOptions {
        fromImage?: string;
        tag?: string;
        platform?: string;
        [key: string]: unknown;
    }

    interface BuildOptions {
        t?: string;
        dockerfile?: string;
        nocache?: boolean;
        buildargs?: Record<string, string>;
        [key: string]: unknown;
    }

    class Docker {
      constructor(options?: DockerOptions);
      createContainer(options: ContainerCreateOptions): Promise<Container>;
      listContainers(options?: { all?: boolean }): Promise<ContainerInfo[]>;
      getContainer(id: string): Container;
      listImages(): Promise<any[]>;
      pull(repoTag: string, options?: PullOptions): Promise<any>;
      getImage(name: string): any;
      buildImage(file: string | NodeJS.ReadableStream, options?: BuildOptions): Promise<any>;
    }

    export = Docker;
}
