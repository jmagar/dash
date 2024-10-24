// Docker Compose file viewer
export function viewCompose(composeFile, stackName, composeContent) {
    const modal = document.getElementById('compose-modal');
    const title = document.getElementById('compose-modal-title');
    const content = document.getElementById('compose-content');

    if (!modal || !title || !content) {
        console.error('Required compose modal elements not found');
        return;
    }

    try {
        title.textContent = `${stackName} - ${composeFile}`;
        content.textContent = composeContent;

        // Ensure Prism is available
        if (typeof Prism !== 'undefined') {
            Prism.highlightElement(content);
        } else {
            console.warn('Prism.js not loaded, code highlighting disabled');
        }

        modal.classList.remove('hidden');
    } catch (error) {
        console.error('Error displaying compose file:', error);
    }
}

export function closeComposeModal() {
    const modal = document.getElementById('compose-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Add event listener for clicking outside modal
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('compose-modal');
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeComposeModal();
            }
        });
    }
});
