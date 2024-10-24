import { RetryWebSocket } from './websocket.js';

class TerminalManager {
    constructor() {
        this.terminals = new Map();
    }

    async openTerminal(serverName, containerId, serviceName) {
        const modal = document.getElementById('terminal-modal');
        const title = document.getElementById('terminal-modal-title');
        const container = document.getElementById('terminal-container');

        if (!modal || !title || !container) {
            console.error('Required terminal modal elements not found');
            return;
        }

        title.textContent = `${serviceName} Terminal`;
        modal.classList.remove('hidden');

        if (!this.terminals.has(containerId)) {
            try {
                // Initialize terminal
                const term = new Terminal({
                    cursorBlink: true,
                    fontSize: 14,
                    fontFamily: 'Fira Code, monospace',
                    theme: {
                        background: '#1a1a1a',
                        foreground: '#e0e0e0'
                    }
                });

                const fitAddon = new FitAddon.FitAddon();
                term.loadAddon(fitAddon);

                // Clear container and open terminal
                container.innerHTML = '';
                term.open(container);
                fitAddon.fit();

                // Connect to container's terminal
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsHost = window.location.hostname;
                const wsPort = window.location.port || '5932'; // Use same port as HTTP
                const ws = new RetryWebSocket(
                    `${protocol}//${wsHost}:${wsPort}/ws/terminal/${serverName}/${containerId}`,
                    {
                        onopen: () => {
                            term.write('\r\n$ ');
                        },
                        onmessage: (event) => {
                            const data = JSON.parse(event.data);
                            if (data.type === 'terminal') {
                                term.write(data.data);
                            }
                        },
                        onclose: () => {
                            term.write('\r\nConnection closed\r\n');
                        },
                        onerror: (error) => {
                            console.error('WebSocket error:', error);
                            term.write('\r\nError: Failed to connect to terminal\r\n');
                        }
                    }
                );

                term.onData(data => {
                    ws.send(JSON.stringify({
                        type: 'input',
                        data: data
                    }));
                });

                this.terminals.set(containerId, {
                    terminal: term,
                    fitAddon: fitAddon,
                    websocket: ws
                });

                // Handle window resize
                const resizeObserver = new ResizeObserver(() => {
                    fitAddon.fit();
                });
                resizeObserver.observe(container);

            } catch (error) {
                console.error('Error initializing terminal:', error);
                container.textContent = `Error: ${error.message}`;
            }
        } else {
            const terminal = this.terminals.get(containerId);
            terminal.fitAddon.fit();
        }
    }

    toggleFullscreen() {
        const modal = document.getElementById('terminal-modal');
        if (modal) {
            modal.classList.toggle('modal-fullscreen');
            // Resize all terminals
            for (const terminal of this.terminals.values()) {
                terminal.fitAddon.fit();
            }
        }
    }

    closeTerminal() {
        const modal = document.getElementById('terminal-modal');
        const container = document.getElementById('terminal-container');
        if (modal) {
            modal.classList.remove('modal-fullscreen');
            modal.classList.add('hidden');
        }
        // Close all terminals and websockets
        for (const [containerId, terminal] of this.terminals.entries()) {
            if (terminal.websocket) {
                terminal.websocket.close();
            }
            if (terminal.terminal) {
                terminal.terminal.dispose();
            }
            this.terminals.delete(containerId);
        }
        if (container) {
            container.innerHTML = '';
        }
    }
}

export const terminalManager = new TerminalManager();
export const { openTerminal, toggleFullscreen, closeTerminal } = terminalManager;
