class ServerManager {
    constructor() {
        this.initializeEventListeners();
        this.suggestedServers = [];
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

    async loadSuggestedServers() {
        try {
            const response = await fetch('/servers/suggested');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.suggestedServers = data.servers;
            this.updateSuggestedServersList();
        } catch (error) {
            console.error('Error loading suggested servers:', error);
        }
    }

    updateSuggestedServersList() {
        const suggestedList = document.getElementById('suggested-servers');
        if (!suggestedList) return;

        suggestedList.innerHTML = '<option value="">Select a suggested server...</option>';
        this.suggestedServers.forEach(server => {
            const option = document.createElement('option');
            option.value = server.name;
            option.textContent = `${server.name} (${server.host})`;
            suggestedList.appendChild(option);
        });
    }

    handleSuggestedServerSelect(event) {
        const selectedName = event.target.value;
        if (!selectedName) return;

        const server = this.suggestedServers.find(s => s.name === selectedName);
        if (!server) return;

        // Fill form with selected server details
        document.getElementById('server-name').value = server.name;
        document.getElementById('server-host').value = server.host;
        document.getElementById('server-port').value = server.port;
        document.getElementById('server-username').value = server.username;

        if (server.key_path) {
            document.getElementById('auth-key').checked = true;
            document.getElementById('server-key').value = server.key_path;
            document.getElementById('password-group').classList.add('hidden');
            document.getElementById('key-group').classList.remove('hidden');
        }
    }

    async openServerModal() {
        const modal = document.getElementById('server-modal');
        modal.classList.remove('hidden');
        await this.loadSuggestedServers();
    }

    closeServerModal() {
        const modal = document.getElementById('server-modal');
        modal.classList.add('hidden');
        document.getElementById('server-form').reset();
        const suggestedList = document.getElementById('suggested-servers');
        if (suggestedList) {
            suggestedList.value = '';
        }
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
