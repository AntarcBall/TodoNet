// state.js
import { saveNodes as saveNodesToStorage, loadNodes as loadNodesFromStorage } from './storage.js';
import { trackCommitChange } from './acute.js';

let nodes = [];
let selectedNodeId = null;

function saveState() {
    saveNodesToStorage(nodes);
}

export function getNodes() {
    return nodes;
}

export function getSelectedNodeId() {
    return selectedNodeId;
}

export function initializeState() {
    const savedNodes = loadNodesFromStorage();
    if (savedNodes && savedNodes.length > 0) {
        nodes = savedNodes;
    } else {
        // Create a large canvas for initial setup
        const boardSize = 10000;
        const centerX = boardSize / 2;
        const centerY = boardSize / 2;
        nodes = [
            { id: 'app_dev', name: 'App Develop', commit: 50, x: centerX - 150, y: centerY, links: { 'ai_theory': 1 }, activation: 0, color: '#000000', starred: false, acute: false },
            { id: 'ai_theory', name: 'AI Theory', commit: 30, x: centerX + 150, y: centerY - 50, links: { 'app_dev': 2 }, activation: 0, color: '#000000', starred: false, acute: false },
            { id: 'exercise', name: '운동하기', commit: 80, x: centerX, y: centerY + 200, links: { 'app_dev': 1 }, activation: 0, color: '#000000', starred: false, acute: false }
        ];
    }
    // Ensure all loaded nodes have the necessary properties for backward compatibility
    nodes.forEach(node => {
        if (node.color === undefined) node.color = '#000000';
        if (node.starred === undefined) node.starred = false;
        if (node.acute === undefined) node.acute = false;
        if (node.activation === undefined) node.activation = 0;
    });
    saveState();
}

export function addNode(x, y) {
    const newNode = {
        id: `node_${Date.now()}`,
        name: '새로운 목표',
        commit: 0,
        x,
        y,
        links: {},
        activation: 0,
        color: '#000000',
        starred: false,
        acute: false
    };
    nodes.push(newNode);
    selectNode(newNode.id);
    saveState();
    return newNode;
}

export function deleteNode(id) {
    if (confirm('Are you sure you want to delete this node?')) {
        nodes = nodes.filter(n => n.id !== id);
        // Also remove any links pointing to the deleted node
        nodes.forEach(n => {
            if (n.links[id]) {
                delete n.links[id];
            }
        });
        deselectNode();
        saveState();
    }
}

export function selectNode(id) {
    selectedNodeId = id;
}

export function deselectNode() {
    selectedNodeId = null;
}

export function updateNodeContent(id, newName, newCommit) {
    const node = nodes.find(n => n.id === id);
    if (node) {
        const oldCommit = node.commit;
        node.name = newName;
        node.commit = newCommit;
        trackCommitChange(id, oldCommit, newCommit);
        saveState();
    }
}

export function updateNodePosition(id, x, y) {
    const node = nodes.find(n => n.id === id);
    if (node) {
        node.x = x;
        node.y = y;
    }
    // Note: Saving is deferred to a mouseup event in board.js to avoid excessive writes
}

export function saveNodePositions() {
    saveState();
}

export function updateNodeColor(id, newColor) {
    const node = nodes.find(n => n.id === id);
    if (node) {
        node.color = newColor;
        saveState();
    }
}

export function toggleNodeStar(id) {
    const node = nodes.find(n => n.id === id);
    if (node) {
        node.starred = !node.starred;
        saveState();
    }
}

export function toggleNodeAcute(id) {
    const node = nodes.find(n => n.id === id);
    if (node) {
        node.acute = !node.acute;
        saveState();
    }
}

export function updateLink(sourceId, targetId, weight) {
    const sourceNode = nodes.find(n => n.id === sourceId);
    if (sourceNode) {
        if (weight === null || weight === undefined) {
            delete sourceNode.links[targetId];
        } else {
            sourceNode.links[targetId] = weight;
        }
        saveState();
    }
}

export function setNodes(newNodes) {
    nodes = newNodes;
    saveState();
}
