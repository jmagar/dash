// Docker host management
export function showConnectionModal() {
    const modal = document.getElementById('connection-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

export function closeConnectionModal() {
    const modal = document.getElementById('connection-modal');
    if (modal) {
        modal.classList.add('hidden');
        const form = document.getElementById('connection-form');
        if (form) {
            form.reset();
        }
    }
}

export async function testConnection(event) {
    event.preventDefault();

    const form = event.target;
    if (!form) {
        console.error('Connection form not found');
        return;
    }

    const formData = new FormData(form);

    try {
        const response = await fetch('/docker/test-connection', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.status === 'success') {
            if (confirm('Connection successful! Would you like to add this host?')) {
                await addHost(formData);
            }
        } else {
            alert(`Connection failed: ${data.message}`);
        }
    } catch (error) {
        console.error('Error testing connection:', error);
        alert('Error testing connection');
    }
}

async function addHost(formData) {
    try {
        const response = await fetch('/docker/add-host', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.status === 'success') {
            closeConnectionModal();
            addHostButton(data.host);
        } else {
            alert(`Failed to add host: ${data.message}`);
        }
    } catch (error) {
        console.error('Error adding host:', error);
        alert('Error adding host');
    }
}

export function addHostButton(host) {
    const remoteHosts = document.getElementById('remote-hosts');
    if (!remoteHosts) {
        console.error('Remote hosts container not found');
        return;
    }

    const button = document.createElement('button');
    button.className = 'host-button';
    button.onclick = () => switchHost(host.name);
    button.innerHTML = `
        <span class="material-icons mr-1">cloud</span>
        ${host.name}
    `;
    remoteHosts.appendChild(button);
}

export async function switchHost(hostName) {
    try {
        const response = await fetch('/docker/switch-host', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ host: hostName })
        });

        const data = await response.json();

        if (data.status === 'success') {
            // Update active host button
            document.querySelectorAll('.host-button').forEach(button => {
                button.classList.remove('active');
                if (button.textContent.trim() === hostName) {
                    button.classList.add('active');
                }
            });

            // Reload page to show new host's containers
            location.reload();
        } else {
            alert(`Failed to switch host: ${data.message}`);
        }
    } catch (error) {
        console.error('Error switching host:', error);
        alert('Error switching host');
    }
}

// Add event listener for clicking outside modal
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('connection-modal');
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeConnectionModal();
            }
        });
    }
});
