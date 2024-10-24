import { RetryWebSocket } from './websocket.js';

class ContainerManager {
    constructor() {
        this.metricsWebsockets = new Map();
        this.logsWebsockets = new Map();
        this.terminalWebsockets = new Map();
        this.eventWebsocket = null;
        this.initializeEventStream();
    }

    initializeEventStream() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const port = '5001';
        this.eventWebsocket = new RetryWebSocket(
            `${protocol}//${window.location.hostname}:${port}/events`,
            {
                onmessage: (event) => this.handleEvent(JSON.parse(event.data))
            }
        );
    }

    handleEvent(event) {
        if (event.Type === 'container') {
            this.refreshContainerStatus(event.Actor.ID);
        }
    }

    async updateContainer(containerId, serviceName) {
        if (!containerId || !serviceName) {
            console.error('Container ID and service name are required');
            return;
        }

        if (!confirm(`Are you sure you want to update ${serviceName}?`)) {
            return;
        }

        try {
            const response = await fetch(`/container/${containerId}/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.status === 'success') {
                location.reload();
            } else {
                throw new Error(data.message || 'Unknown error occurred');
            }
        } catch (error) {
            console.error('Error updating container:', error);
            alert(`Error updating container: ${error.message}`);
        }
    }

    async refreshContainerStatus(containerId) {
        try {
            const response = await fetch(`/container/${containerId}/status`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const status = await response.json();
            this.updateContainerUI(containerId, status);
        } catch (error) {
            console.error('Error updating status:', error);
        }
    }

    updateContainerUI(containerId, status) {
        const container = document.querySelector(`[data-container-id="${containerId}"]`);
        if (!container) return;

        // Update status indicators
        const statusIndicator = container.querySelector('.status-indicator');
        if (statusIndicator) {
            if (status.running) {
                statusIndicator.className = 'status-indicator status-running';
                statusIndicator.title = 'Running';
            } else {
                statusIndicator.className = 'status-indicator status-stopped';
                statusIndicator.title = 'Stopped';
            }
        }

        // Update metrics
        this.updateMetric(container, '.resource-meter-fill.bg-blue-500', status.cpu_usage);
        this.updateMetric(container, '.resource-meter-fill.bg-green-500', status.memory_percent, status.memory_usage);

        // Update status text
        const statusText = container.querySelector('.text-gray-700');
        if (statusText) {
            statusText.innerHTML = `
                <span class="font-medium">State:</span> ${status.status}<br>
                <span class="font-medium">Health:</span> ${status.health}<br>
                <span class="font-medium">Restarts:</span> ${status.restarts}
            `;
        }
    }

    updateMetric(container, selector, value, displayValue = null) {
        const meter = container.querySelector(selector);
        if (meter) {
            const numericValue = parseFloat(value);
            if (!isNaN(numericValue)) {
                meter.style.width = `${numericValue}%`;
                const textElement = meter.closest('.bg-gray-50')?.querySelector('p');
                if (textElement) {
                    textElement.textContent = displayValue || value;
                }
            }
        }
    }

    startMetricsStream(containerId) {
        if (this.metricsWebsockets.has(containerId)) {
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const port = '5001';
        const ws = new RetryWebSocket(
            `${protocol}//${window.location.hostname}:${port}/metrics/${containerId}`,
            {
                onmessage: (event) => {
                    const data = JSON.parse(event.data);
                    if (data.type === 'metrics') {
                        this.updateContainerUI(containerId, data.data);
                    }
                }
            }
        );
        this.metricsWebsockets.set(containerId, ws);
    }

    stopMetricsStream(containerId) {
        const ws = this.metricsWebsockets.get(containerId);
        if (ws) {
            ws.close();
            this.metricsWebsockets.delete(containerId);
        }
    }

    async viewLogs(containerId, serviceName) {
        const logsContainer = document.getElementById(`logs-${serviceName}`);
        const terminalContainer = document.getElementById(`terminal-${serviceName}`);

        // Hide terminal if visible
        terminalContainer.classList.add('hidden');

        // Toggle logs visibility
        if (logsContainer.classList.contains('hidden')) {
            try {
                // Start WebSocket connection for live logs
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const port = '5001';
                const ws = new RetryWebSocket(
                    `${protocol}//${window.location.hostname}:${port}/logs/${containerId}`,
                    {
                        onmessage: (event) => {
                            const data = JSON.parse(event.data);
                            if (data.type === 'log') {
                                this.appendLog(logsContainer, data.data);
                            }
                        }
                    }
                );
                this.logsWebsockets.set(containerId, ws);
                logsContainer.classList.remove('hidden');
            } catch (error) {
                console.error('Error setting up logs stream:', error);
                logsContainer.textContent = 'Error setting up logs stream';
                logsContainer.classList.remove('hidden');
            }
        } else {
            const ws = this.logsWebsockets.get(containerId);
            if (ws) {
                ws.close();
                this.logsWebsockets.delete(containerId);
            }
            logsContainer.classList.add('hidden');
        }
    }

    appendLog(container, log) {
        const wasScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 1;
        container.textContent += log + '\n';
        if (wasScrolledToBottom) {
            container.scrollTop = container.scrollHeight;
        }
    }
}

export const containerManager = new ContainerManager();
export const { updateContainer, refreshContainerStatus, viewLogs } = containerManager;
