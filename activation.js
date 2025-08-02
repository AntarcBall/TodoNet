// activation.js
import { config } from './config.js';

export function calculateAndPropagateActivation(nodes) {
    const ic = config.activation.iterations;
    const alpha = config.activation.propagationRate;
    
    // Create a deep copy to avoid modifying the original state directly
    const newNodes = JSON.parse(JSON.stringify(nodes));

    // Reset activation before calculation
    newNodes.forEach(node => { node.activation = 0; });

    for (let i = 0; i < ic; i++) {
        const increments = newNodes.reduce((acc, node) => ({ ...acc, [node.id]: 0 }), {});
        
        newNodes.forEach(sourceNode => {
            for (const targetNodeId in sourceNode.links) {
                // Ensure the target node exists in the current set of nodes
                if (newNodes.some(n => n.id === targetNodeId)) {
                    const weight = sourceNode.links[targetNodeId];
                    const increment = (weight * (sourceNode.commit + sourceNode.activation * alpha)) / ic;
                    increments[targetNodeId] += increment;
                }
            }
        });

        newNodes.forEach(node => {
            node.activation += increments[node.id];
            // Also add the node's own commit value to its activation over the iterations
            node.activation += node.commit / ic;
        });
    }
    
    return newNodes;
}
