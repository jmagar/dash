import { RetryWebSocket } from './websocket.js';

// Store terminal instances
export const terminals = {};

// Terminal management functions
export function openTerminal(containerId, serviceName) {
    const logsContainer = document.getElementById(`logs-${serviceName}`);
    const terminalContainer = document.getElementById(`terminal-${serviceName}`);

    // Hide logs if visible
    logsContainer.classList.add('hidden');

    // Toggle terminal visibility
    terminalContainer.classList.toggle('hidden');

    if (!terminalContainer.classList.contains('hidden')) {
        if (!terminals[serviceName]) {
            initializeTerminal(containerId, serviceName, terminalContainer);
        } else {
            // Resize existing terminal
            terminals[serviceName].fitAddon.fit();
        }
    } else {
        closeTerminal(serviceName);
    }
}

export function toggleFullscreen(serviceName) {
    const terminal = terminals[serviceName];
    if (terminal) {
        const container = terminal.container;
        container.classList.toggle('terminal-fullscreen');
        terminal.fitAddon.fit();
    }
}

export function closeTerminal(serviceName) {
    const terminal = terminals[serviceName];
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

function initializeTerminal(containerId, serviceName, terminalContainer) {
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
    const header = createTerminalHeader(serviceName);
    terminalContainer.appendChild(header);

    // Create terminal container
    const terminalElement = document.createElement('div');
    terminalElement.className = 'terminal';
    terminalContainer.appendChild(terminalElement);

    term.open(terminalElement);
    fitAddon.fit();

    // Store terminal instance
    terminals[serviceName] = {
        terminal: term,
        fitAddon: fitAddon,
        container: terminalContainer,
        element: terminalElement
    };

    // Connect to container's terminal
    connectTerminalWebSocket(containerId, serviceName, term);
}

function createTerminalHeader(serviceName) {
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
    return header;
}

function connectTerminalWebSocket(containerId, serviceName, term) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const port = '5001';  // WebSocket port
    const ws = new RetryWebSocket(
        `${protocol}//${window.location.hostname}:${port}/container/${containerId}/terminal`,
        {
            maxRetries: 5,
            retryDelay: 1000,
            onopen: () => {
                term.write('\r\n$ ');
            },
            onmessage: (event) => {
                term.write(event.data);
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
        ws.send(data);
    });

    terminals[serviceName].websocket = ws;
}
