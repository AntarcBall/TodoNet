import { initEditor, renderEditorPanel } from './editor.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const board = document.getElementById('board');
    const nodeContainer = document.getElementById('node-container');
    const addNodeBtn = document.getElementById('add-node-btn');
    const calcActivationBtn = document.getElementById('calc-activation-btn');
    const svgLayer = document.getElementById('arrow-svg-layer');
    const gradientDefs = document.getElementById('gradient-defs');
    const tempArrow = document.getElementById('temp-arrow');
    const snackbar = document.getElementById('snackbar');

    // State
    let nodes = [];
    let selectedNodeId = null;
    const boardState = { panX: 0, panY: 0, isPanning: false, lastMouseX: 0, lastMouseY: 0 };
    const dragState = { isDraggingNode: false, draggedNodeId: null, offsetX: 0, offsetY: 0 };
    const linkState = { isLinking: false, sourceNodeId: null };

    // --- RENDER FUNCTIONS ---
    function renderAll() {
        renderNodes();
        renderArrows();
        renderEditorPanel(nodes, selectedNodeId);
    }

    function renderNodes() {
        nodeContainer.innerHTML = '';
        nodes.forEach(node => {
            const nodeEl = document.createElement('div');
            nodeEl.className = 'node p-4 rounded-lg shadow-md cursor-pointer bg-white dark:bg-gray-800';
            nodeEl.style.left = `${node.x}px`;
            nodeEl.style.top = `${node.y}px`;
            nodeEl.dataset.id = node.id;
            if (node.id === selectedNodeId) nodeEl.classList.add('selected');
            
            nodeEl.innerHTML = `
                <h3 class="font-bold text-lg whitespace-nowrap">${node.name}</h3>
                <div class="text-center text-3xl font-bold mt-2 text-gray-700 dark:text-gray-300">${node.commit}</div>
            `;

            const activationEl = document.createElement('div');
            activationEl.className = 'mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-center font-semibold text-yellow-500';
            activationEl.textContent = node.activation.toFixed(2);
            nodeEl.appendChild(activationEl);
            
            nodeEl.addEventListener('click', e => { e.stopPropagation(); handleNodeSelection(node.id); });
            nodeEl.addEventListener('mousedown', e => handleNodeMouseDown(e, node.id));
            nodeEl.addEventListener('contextmenu', e => handleNodeContextMenu(e, node.id));
            nodeContainer.appendChild(nodeEl);
        });
    }

    function renderArrows() {
        Array.from(svgLayer.querySelectorAll('.arrow-path')).forEach(path => path.remove());
        gradientDefs.innerHTML = '';
        const containerRect = nodeContainer.getBoundingClientRect();

        nodes.forEach(sourceNode => {
            const sourceEl = nodeContainer.querySelector(`[data-id="${sourceNode.id}"]`);
            if (!sourceEl) return;

            const sourceRect = sourceEl.getBoundingClientRect();
            const sourceX = sourceRect.left - containerRect.left + sourceRect.width / 2;
            const sourceY = sourceRect.top - containerRect.top + sourceRect.height / 2;

            for (const targetNodeId in sourceNode.links) {
                const targetNode = nodes.find(n => n.id === targetNodeId);
                if (!targetNode) continue;

                const targetEl = nodeContainer.querySelector(`[data-id="${targetNodeId}"]`);
                if (!targetEl) continue;

                const targetRect = targetEl.getBoundingClientRect();
                const targetX = targetRect.left - containerRect.left + targetRect.width / 2;
                const targetY = targetRect.top - containerRect.top + targetRect.height / 2;
                
                const gradientId = `grad-${sourceNode.id}-to-${targetNode.id}`;
                const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
                gradient.setAttribute('id', gradientId);
                gradient.setAttribute('x1', sourceX);
                gradient.setAttribute('y1', sourceY);
                gradient.setAttribute('x2', targetX);
                gradient.setAttribute('y2', targetY);
                gradient.setAttribute('gradientUnits', 'userSpaceOnUse');

                const styles = getComputedStyle(document.documentElement);
                const startColor = styles.getPropertyValue('--arrow-gradient-start-color').trim();
                const endColor = styles.getPropertyValue('--arrow-gradient-end-color').trim();
                
                gradient.innerHTML = `
                    <stop offset="0%" style="stop-color:${startColor};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${endColor};stop-opacity:1" />
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
                        const offset = 5;
                        
                        startX_offset += offset * nx;
                        startY_offset += offset * ny;
                        endX_offset += offset * nx;
                        endY_offset += offset * ny;
                    }
                }

                const pathData = `M ${startX_offset} ${startY_offset} L ${endX_offset} ${endY_offset}`;
                
                arrow.setAttribute('d', pathData);
                arrow.setAttribute('stroke', `url(#${gradientId})`);
                arrow.setAttribute('stroke-width', '4');
                arrow.setAttribute('fill', 'none');
                svgLayer.insertBefore(arrow, tempArrow);
            }
        });
    }
    
    function updateNodeContainerTransform() {
        const transform = `translate(${boardState.panX}px, ${boardState.panY}px)`;
        nodeContainer.style.transform = transform;
        svgLayer.style.transform = transform;
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
            dragState.offsetX = e.clientX - node.x - boardState.panX;
            dragState.offsetY = e.clientY - node.y - boardState.panY;
            board.classList.remove('grabbing');
        }
    }

    function handleNodeContextMenu(e, nodeId) {
        e.preventDefault();
        e.stopPropagation();
        linkState.isLinking = true;
        linkState.sourceNodeId = nodeId;
        const sourceEl = nodeContainer.querySelector(`[data-id="${nodeId}"]`);
        const containerRect = nodeContainer.getBoundingClientRect();
        const sourceRect = sourceEl.getBoundingClientRect();
        const startX = sourceRect.left - containerRect.left + sourceRect.width / 2;
        const startY = sourceRect.top - containerRect.top + sourceRect.height / 2;
        tempArrow.setAttribute('x1', startX);
        tempArrow.setAttribute('y1', startY);
        tempArrow.setAttribute('x2', startX);
        tempArrow.setAttribute('y2', startY);
        tempArrow.style.display = 'block';
    }

    addNodeBtn.addEventListener('click', () => {
        const newId = `node_${Date.now()}`;
        const boardRect = board.getBoundingClientRect();
        const x = (boardRect.width / 2) - boardState.panX - 75;
        const y = (boardRect.height / 2) - boardState.panY - 50;
        nodes.push({ id: newId, name: '새로운 목표', commit: 0, x, y, links: {}, activation: 0 });
        handleNodeSelection(newId);
    });

    function calculateAndPropagateActivation() {
        const ic = 3;
        const alpha = 0.2;
        addNodeBtn.disabled = true;
        calcActivationBtn.disabled = true;
        showSnackbar('Activation 계산 중...');
        nodes.forEach(node => { node.activation = 0; });

        setTimeout(() => {
            for (let i = 0; i < ic; i++) {
                const increments = nodes.reduce((acc, node) => ({ ...acc, [node.id]: 0 }), {});
                nodes.forEach(sourceNode => {
                    for (const targetNodeId in sourceNode.links) {
                        if (nodes.some(n => n.id === targetNodeId)) {
                            const weight = sourceNode.links[targetNodeId];
                            const increment = (weight * sourceNode.commit) + (sourceNode.activation * alpha);
                            increments[targetNodeId] += increment;
                        }
                    }
                });
                nodes.forEach(node => {
                    node.activation += increments[node.id];
                });
            }
            addNodeBtn.disabled = false;
            calcActivationBtn.disabled = false;
            renderNodes();
            showSnackbar('Activation 계산 완료!');
        }, 100);
    }

    calcActivationBtn.addEventListener('click', calculateAndPropagateActivation);
    board.addEventListener('click', e => { if (e.target === board) deselectAll(); });

    board.addEventListener('mousedown', e => {
        if ((e.target === board || e.target === nodeContainer) && e.button === 0) {
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
                        renderAll();
                    }
                }
            }
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
            const containerRect = nodeContainer.getBoundingClientRect();
            const endX = e.clientX - containerRect.left;
            const endY = e.clientY - containerRect.top;
            tempArrow.setAttribute('x2', endX);
            tempArrow.setAttribute('y2', endY);
        } else if (dragState.isDraggingNode) {
            const node = nodes.find(n => n.id === dragState.draggedNodeId);
            if (node) {
                node.x = e.clientX - boardState.panX - dragState.offsetX;
                node.y = e.clientY - boardState.panY - dragState.offsetY;
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

    function initialize() {
        initEditor({
            onClose: deselectAll,
            onSave: (id, newName, newCommit) => {
                const node = nodes.find(n => n.id === id);
                if (node) {
                    node.name = newName;
                    node.commit = newCommit;
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
                renderAll();
            }
        });

        nodes = [
            { id: 'app_dev', name: 'App Develop', commit: 50, x: 150, y: 200, links: { 'ai_theory': 1 }, activation: 0 },
            { id: 'ai_theory', name: 'AI Theory', commit: 30, x: 450, y: 150, links: { 'app_dev': 2 }, activation: 0 },
            { id: 'exercise', name: '운동하기', commit: 80, x: 300, y: 400, links: { 'app_dev': 1 }, activation: 0 }
        ];
        
        const boardRect = board.getBoundingClientRect();
        boardState.panX = boardRect.width / 2 - 300;
        boardState.panY = boardRect.height / 2 - 250;

        updateNodeContainerTransform();
        renderAll();
    }

    initialize();
});