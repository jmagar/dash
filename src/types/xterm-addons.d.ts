import type { Terminal } from 'xterm';

declare module '@xterm/addon-fit' {
  declare class FitAddon {
    constructor();
    activate(terminal: Terminal): void;
    dispose(): void;
    fit(): void;
  }
  export { FitAddon };
}

declare module '@xterm/addon-web-links' {
  declare class WebLinksAddon {
    constructor();
    activate(terminal: Terminal): void;
    dispose(): void;
  }
  export { WebLinksAddon };
}

// Extend the modules to include their types
declare module '@xterm/addon-fit' {
  export interface FitAddon {
    fit(): void;
  }
}

declare module '@xterm/addon-web-links' {
  export interface WebLinksAddon {
    dispose(): void;
  }
}
