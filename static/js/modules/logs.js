// Container logs management
export async function viewLogs(containerId, serviceName) {
    if (!containerId || !serviceName) {
        console.error('Container ID and service name are required');
        return;
    }

    const logsContainer = document.getElementById(`logs-${serviceName}`);
    const terminalContainer = document.getElementById(`terminal-${serviceName}`);

    if (!logsContainer || !terminalContainer) {
        console.error('Required container elements not found');
        return;
    }

    // Hide terminal if visible
    terminalContainer.classList.add('hidden');

    // Toggle logs visibility
    if (logsContainer.classList.contains('hidden')) {
        try {
            const response = await fetch(`/container/${containerId}/logs`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            if (data.logs) {
                logsContainer.textContent = data.logs;
                logsContainer.classList.remove('hidden');
            } else {
                throw new Error('No logs data received');
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
            logsContainer.textContent = `Error fetching logs: ${error.message}`;
            logsContainer.classList.remove('hidden');
        }
    } else {
        logsContainer.classList.add('hidden');
    }
}
