import { viewCompose, closeComposeModal } from './modules/compose.js';
import { updateContainer, refreshContainerStatus, viewLogs } from './modules/containers.js';
import { openTerminal, toggleFullscreen, closeTerminal } from './modules/terminal.js';
import { openServerModal, closeServerModal, submitServer, removeServer } from './modules/servers.js';

// Initialize global namespace
window.dockerDashboard = {
    compose: {
        viewCompose,
        closeComposeModal
    },
    container: {
        updateContainer,
        refreshContainerStatus
    },
    logs: {
        viewLogs
    },
    terminal: {
        openTerminal,
        toggleFullscreen,
        closeTerminal
    },
    servers: {
        openServerModal,
        closeServerModal,
        submitServer,
        removeServer
    }
};

// Initialize tooltips and other UI elements
document.addEventListener('DOMContentLoaded', () => {
    console.log('Docker Dashboard initialized');
});
