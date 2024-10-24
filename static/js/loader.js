// Initialize global namespace immediately
window.dockerDashboard = {
    terminal: {},
    logs: {},
    container: {},
    compose: {},
    host: {}
};

// Load modules in order
async function initializeModules() {
    try {
        // Import all modules first
        const [
            { RetryWebSocket },
            { terminals, openTerminal, toggleFullscreen, closeTerminal },
            { viewLogs },
            { updateContainer, refreshContainerStatus },
            { viewCompose, closeComposeModal },
            { showConnectionModal, closeConnectionModal, testConnection, addHostButton, switchHost }
        ] = await Promise.all([
            import('./modules/websocket.js'),
            import('./modules/terminal.js'),
            import('./modules/logs.js'),
            import('./modules/containers.js'),
            import('./modules/compose.js'),
            import('./modules/hosts.js')
        ]);

        // Assign methods to global namespace
        dockerDashboard.terminal = { openTerminal, toggleFullscreen, closeTerminal };
        dockerDashboard.logs = { viewLogs };
        dockerDashboard.container = { updateContainer };
        dockerDashboard.compose = { viewCompose, closeComposeModal };
        dockerDashboard.host = {
            showConnectionModal,
            closeConnectionModal,
            testConnection,
            addHostButton,
            switchHost
        };

        // Initialize event listeners
        initializeEventListeners(terminals, refreshContainerStatus, closeComposeModal, closeConnectionModal);

        console.log('Docker Dashboard modules initialized successfully');
    } catch (error) {
        console.error('Error initializing Docker Dashboard modules:', error);
    }
}

function initializeEventListeners(terminals, refreshContainerStatus, closeComposeModal, closeConnectionModal) {
    // Initialize tooltips
    document.querySelectorAll('[title]').forEach(element => {
        element.addEventListener('mouseenter', e => {
            const tooltip = document.createElement('div');
            tooltip.className = 'absolute bg-gray-900 text-white px-2 py-1 rounded text-xs';
            tooltip.textContent = e.target.title;
            tooltip.style.top = `${e.target.offsetTop - 25}px`;
            tooltip.style.left = `${e.target.offsetLeft}px`;
            document.body.appendChild(tooltip);
            e.target.addEventListener('mouseleave', () => tooltip.remove(), { once: true });
        });
    });

    // Handle window resize for terminals
    window.addEventListener('resize', () => {
        Object.values(terminals).forEach(({ fitAddon }) => {
            if (fitAddon) {
                fitAddon.fit();
            }
        });
    });

    // Close modals when clicking outside
    const composeModal = document.getElementById('compose-modal');
    if (composeModal) {
        composeModal.addEventListener('click', function(event) {
            if (event.target === this) {
                closeComposeModal();
            }
        });
    }

    const connectionModal = document.getElementById('connection-modal');
    if (connectionModal) {
        connectionModal.addEventListener('click', function(event) {
            if (event.target === this) {
                closeConnectionModal();
            }
        });
    }

    // Auto-refresh status every 30 seconds
    setInterval(() => {
        const services = document.querySelectorAll('[id^="service-"]');
        services.forEach(refreshContainerStatus);
    }, 30000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeModules);
} else {
    initializeModules();
}
