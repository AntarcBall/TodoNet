// main.js
import { initializeState, getNodes, getSelectedNodeId, addNode, deleteNode, selectNode, deselectNode, updateNodeContent, updateNodeColor, toggleNodeStar, toggleNodeAcute, updateLink, setNodes } from './state.js';
import { initUI, renderAll } from './ui.js';
import { initBoard, getBoardState } from './board.js';
import { initControls } from './controls.js';
import { initEditor } from './editor.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeState();
    initUI();
    initBoard();
    initControls();

    initEditor({
        onClose: () => {
            deselectNode();
            rerender();
        },
        onSave: (id, newName, newCommit) => {
            updateNodeContent(id, newName, newCommit);
            rerender();
        },
        onColorUpdate: (id, newColor) => {
            updateNodeColor(id, newColor);
            rerender();
        },
        onStarUpdate: (id) => {
            toggleNodeStar(id);
            rerender();
        },
        onAcuteUpdate: (id) => {
            toggleNodeAcute(id);
            rerender();
        },
        onLinkUpdate: (sourceId, targetId, weight) => {
            updateLink(sourceId, targetId, weight);
            rerender();
        },
        onDelete: (id) => {
            deleteNode(id);
            rerender();
        }
    });

    // Initial render
    rerender();
});

function rerender() {
    renderAll(getNodes(), getSelectedNodeId(), getBoardState());
}

// Expose functions to the console for debugging/utility
window.createNodesFromCommand = (commandString) => {
    const names = commandString.split(',').map(name => name.trim()).filter(name => name.length > 0);
    if (names.length === 0) {
        console.log("No valid node names provided.");
        return;
    }
    const boardState = getBoardState();
    const boardRect = document.getElementById('board').getBoundingClientRect();
    const base_x = ((boardRect.width / 2) - boardState.panX) / boardState.zoom - 75;
    const base_y = ((boardRect.height / 2) - boardState.panY) / boardState.zoom - 50;
    const nodeSpacing = 180;

    names.forEach((name, index) => {
        const x = base_x + (index * nodeSpacing);
        const y = base_y;
        addNode(x, y);
    });
    rerender();
    console.log(`${names.length} new node(s) created.`);
};

window.exportNodes = () => {
    const dataStr = JSON.stringify(getNodes(), null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todenet_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('Node data exported successfully.');
};
