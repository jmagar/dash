declare module '@xterm/addon-fit' {
  import { Terminal } from '@xterm/xterm';

  export class FitAddon {
    activate(terminal: Terminal): void;
    fit(): void;
    dispose(): void;
  }
}

declare module '@xterm/addon-web-links' {
  import { Terminal } from '@xterm/xterm';

  export class WebLinksAddon {
    constructor(handler?: (event: MouseEvent, uri: string) => void, options?: { hover?: boolean; urlRegex?: RegExp });
    activate(terminal: Terminal): void;
    dispose(): void;
  }
}

declare module '@xterm/addon-search' {
  import { Terminal } from '@xterm/xterm';

  export interface ISearchOptions {
    regex?: boolean;
    wholeWord?: boolean;
    caseSensitive?: boolean;
    incremental?: boolean;
  }

  export class SearchAddon {
    activate(terminal: Terminal): void;
    dispose(): void;
    findNext(term: string, searchOptions?: ISearchOptions): boolean;
    findPrevious(term: string, searchOptions?: ISearchOptions): boolean;
  }
}

declare module '@xterm/xterm' {
  export interface ITerminalOptions {
    cursorBlink?: boolean;
    fontFamily?: string;
    fontSize?: number;
    lineHeight?: number;
    theme?: {
      background?: string;
      foreground?: string;
      cursor?: string;
      cursorAccent?: string;
      selectionBackground?: string;
    };
  }

  export interface ITerminalAddon {
    activate(terminal: Terminal): void;
    dispose(): void;
  }

  export class Terminal {
    constructor(options?: ITerminalOptions);
    element: HTMLElement;
    textarea: HTMLTextAreaElement;
    rows: number;
    cols: number;
    open(container: HTMLElement): void;
    write(data: string | Uint8Array): void;
    writeln(data: string | Uint8Array): void;
    clear(): void;
    reset(): void;
    focus(): void;
    blur(): void;
    resize(columns: number, rows: number): void;
    refresh(start: number, end: number): void;
    loadAddon(addon: ITerminalAddon): void;
    dispose(): void;
    scrollLines(amount: number): void;
    scrollToTop(): void;
    scrollToBottom(): void;
    onData(callback: (data: string) => void): void;
    onResize(callback: (size: { cols: number; rows: number }) => void): void;
    onKey(callback: (key: { key: string; domEvent: KeyboardEvent }) => void): void;
    onLineFeed(callback: () => void): void;
    onScroll(callback: (newPosition: number) => void): void;
    onSelectionChange(callback: () => void): void;
    onTitleChange(callback: (newTitle: string) => void): void;
    off(type: string, listener: (...args: any[]) => void): void;
  }
}

declare module '@xterm/addon-fit/dist/addon' {
  import { Terminal } from '@xterm/xterm';

  export class FitAddon implements ITerminalAddon {
    activate(terminal: Terminal): void;
    dispose(): void;
    fit(): void;
  }
}

declare module '@xterm/addon-web-links/dist/addon' {
  import { Terminal } from '@xterm/xterm';

  export class WebLinksAddon implements ITerminalAddon {
    constructor(handler?: (event: MouseEvent, uri: string) => void);
    activate(terminal: Terminal): void;
    dispose(): void;
  }
}

declare module '@xterm/addon-search/dist/addon' {
  import { Terminal } from '@xterm/xterm';

  export interface ISearchOptions {
    regex?: boolean;
    wholeWord?: boolean;
    caseSensitive?: boolean;
    incremental?: boolean;
  }

  export class SearchAddon implements ITerminalAddon {
    activate(terminal: Terminal): void;
    dispose(): void;
    findNext(term: string, searchOptions?: ISearchOptions): boolean;
    findPrevious(term: string, searchOptions?: ISearchOptions): boolean;
  }
}
