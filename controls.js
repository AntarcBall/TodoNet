// controls.js
import { addNode, getNodes, setNodes } from './state.js';
import { calculateAndPropagateActivation } from './activation.js';
import { showSnackbar } from './ui.js';
import { getBoardState } from './board.js';

let addNodeBtn, calcActivationBtn;

export function initControls() {
    addNodeBtn = document.getElementById('add-node-btn');
    calcActivationBtn = document.getElementById('calc-activation-btn');

    addNodeBtn.addEventListener('click', handleAddNodeClick);
    calcActivationBtn.addEventListener('click', handleCalcActivationClick);
}

function handleAddNodeClick() {
    const boardState = getBoardState();
    const boardRect = document.getElementById('board').getBoundingClientRect();
    // Calculate center of the current viewport
    const x = ((boardRect.width / 2) - boardState.panX) / boardState.zoom - 75; // Node width offset
    const y = ((boardRect.height / 2) - boardState.panY) / boardState.zoom - 50; // Node height offset
    addNode(x, y);
}

async function handleCalcActivationClick() {
    addNodeBtn.classList.add('disabled');
    calcActivationBtn.classList.add('disabled');
    showSnackbar('Calculating activation...');

    // Use a timeout to allow the UI to update before the calculation starts
    setTimeout(() => {
        const currentNodes = getNodes();
        const newNodes = calculateAndPropagateActivation(currentNodes);
        setNodes(newNodes);
        
        addNodeBtn.classList.remove('disabled');
        calcActivationBtn.classList.remove('disabled');
        showSnackbar('Activation calculation complete!');
    }, 100);
}
