import type { Terminal } from 'xterm';

declare module '@xterm/addon-fit' {
  export class FitAddon {
    activate(terminal: Terminal): void;
    dispose(): void;
    fit(): void;
  }
}

declare module '@xterm/addon-web-links' {
  export interface ILinkProvider {
    provideLinks(bufferLineNumber: number, callback: (links: ILink[] | undefined) => void): void;
  }

  export interface ILink {
    range: {
      start: { x: number; y: number };
      end: { x: number; y: number };
    };
    text: string;
    activate(): void;
    hover?: (event: MouseEvent) => void;
    leave?: (event: MouseEvent) => void;
    dispose?: () => void;
  }

  export class WebLinksAddon {
    constructor(handler?: (event: MouseEvent, uri: string) => void, options?: {
      urlRegex?: RegExp;
      hover?: (event: MouseEvent, text: string) => void;
      leave?: (event: MouseEvent, text: string) => void;
    });
    activate(terminal: Terminal): void;
    dispose(): void;
  }
}
