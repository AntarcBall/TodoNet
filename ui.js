// ui.js
import { config } from './config.js';
import { renderEditorPanel } from './editor.js';
import { renderHistoryPanel } from './history.js';

let nodeContainer, svgLayer, tempArrow, gridBackground, snackbar, starredNodesTableBody;

export function initUI() {
    // Cache DOM elements
    nodeContainer = document.getElementById('node-container');
    svgLayer = document.getElementById('arrow-svg-layer');
    tempArrow = document.getElementById('temp-arrow');
    gridBackground = document.getElementById('grid-background');
    snackbar = document.getElementById('snackbar');
    starredNodesTableBody = document.querySelector('#starred-nodes-table tbody');

    // Set up the main canvas size
    const boardSize = 10000;
    nodeContainer.style.width = `${boardSize}px`;
    nodeContainer.style.height = `${boardSize}px`;

    defineSvgDefs();
}

export function renderAll(nodes, selectedNodeId, boardState) {
    requestAnimationFrame(() => {
        renderNodes(nodes, selectedNodeId);
        renderArrows(nodes);
        renderEditorPanel(nodes, selectedNodeId);
        renderStarredNodesPanel(nodes);
        renderHistoryPanel(nodes.filter(n => n.acute));
        updateNodeContainerTransform(boardState);
    });
}

function renderNodes(nodes, selectedNodeId) {
    // Clear existing nodes
    nodeContainer.innerHTML = ''; 
    // Re-add the SVG layer which gets cleared by innerHTML
    nodeContainer.appendChild(svgLayer);

    nodes.forEach(node => {
        const nodeEl = document.createElement('div');
        nodeEl.className = 'node';
        nodeEl.style.left = `${node.x}px`;
        nodeEl.style.top = `${node.y}px`;
        nodeEl.dataset.id = node.id;
        if (node.id === selectedNodeId) nodeEl.classList.add('selected');

        // Set custom colors
        if (node.color) {
            nodeEl.style.setProperty('--node-name-color', node.color);
        }

        // Set dynamic background based on activation
        const activationRatio = Math.min(node.activation / config.visuals.maxActivation, 1);
        const endColor = `rgba(${config.visuals.highlightRgb}, ${activationRatio})`;
        nodeEl.style.setProperty('--node-end-color', endColor);

        nodeEl.innerHTML = `
            <h3>${node.name}</h3>
            <div class="commit-value">${node.commit}</div>
            <div class="activation-value">${node.activation.toFixed(2)}</div>
            ${node.starred ? `<div class="star-indicator"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div>` : ''}
        `;

        // Style for acute tasks
        if (node.acute) {
            const commitValueEl = nodeEl.querySelector('.commit-value');
            commitValueEl.style.color = config.visuals.acuteTaskColor;
            commitValueEl.style.fontSize = '2.4375rem'; // 1.875rem * 1.3
        }
        
        nodeContainer.appendChild(nodeEl);
    });
}

function renderArrows(nodes) {
    Array.from(svgLayer.querySelectorAll('.arrow-path')).forEach(path => path.remove());

    nodes.forEach(sourceNode => {
        const sourceEl = nodeContainer.querySelector(`[data-id="${sourceNode.id}"]`);
        if (!sourceEl) return;

        const sourceX = sourceNode.x + sourceEl.offsetWidth / 2;
        const sourceY = sourceNode.y + sourceEl.offsetHeight / 2;

        for (const targetNodeId in sourceNode.links) {
            const targetNode = nodes.find(n => n.id === targetNodeId);
            if (!targetNode) continue;

            const targetEl = nodeContainer.querySelector(`[data-id="${targetNodeId}"]`);
            if (!targetEl) continue;

            const targetX = targetNode.x + targetEl.offsetWidth / 2;
            const targetY = targetNode.y + targetEl.offsetHeight / 2;

            const isBidirectional = targetNode.links[sourceNode.id];
            let offsetX = 0, offsetY = 0;
            if (isBidirectional) {
                const d_dx = targetX - sourceX;
                const d_dy = targetY - sourceY;
                const norm = Math.sqrt(d_dx * d_dx + d_dy * d_dy);
                if (norm > 0) {
                    offsetX = (-d_dy / norm) * config.links.parallelOffset;
                    offsetY = (d_dx / norm) * config.links.parallelOffset;
                }
            }

            const x1 = sourceX + offsetX;
            const y1 = sourceY + offsetY;
            const x2 = targetX + offsetX;
            const y2 = targetY + offsetY;

            const dx_centers = x2 - x1;
            const dy_centers = y2 - y1;
            const distCenters = Math.sqrt(dx_centers * dx_centers + dy_centers * dy_centers);
            const unitDx = distCenters === 0 ? 0 : dx_centers / distCenters;
            const unitDy = distCenters === 0 ? 0 : dy_centers / distCenters;

            const radius1 = sourceEl.offsetWidth / 2;
            const radius2 = targetEl.offsetWidth / 2;

            const actualArrowStartX = x1 + radius1 * unitDx;
            const actualArrowStartY = y1 + radius1 * unitDy;
            const actualArrowEndX = x2 - radius2 * unitDx;
            const actualArrowEndY = y2 - radius2 * unitDy;

            const actualArrowLength = Math.sqrt(Math.pow(actualArrowEndX - actualArrowStartX, 2) + Math.pow(actualArrowEndY - actualArrowStartY, 2));

            const lineStartX = actualArrowStartX + config.links.startRatio * actualArrowLength * unitDx;
            const lineStartY = actualArrowStartY + config.links.startRatio * actualArrowLength * unitDy;
            const lineEndX = actualArrowStartX + config.links.endRatio * actualArrowLength * unitDx;
            const lineEndY = actualArrowStartY + config.links.endRatio * actualArrowLength * unitDy;

            const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            arrow.setAttribute('class', 'arrow-path');

            const weight = sourceNode.links[targetNodeId];
            const strokeWidth = config.links.baseWidth * weight;
            arrow.setAttribute('d', `M ${lineStartX} ${lineStartY} L ${lineEndX} ${lineEndY}`);
            arrow.setAttribute('stroke', `url(#arrow-gradient)`);
            arrow.setAttribute('stroke-width', String(strokeWidth));
            arrow.setAttribute('fill', 'none');
            arrow.setAttribute('marker-end', 'url(#arrowhead)');

            svgLayer.appendChild(arrow);
        }
    });
}

