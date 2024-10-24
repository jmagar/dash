// Container management functions
export async function updateContainer(containerId, serviceName) {
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
            // Reload the page after successful update
            location.reload();
        } else {
            throw new Error(data.message || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Error updating container:', error);
        alert(`Error updating container: ${error.message}`);
    }
}

export async function refreshContainerStatus(service) {
    if (!service) {
        console.error('Service element is required');
        return;
    }

    const containerId = service.getAttribute('data-container-id');
    if (!containerId) {
        console.debug('No container ID found for service');
        return;
    }

    try {
        const response = await fetch(`/container/${containerId}/status`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const status = await response.json();
        updateContainerUI(service, status);
    } catch (error) {
        console.error('Error updating status:', error);
        // Don't show UI error to avoid disrupting user experience
        // Just log it for debugging
    }
}

function updateContainerUI(service, status) {
    try {
        // Update status indicators
        const statusIndicator = service.querySelector('.status-indicator');
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
        updateMetric(service, '.resource-meter-fill.bg-blue-500', status.cpu_usage);
        updateMetric(service, '.resource-meter-fill.bg-green-500', status.memory_percent, status.memory_usage);

        // Update status text
        const statusText = service.querySelector('.text-gray-700');
        if (statusText) {
            statusText.innerHTML = `
                <span class="font-medium">State:</span> ${status.status}<br>
                <span class="font-medium">Health:</span> ${status.health}<br>
                <span class="font-medium">Restarts:</span> ${status.restarts}
            `;
        }
    } catch (error) {
        console.error('Error updating container UI:', error);
    }
}

function updateMetric(service, selector, value, displayValue = null) {
    const meter = service.querySelector(selector);
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
