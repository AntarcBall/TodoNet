import { initEditor, renderEditorPanel } from './editor.js';
import { saveNodes, loadNodes } from './storage.js';
import { config } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const board = document.getElementById('board');
    const nodeContainer = document.getElementById('node-container');
    const addNodeBtn = document.getElementById('add-node-btn');
    const calcActivationBtn = document.getElementById('calc-activation-btn');
    const svgLayer = document.getElementById('arrow-svg-layer');
    const gradientDefs = document.getElementById('gradient-defs');
    const tempArrow = document.getElementById('temp-arrow');
    const gridBackground = document.getElementById('grid-background');
    const snackbar = document.getElementById('snackbar');

    // State
    let nodes = [];
    let selectedNodeId = null;
    const boardState = { panX: 0, panY: 0, zoom: 1, isPanning: false, lastMouseX: 0, lastMouseY: 0 };
    const dragState = { isDraggingNode: false, draggedNodeId: null, offsetX: 0, offsetY: 0 };
    const linkState = { isLinking: false, sourceNodeId: null };

    // --- RENDER FUNCTIONS ---
    function renderAll() {
        requestAnimationFrame(() => {
            renderNodes();
            renderArrows();
            renderEditorPanel(nodes, selectedNodeId);
        });
    }

    function renderNodes() {
        Array.from(nodeContainer.querySelectorAll('.node')).forEach(el => el.remove());
        nodes.forEach(node => {
            const nodeEl = document.createElement('div');
            nodeEl.className = 'node';
            nodeEl.style.left = `${node.x}px`;
            nodeEl.style.top = `${node.y}px`;
            nodeEl.dataset.id = node.id;
            if (node.id === selectedNodeId) nodeEl.classList.add('selected');
            
            nodeEl.innerHTML = `
                <h3>${node.name}</h3>
                <div class="commit-value">${node.commit}</div>
                <div class="activation-value">${node.activation.toFixed(2)}</div>
            `;
            
            nodeEl.addEventListener('click', e => { e.stopPropagation(); handleNodeSelection(node.id); });
            nodeEl.addEventListener('mousedown', e => handleNodeMouseDown(e, node.id));
            nodeEl.addEventListener('contextmenu', e => handleNodeContextMenu(e, node.id));
            nodeContainer.appendChild(nodeEl);
        });
    }

    function renderArrows() {
        Array.from(svgLayer.querySelectorAll('.arrow-path')).forEach(path => path.remove());
        gradientDefs.innerHTML = '';

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
                
                const gradientId = `grad-${sourceNode.id}-to-${targetNode.id}`;
                const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
                gradient.setAttribute('id', gradientId);
                gradient.setAttribute('x1', String(sourceX));
                gradient.setAttribute('y1', String(sourceY));
                gradient.setAttribute('x2', String(targetX));
                gradient.setAttribute('y2', String(targetY));
                gradient.setAttribute('gradientUnits', 'userSpaceOnUse');

                const styles = getComputedStyle(document.documentElement);
                const startColor = styles.getPropertyValue('--arrow-gradient-start-color').trim();
                const endColor = styles.getPropertyValue('--arrow-gradient-end-color').trim();
                
                gradient.innerHTML = `
                    <stop offset="0%" style="stop-color:${startColor}" />
                    <stop offset="30%" style="stop-color:${startColor}" />
                    <stop offset="70%" style="stop-color:${endColor}" />
                    <stop offset="100%" style="stop-color:${endColor}" />
                `;
                gradientDefs.appendChild(gradient);

                const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                arrow.setAttribute('class', 'arrow-path');
                
                const isBidirectional = targetNode.links[sourceNode.id];
                
                let startX_offset = sourceX;
                let startY_offset = sourceY;
                let endX_offset = targetX;
                let endY_offset = targetY;

                if (isBidirectional) {
                    const dx = targetX - sourceX;
                    const dy = targetY - sourceY;
                    const norm = Math.sqrt(dx * dx + dy * dy);
                    if (norm > 0) {
                        const nx = -dy / norm;
                        const ny = dx / norm;
                        const offset = config.links.parallelOffset;
                        
                        startX_offset += offset * nx;
                        startY_offset += offset * ny;
                        endX_offset += offset * nx;
                        endY_offset += offset * ny;
                    }
                }

                const weight = sourceNode.links[targetNodeId];
                const strokeWidth = config.links.baseWidth * weight;

                const pathData = `M ${startX_offset} ${startY_offset} L ${endX_offset} ${endY_offset}`;
                
                arrow.setAttribute('d', pathData);
                arrow.setAttribute('stroke', `url(#${gradientId})`);
                arrow.setAttribute('stroke-width', String(strokeWidth));
                arrow.setAttribute('fill', 'none');
                svgLayer.appendChild(arrow);
            }
        });
    }
    
    function updateNodeContainerTransform() {
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

    function showSnackbar(message) {
        snackbar.textContent = message;
        snackbar.classList.add('show');
        setTimeout(() => snackbar.classList.remove('show'), 3000);
    }

    // --- EVENT HANDLERS & LOGIC ---

    function handleNodeSelection(nodeId) {
        selectedNodeId = nodeId;
        renderAll();
    }

    function deselectAll() {
        selectedNodeId = null;
        renderAll();
    }

    function handleNodeMouseDown(e, nodeId) {
        e.stopPropagation();
        if (e.button === 0) {
            dragState.isDraggingNode = true;
            dragState.draggedNodeId = nodeId;
            const node = nodes.find(n => n.id === nodeId);
            dragState.offsetX = (e.clientX / boardState.zoom) - node.x;
            dragState.offsetY = (e.clientY / boardState.zoom) - node.y;
            board.classList.remove('grabbing');
        }
    }

    function handleNodeContextMenu(e, nodeId) {
        e.preventDefault();
        e.stopPropagation();
        linkState.isLinking = true;
        linkState.sourceNodeId = nodeId;
        const sourceNode = nodes.find(n => n.id === nodeId);
        const sourceEl = nodeContainer.querySelector(`[data-id="${nodeId}"]`);

        const startX = sourceNode.x + sourceEl.offsetWidth / 2;
        const startY = sourceNode.y + sourceEl.offsetHeight / 2;

        tempArrow.setAttribute('x1', String(startX));
        tempArrow.setAttribute('y1', String(startY));
        tempArrow.setAttribute('x2', String(startX));
        tempArrow.setAttribute('y2', String(startY));
        tempArrow.style.display = 'block';
        svgLayer.appendChild(tempArrow);
    }

    addNodeBtn.addEventListener('click', () => {
        const newId = `node_${Date.now()}`;
        const boardRect = board.getBoundingClientRect();
        const x = ((boardRect.width / 2) - boardState.panX) / boardState.zoom - 75;
        const y = ((boardRect.height / 2) - boardState.panY) / boardState.zoom - 50;
        nodes.push({ id: newId, name: '새로운 목표', commit: 0, x, y, links: {}, activation: 0 });
        saveNodes(nodes);
        handleNodeSelection(newId);
    });

    function calculateAndPropagateActivation() {
        const ic = config.activation.iterations;
        const alpha = config.activation.propagationRate;
        addNodeBtn.classList.add('disabled');
        calcActivationBtn.classList.add('disabled');
        showSnackbar('Activation 계산 중...');
        nodes.forEach(node => { node.activation = 0; });

        setTimeout(() => {
            for (let i = 0; i < ic; i++) {
                const increments = nodes.reduce((acc, node) => ({ ...acc, [node.id]: 0 }), {});
                nodes.forEach(sourceNode => {
                    for (const targetNodeId in sourceNode.links) {
                        if (nodes.some(n => n.id === targetNodeId)) {
                            const weight = sourceNode.links[targetNodeId];
                            const increment = (weight * (sourceNode.commit+sourceNode.activation*alpha))/ic;
                            increments[targetNodeId] += increment;
                        }
                    }

                });
                nodes.forEach(node => {
                    node.activation += increments[node.id];
                    node.activation += node.commit/ic;
                });
            }
            addNodeBtn.classList.remove('disabled');
            calcActivationBtn.classList.remove('disabled');
            renderNodes();
            showSnackbar('Activation 계산 완료!');
        }, 100);
    }

    calcActivationBtn.addEventListener('click', calculateAndPropagateActivation);
    board.addEventListener('click', e => { if (e.target === board) deselectAll(); });

    board.addEventListener('mousedown', e => {
        if ((e.target === board || e.target.id === 'node-container' || e.target.id === 'arrow-svg-layer') && e.button === 0) {
            board.classList.add('grabbing');
            boardState.isPanning = true;
            boardState.lastMouseX = e.clientX;
            boardState.lastMouseY = e.clientY;
        }
    });
    
    window.addEventListener('mouseup', (e) => {
        if (linkState.isLinking) {
            const targetEl = e.target.closest('.node');
            if (targetEl) {
                const targetNodeId = targetEl.dataset.id;
                const sourceNode = nodes.find(n => n.id === linkState.sourceNodeId);
                
                if (sourceNode && targetNodeId !== linkState.sourceNodeId) {
                    if (sourceNode.links[targetNodeId]) {
                        showSnackbar("이미 존재하는 연결입니다.");
                    } else {
                        sourceNode.links[targetNodeId] = 1;
                        saveNodes(nodes);
                        renderAll();
                    }
                }
            }
        }
        
        if (dragState.isDraggingNode) {
            saveNodes(nodes);
        }

        board.classList.remove('grabbing');
        boardState.isPanning = false;
        dragState.isDraggingNode = false;
        dragState.draggedNodeId = null;
        linkState.isLinking = false;
        linkState.sourceNodeId = null;
        tempArrow.style.display = 'none';
    });

    window.addEventListener('mousemove', e => {
        if (linkState.isLinking) {
            const boardRect = board.getBoundingClientRect();
            const mouseX = e.clientX - boardRect.left;
            const mouseY = e.clientY - boardRect.top;
            const endX = (mouseX - boardState.panX) / boardState.zoom;
            const endY = (mouseY - boardState.panY) / boardState.zoom;
            
            tempArrow.setAttribute('x2', String(endX));
            tempArrow.setAttribute('y2', String(endY));
        } else if (dragState.isDraggingNode) {
            const node = nodes.find(n => n.id === dragState.draggedNodeId);
            if (node) {
                node.x += e.movementX / boardState.zoom;
                node.y += e.movementY / boardState.zoom;
                renderAll();
            }
        } else if (boardState.isPanning) {
            const dx = e.clientX - boardState.lastMouseX;
            const dy = e.clientY - boardState.lastMouseY;
            boardState.panX += dx;
            boardState.panY += dy;
            boardState.lastMouseX = e.clientX;
            boardState.lastMouseY = e.clientY;
            updateNodeContainerTransform();
        }
    });

    board.addEventListener('wheel', e => {
        e.preventDefault();
        const zoomSpeed = config.zoom.speed;
        const oldZoom = boardState.zoom;
        
        const mouseX = e.clientX - board.getBoundingClientRect().left;
        const mouseY = e.clientY - board.getBoundingClientRect().top;

        const newZoom = oldZoom - e.deltaY * (zoomSpeed / 100);
        boardState.zoom = Math.max(config.zoom.min, Math.min(config.zoom.max, newZoom));

        boardState.panX = mouseX - (mouseX - boardState.panX) * (boardState.zoom / oldZoom);
        boardState.panY = mouseY - (mouseY - boardState.panY) * (boardState.zoom / oldZoom);

        updateNodeContainerTransform();
    });

    // Prevent the default browser context menu from appearing
    window.addEventListener('contextmenu', e => {
        e.preventDefault();
    });

    function initialize() {
        initEditor({
            onClose: deselectAll,
            onSave: (id, newName, newCommit) => {
                const node = nodes.find(n => n.id === id);
                if (node) {
                    node.name = newName;
                    node.commit = newCommit;
                    saveNodes(nodes);
                    renderAll();
                }
            },
            onLinkUpdate: (action, sourceId, targetId, newWeight) => {
                const sourceNode = nodes.find(n => n.id === sourceId);
                if (!sourceNode) return;

                if (action === 'update-weight') {
                    sourceNode.links[targetId] = newWeight;
                } else if (action === 'delete-link') {
                    delete sourceNode.links[targetId];
                }
                saveNodes(nodes);
                renderAll();
            },
            onDelete: (id) => {
                if (confirm('Are you sure you want to delete this node?')) {
                    nodes = nodes.filter(n => n.id !== id);
                    nodes.forEach(n => {
                        if (n.links[id]) {
                            delete n.links[id];
                        }
                    });
                    saveNodes(nodes);
                    deselectAll();
                }
            }
        });

        const boardSize = 10000; // Create a large canvas
        nodeContainer.style.width = `${boardSize}px`;
        nodeContainer.style.height = `${boardSize}px`;

        const savedNodes = loadNodes();
        if (savedNodes && savedNodes.length > 0) {
            nodes = savedNodes;
        } else {
            // Place default nodes in the center of the new large canvas
            const centerX = boardSize / 2;
            const centerY = boardSize / 2;
            nodes = [
                { id: 'app_dev', name: 'App Develop', commit: 50, x: centerX - 150, y: centerY, links: { 'ai_theory': 1 }, activation: 0 },
                { id: 'ai_theory', name: 'AI Theory', commit: 30, x: centerX + 150, y: centerY - 50, links: { 'app_dev': 2 }, activation: 0 },
                { id: 'exercise', name: '운동하기', commit: 80, x: centerX, y: centerY + 200, links: { 'app_dev': 1 }, activation: 0 }
            ];
        }
        
        // Center the view on the content
        const boardRect = board.getBoundingClientRect();
        boardState.panX = (boardRect.width / 2) - (boardSize / 2);
        boardState.panY = (boardRect.height / 2) - (boardSize / 2);

        updateNodeContainerTransform();
        renderAll();
    }

    initialize();
});