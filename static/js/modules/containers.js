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
        const wsHost = window.location.hostname;
        const wsPort = window.location.port || '5932'; // Use same port as HTTP
        this.eventWebsocket = new RetryWebSocket(
            `${protocol}//${wsHost}:${wsPort}/ws/events`,
            {
                onmessage: (event) => this.handleEvent(JSON.parse(event.data))
            }
        );
    }

    handleEvent(event) {
        if (event.Type === 'container') {
            this.refreshContainerStatus(event.server_name, event.Actor.ID);
        }
    }

    async updateContainer(serverName, containerId, serviceName) {
        if (!containerId || !serviceName) {
            console.error('Container ID and service name are required');
            return;
        }

        if (!confirm(`Are you sure you want to update ${serviceName}?`)) {
            return;
        }

        try {
            const response = await fetch(`/container/${serverName}/${containerId}/update`, {
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

    async refreshContainerStatus(serverName, containerId) {
        try {
            const response = await fetch(`/container/${serverName}/${containerId}/status`);
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

    async viewLogs(serverName, containerId, serviceName) {
        const modal = document.getElementById('logs-modal');
        const title = document.getElementById('logs-modal-title');
        const container = document.getElementById('logs-container');

        if (!modal || !title || !container) {
            console.error('Required logs modal elements not found');
            return;
        }

        try {
            title.textContent = `${serviceName} Logs`;
            container.textContent = 'Loading logs...';
            modal.classList.remove('hidden');

            const response = await fetch(`/container/${serverName}/${containerId}/logs`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            container.textContent = data.logs || 'No logs available';

            // Start WebSocket connection for live logs
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsHost = window.location.hostname;
            const wsPort = window.location.port || '5932'; // Use same port as HTTP
            const ws = new RetryWebSocket(
                `${protocol}//${wsHost}:${wsPort}/ws/logs/${serverName}/${containerId}`,
                {
                    onmessage: (event) => {
                        const data = JSON.parse(event.data);
                        if (data.type === 'log') {
                            this.appendLog(container, data.data);
                        }
                    }
                }
            );
            this.logsWebsockets.set(containerId, ws);
        } catch (error) {
            console.error('Error setting up logs stream:', error);
            container.textContent = `Error: ${error.message}`;
        }
    }

    appendLog(container, log) {
        const wasScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 1;
        container.textContent += log + '\n';
        if (wasScrolledToBottom) {
            container.scrollTop = container.scrollHeight;
        }
    }

    closeLogs() {
        const modal = document.getElementById('logs-modal');
        const container = document.getElementById('logs-container');
        if (modal) {
            modal.classList.add('hidden');
        }
        if (container) {
            container.textContent = '';
        }
        // Close all log websockets
        for (const [containerId, ws] of this.logsWebsockets.entries()) {
            ws.close();
            this.logsWebsockets.delete(containerId);
        }
    }
}

export const containerManager = new ContainerManager();
export const { updateContainer, refreshContainerStatus, viewLogs, closeLogs } = containerManager;