function renderStarredNodesPanel(nodes) {
    starredNodesTableBody.innerHTML = '';
    const starredNodes = nodes.filter(node => node.starred);

    if (starredNodes.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="2">No starred nodes yet.</td>`;
        starredNodesTableBody.appendChild(row);
        return;
    }

    starredNodes
        .sort((a, b) => b.activation - a.activation)
        .forEach(node => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${node.name}</td>
                <td>${node.activation.toFixed(2)}</td>
            `;
            starredNodesTableBody.appendChild(row);
        });
}

export function updateNodeContainerTransform(boardState) {
    const transform = `translate(${boardState.panX}px, ${boardState.panY}px) scale(${boardState.zoom})`;
    nodeContainer.style.transform = transform;

    const gridSize = 40 * boardState.zoom;
    gridBackground.style.backgroundSize = `${gridSize}px ${gridSize}px`;
    gridBackground.style.backgroundPosition = `${boardState.panX}px ${boardState.panY}px`;

    const strokeWidth = 2 / boardState.zoom;
    const dashArray = `${5 / boardState.zoom} ${5 / boardState.zoom}`;
    tempArrow.setAttribute('stroke-width', String(strokeWidth));
    tempArrow.setAttribute('stroke-dasharray', dashArray);
}

export function updateTemporaryArrow(sourceNode, mouseX, mouseY) {
    if (!sourceNode) {
        tempArrow.style.display = 'none';
        return;
    }
    const sourceEl = nodeContainer.querySelector(`[data-id="${sourceNode.id}"]`);
    if (!sourceEl) return;

    const startX = sourceNode.x + sourceEl.offsetWidth / 2;
    const startY = sourceNode.y + sourceEl.offsetHeight / 2;

    tempArrow.setAttribute('x1', String(startX));
    tempArrow.setAttribute('y1', String(startY));
    tempArrow.setAttribute('x2', String(mouseX));
    tempArrow.setAttribute('y2', String(mouseY));
    tempArrow.style.display = 'block';
}

export function showSnackbar(message) {
    snackbar.textContent = message;
    snackbar.classList.add('show');
    setTimeout(() => snackbar.classList.remove('show'), 3000);
}

function defineSvgDefs() {
    const defs = svgLayer.querySelector('defs');
    if (defs.querySelector('#arrowhead')) return; // Avoid re-defining

    // Arrowhead Marker
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '5');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerUnits', 'userSpaceOnUse');
    marker.setAttribute('orient', 'auto-start-reverse');
    const arrowheadSize = config.links.arrowheadSize;
    marker.setAttribute('markerWidth', String(arrowheadSize));
    marker.setAttribute('markerHeight', String(arrowheadSize));
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 5, 0 10');
    polygon.setAttribute('fill', config.links.arrowheadColor);
    marker.appendChild(polygon);
    defs.appendChild(marker);

    // Reusable Arrow Gradient
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'arrow-gradient');
    gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '0%');
    const styles = getComputedStyle(document.documentElement);
    const startColor = styles.getPropertyValue('--arrow-gradient-start-color').trim();
    const endColor = styles.getPropertyValue('--arrow-gradient-end-color').trim();
    gradient.innerHTML = `<stop offset="0%" stop-color="${startColor}" /><stop offset="100%" stop-color="${endColor}" />`;
    defs.appendChild(gradient);
}
