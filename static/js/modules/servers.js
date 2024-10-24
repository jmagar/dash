class ServerManager {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Toggle authentication method fields
        document.querySelectorAll('input[name="auth-method"]').forEach(radio => {
            radio.addEventListener('change', (event) => {
                const passwordGroup = document.getElementById('password-group');
                const keyGroup = document.getElementById('key-group');
                if (event.target.value === 'password') {
                    passwordGroup.classList.remove('hidden');
                    keyGroup.classList.add('hidden');
                } else {
                    passwordGroup.classList.add('hidden');
                    keyGroup.classList.remove('hidden');
                }
            });
        });
    }

    openServerModal() {
        const modal = document.getElementById('server-modal');
        modal.classList.remove('hidden');
    }

    closeServerModal() {
        const modal = document.getElementById('server-modal');
        modal.classList.add('hidden');
        document.getElementById('server-form').reset();
    }

    async submitServer(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const authMethod = formData.get('auth-method');

        const serverData = {
            name: formData.get('name'),
            host: formData.get('host'),
            port: parseInt(formData.get('port')),
            username: formData.get('username')
        };

        if (authMethod === 'password') {
            serverData.password = formData.get('password');
        } else {
            serverData.key_path = formData.get('key_path');
        }

        try {
            const response = await fetch('/servers/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(serverData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.status === 'success') {
                this.closeServerModal();
                location.reload();
            } else {
                throw new Error(result.message || 'Failed to add server');
            }
        } catch (error) {
            console.error('Error adding server:', error);
            alert(`Error adding server: ${error.message}`);
        }
    }

    async removeServer(serverName) {
        if (!confirm(`Are you sure you want to remove server ${serverName}?`)) {
            return;
        }

        try {
            const response = await fetch(`/servers/${encodeURIComponent(serverName)}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.status === 'success') {
                location.reload();
            } else {
                throw new Error(result.message || 'Failed to remove server');
            }
        } catch (error) {
            console.error('Error removing server:', error);
            alert(`Error removing server: ${error.message}`);
        }
    }
}

export const serverManager = new ServerManager();
export const { openServerModal, closeServerModal, submitServer, removeServer } = serverManager;
