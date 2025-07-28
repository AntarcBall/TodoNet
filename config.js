// config.js

// Configuration constants for the application

export const config = {
    // Activation Calculation Parameters
    activation: {
        iterations: 3,      // Number of iterations for the calculation (ic)
        propagationRate: 0.01  // The rate at which activation propagates (alpha)
    },

    // Zooming Parameters
    zoom: {
        speed: 0.1,         // How fast to zoom in/out
        min: 0.2,           // Minimum zoom level
        max: 2              // Maximum zoom level
    },

    // Link Style Parameters
    links: {
        baseWidth: 2,       // Base width in pixels for a link with weight 1
        parallelOffset: 5   // Offset in pixels for bidirectional links
    }
};
