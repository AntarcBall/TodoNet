// storage.js

const STORAGE_KEY = 'todoNetNodes';

export function saveNodes(nodes) {
    try {
        const data = JSON.stringify(nodes);
        localStorage.setItem(STORAGE_KEY, data);
    } catch (error) {
        console.error("Failed to save nodes to localStorage:", error);
    }
}

export function loadNodes() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            return JSON.parse(data);
        }
    } catch (error) {
        console.error("Failed to load nodes from localStorage:", error);
    }
    // Return null if no data or if there was an error
    return null;
}
