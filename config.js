// config.js

// Configuration constants for the application

export const config = {
    // Activation Calculation Parameters
    activation: {
        iterations: 4,      // Number of iterations for the calculation (ic)
        propagationRate: 0.4  // The rate at which activation propagates (alpha)
    },

    // Zooming Parameters
    zoom: {
        speed: 0.1,         // How fast to zoom in/out
        min: 0.2,           // Minimum zoom level
        max: 2              // Maximum zoom level
    },

    // Link Style Parameters
    links: {
        baseWidth: 5,           // Base width in pixels for a link with weight 1
        parallelOffset: 10,      // Offset in pixels for bidirectional links
        startRatio: 0.05,        // Where the visible line starts (0.0 to 1.0)
        endRatio: 0.8,          // Where the visible line ends (0.0 to 1.0)
        arrowheadSize: 28,      // Base size of the arrowhead
        arrowheadColor: '#ffff00ff'  // Color of the arrowhead
    },

    // Visual and Theming Parameters
    visuals: {
        maxActivation: 800,    // The activation value that corresponds to the full highlight color
        highlightRgb: '255, 0, 0', // The RGB value for the highlight color
        acuteTaskColor: '#00ff00' // The color for acute task commit values
    },

    debug: {
        easy_commit:true    }
};
