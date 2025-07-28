// editor.js

let editorPanel, closePanelBtn, editorForm, linksTableBody;
let nodes, selectedNodeId;
let onSaveCallback, onCloseCallback, onLinkUpdateCallback;

function getDOMElements() {
    editorPanel = document.getElementById('editor-panel');
    closePanelBtn = document.getElementById('close-panel-btn');
    editorForm = document.getElementById('node-editor-form');
    linksTableBody = document.getElementById('links-table-body');
}

function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('node-id-input').value;
    const node = nodes.find(n => n.id === id);
    if (node) {
        const newName = document.getElementById('node-name-input').value;
        const newCommit = parseInt(document.getElementById('node-commit-input').value, 10) || 0;
        onSaveCallback(id, newName, newCommit);
    }
}

function handleLinksTableClick(e) {
    const sourceNode = nodes.find(n => n.id === selectedNodeId);
    if (!sourceNode) return;

    const weightBtn = e.target.closest('.link-weight-btn');
    const deleteBtn = e.target.closest('.link-delete-btn');

    if (weightBtn) {
        const targetId = weightBtn.dataset.targetId;
        const direction = weightBtn.dataset.direction;
        const currentWeight = sourceNode.links[targetId];
        const newWeight = direction === 'up' ? (currentWeight % 3) + 1 : ((currentWeight - 2 + 3) % 3) + 1;
        onLinkUpdateCallback('update-weight', sourceNode.id, targetId, newWeight);
    }

    if (deleteBtn) {
        const targetId = deleteBtn.dataset.targetId;
        onLinkUpdateCallback('delete-link', sourceNode.id, targetId);
    }
}

export function initEditor(callbacks) {
    getDOMElements();
    onSaveCallback = callbacks.onSave;
    onCloseCallback = callbacks.onClose;
    onLinkUpdateCallback = callbacks.onLinkUpdate;

    closePanelBtn.addEventListener('click', onCloseCallback);
    editorForm.addEventListener('submit', handleFormSubmit);
    linksTableBody.addEventListener('click', handleLinksTableClick);
}

export function renderEditorPanel(currentNodes, currentSelectedNodeId) {
    nodes = currentNodes;
    selectedNodeId = currentSelectedNodeId;
    const node = nodes.find(n => n.id === selectedNodeId);
    
    if (node) {
        editorPanel.classList.add('show');
        linksTableBody.innerHTML = '';
        document.getElementById('node-id-input').value = node.id;
        document.getElementById('node-name-input').value = node.name;
        document.getElementById('node-commit-input').value = node.commit;
        
        for (const targetNodeId in node.links) {
            const targetNode = nodes.find(n => n.id === targetNodeId);
            if (!targetNode) continue;

            const weight = node.links[targetNodeId];
            const row = document.createElement('tr');
            row.innerHTML = `
                <td title="${targetNode.name}">${targetNode.name}</td>
                <td>
                    <div class="link-weight-controls">
                        <span class="weight-value">${weight}</span>
                        <div class="weight-buttons">
                            <button class="link-weight-btn" data-target-id="${targetNodeId}" data-direction="up">
                                <svg class="pointer-events-none" width="12" height="12" viewBox="0 0 24 24"><path d="M12 4l-8 8h16z" fill="currentColor"/></svg>
                            </button>
                            <button class="link-weight-btn" data-target-id="${targetNodeId}" data-direction="down">
                                <svg class="pointer-events-none" width="12" height="12" viewBox="0 0 24 24"><path d="M12 20l8-8H4z" fill="currentColor"/></svg>
                            </button>
                        </div>
                    </div>
                </td>
                <td style="text-align: center;">
                    <button class="link-delete-btn" data-target-id="${targetNodeId}">
                        <svg class="pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </td>
            `;
            linksTableBody.appendChild(row);
        }
    } else {
        editorPanel.classList.remove('show');
    }
}

