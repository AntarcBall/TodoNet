// board.js
import { getNodes, getSelectedNodeId, selectNode, deselectNode, updateNodePosition, updateLink, saveNodePositions } from './state.js';
import { renderAll, updateTemporaryArrow, showSnackbar } from './ui.js';

const boardState = { panX: 0, panY: 0, zoom: 1, isPanning: false, lastMouseX: 0, lastMouseY: 0 };
const dragState = { isDraggingNode: false, draggedNodeId: null, offsetX: 0, offsetY: 0 };
const linkState = { isLinking: false, sourceNodeId: null };

let boardElement;

export function initBoard() {
    boardElement = document.getElementById('board');

    // Center the view on the content initially
    const boardRect = boardElement.getBoundingClientRect();
    const boardSize = 10000; // Must match the size set in ui.js
    boardState.panX = (boardRect.width / 2) - (boardSize / 2);
    boardState.panY = (boardRect.height / 2) - (boardSize / 2);

    addEventListeners();
}

function addEventListeners() {
    boardElement.addEventListener('mousedown', handleBoardMouseDown);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('mousemove', handleWindowMouseMove);
    boardElement.addEventListener('wheel', handleBoardWheel);
    boardElement.addEventListener('click', handleBoardClick);
    // Use event delegation for node events
    boardElement.addEventListener('mousedown', handleNodeMouseDown);
    boardElement.addEventListener('contextmenu', handleNodeContextMenu);
}

function handleBoardMouseDown(e) {
    // Pan the board if the background is clicked
    if ((e.target === boardElement || e.target.id === 'node-container') && e.button === 0) {
        boardElement.classList.add('grabbing');
        boardState.isPanning = true;
        boardState.lastMouseX = e.clientX;
        boardState.lastMouseY = e.clientY;
    }
}

function handleWindowMouseUp(e) {
    if (linkState.isLinking) {
        const targetEl = e.target.closest('.node');
        if (targetEl) {
            const targetNodeId = targetEl.dataset.id;
            const sourceNode = getNodes().find(n => n.id === linkState.sourceNodeId);
            if (sourceNode && targetNodeId !== linkState.sourceNodeId) {
                if (sourceNode.links[targetNodeId]) {
                    showSnackbar("Link already exists.");
                } else {
                    updateLink(linkState.sourceNodeId, targetNodeId, 1);
                }
            }
        }
    }

    if (dragState.isDraggingNode) {
        // Persist the final position of the dragged node
        saveNodePositions();
    }

    // Reset all interaction states
    boardElement.classList.remove('grabbing');
    boardState.isPanning = false;
    dragState.isDraggingNode = false;
    dragState.draggedNodeId = null;
    linkState.isLinking = false;
    linkState.sourceNodeId = null;
    updateTemporaryArrow(null);
    
    renderAll(getNodes(), getSelectedNodeId(), boardState);
}

function handleWindowMouseMove(e) {
    if (linkState.isLinking) {
        const boardRect = boardElement.getBoundingClientRect();
        const mouseX = (e.clientX - boardRect.left - boardState.panX) / boardState.zoom;
        const mouseY = (e.clientY - boardRect.top - boardState.panY) / boardState.zoom;
        const sourceNode = getNodes().find(n => n.id === linkState.sourceNodeId);
        updateTemporaryArrow(sourceNode, mouseX, mouseY);
    } else if (dragState.isDraggingNode) {
        const node = getNodes().find(n => n.id === dragState.draggedNodeId);
        if (node) {
            const newX = node.x + e.movementX / boardState.zoom;
            const newY = node.y + e.movementY / boardState.zoom;
            updateNodePosition(dragState.draggedNodeId, newX, newY);
            renderAll(getNodes(), getSelectedNodeId(), boardState);
        }
    } else if (boardState.isPanning) {
        boardState.panX += e.clientX - boardState.lastMouseX;
        boardState.panY += e.clientY - boardState.lastMouseY;
        boardState.lastMouseX = e.clientX;
        boardState.lastMouseY = e.clientY;
        renderAll(getNodes(), getSelectedNodeId(), boardState);
    }
}

function handleBoardWheel(e) {
    e.preventDefault();
    const zoomSpeed = 0.1;
    const oldZoom = boardState.zoom;
    
    const mouseX = e.clientX - boardElement.getBoundingClientRect().left;
    const mouseY = e.clientY - boardElement.getBoundingClientRect().top;

    const newZoom = oldZoom - e.deltaY * (zoomSpeed / 100);
    boardState.zoom = Math.max(0.2, Math.min(2, newZoom));

    // Zoom towards the mouse cursor
    boardState.panX = mouseX - (mouseX - boardState.panX) * (boardState.zoom / oldZoom);
    boardState.panY = mouseY - (mouseY - boardState.panY) * (boardState.zoom / oldZoom);

    renderAll(getNodes(), getSelectedNodeId(), boardState);
}

function handleBoardClick(e) {
    // Deselect node if clicking on the board background
    if (e.target === boardElement || e.target.id === 'node-container') {
        deselectNode();
        renderAll(getNodes(), getSelectedNodeId(), boardState);
    }
}

function handleNodeMouseDown(e) {
    const nodeEl = e.target.closest('.node');
    if (!nodeEl) return;

    e.stopPropagation();
    const nodeId = nodeEl.dataset.id;
    selectNode(nodeId);

    if (e.button === 0) { // Left mouse button for dragging
        dragState.isDraggingNode = true;
        dragState.draggedNodeId = nodeId;
        boardElement.classList.remove('grabbing');
    }
    renderAll(getNodes(), getSelectedNodeId(), boardState);
}

function handleNodeContextMenu(e) {
    const nodeEl = e.target.closest('.node');
    if (!nodeEl) return;

    e.preventDefault();
    e.stopPropagation();
    const nodeId = nodeEl.dataset.id;
    linkState.isLinking = true;
    linkState.sourceNodeId = nodeId;
}

// Expose boardState for other modules that might need it (like controls.js)
export function getBoardState() {
    return boardState;
}
