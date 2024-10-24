import { RetryWebSocket } from './websocket.js';

class TerminalManager {
    constructor() {
        this.terminals = new Map();
    }

    async openTerminal(containerId, serviceName) {
        const logsContainer = document.getElementById(`logs-${serviceName}`);
        const terminalContainer = document.getElementById(`terminal-${serviceName}`);

        // Hide logs if visible
        logsContainer.classList.add('hidden');

        // Toggle terminal visibility
        terminalContainer.classList.toggle('hidden');

        if (!terminalContainer.classList.contains('hidden')) {
            if (!this.terminals.has(serviceName)) {
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

                // Create terminal header
                const header = document.createElement('div');
                header.className = 'terminal-header';
                header.innerHTML = `
                    <div class="terminal-title">${serviceName}</div>
                    <div class="terminal-controls">
                        <button class="terminal-button" onclick="dockerDashboard.terminal.toggleFullscreen('${serviceName}')">
                            <span class="material-icons">fullscreen</span>
                        </button>
                        <button class="terminal-button" onclick="dockerDashboard.terminal.closeTerminal('${serviceName}')">
                            <span class="material-icons">close</span>
                        </button>
                    </div>
                `;
                terminalContainer.appendChild(header);

                // Create terminal container
                const terminalElement = document.createElement('div');
                terminalElement.className = 'terminal';
                terminalContainer.appendChild(terminalElement);

                term.open(terminalElement);
                fitAddon.fit();

                // Connect to container's terminal
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const port = '5001';
                const ws = new RetryWebSocket(
                    `${protocol}//${window.location.hostname}:${port}/terminal/${containerId}`,
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

                this.terminals.set(serviceName, {
                    terminal: term,
                    fitAddon: fitAddon,
                    container: terminalContainer,
                    element: terminalElement,
                    websocket: ws
                });
            } else {
                // Resize existing terminal
                const terminal = this.terminals.get(serviceName);
                terminal.fitAddon.fit();
            }
        } else {
            this.closeTerminal(serviceName);
        }
    }

    toggleFullscreen(serviceName) {
        const terminal = this.terminals.get(serviceName);
        if (terminal) {
            const container = terminal.container;
            container.classList.toggle('terminal-fullscreen');
            terminal.fitAddon.fit();
        }
    }

    closeTerminal(serviceName) {
        const terminal = this.terminals.get(serviceName);
        if (terminal) {
            if (terminal.websocket) {
                terminal.websocket.close();
            }
            terminal.container.classList.add('hidden');
            if (terminal.container.classList.contains('terminal-fullscreen')) {
                terminal.container.classList.remove('terminal-fullscreen');
            }
        }
    }
}

export const terminalManager = new TerminalManager();
export const { openTerminal, toggleFullscreen, closeTerminal } = terminalManager;
