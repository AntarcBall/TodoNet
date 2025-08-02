// acute.js

const ACUTE_STORAGE_KEY = 'commitHistory'; // Keeping the storage key for backward compatibility

function getTodayDateString() {
    const today = new Date();
    return today.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function trackCommitChange(nodeId, oldCommit, newCommit) {
    const change = newCommit - oldCommit;
    console.log(`trackCommitChange called for node ${nodeId}: old=${oldCommit}, new=${newCommit}, change=${change}`);
    if (change === 0) return;

    try {
        const history = JSON.parse(localStorage.getItem(ACUTE_STORAGE_KEY)) || {};
        if (!history[nodeId]) {
            history[nodeId] = {};
        }

        const today = getTodayDateString();
        history[nodeId][today] = (history[nodeId][today] || 0) + change;

        localStorage.setItem(ACUTE_STORAGE_KEY, JSON.stringify(history));
        console.log('New history state saved to localStorage:', history);
    } catch (error) {
        console.error("Failed to track commit change in localStorage:", error);
    }
}

export function initAcutePanel() {
    const panel = document.getElementById('acute-panel');
    if (!panel) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    panel.addEventListener('mousedown', (e) => {
        isDown = true;
        panel.classList.add('grabbing');
        startX = e.pageX - panel.offsetLeft;
        scrollLeft = panel.scrollLeft;
    });
    panel.addEventListener('mouseleave', () => {
        isDown = false;
        panel.classList.remove('grabbing');
    });
    panel.addEventListener('mouseup', () => {
        isDown = false;
        panel.classList.remove('grabbing');
    });
    panel.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - panel.offsetLeft;
        const walk = (x - startX) * 2; // The scroll speed
        panel.scrollLeft = scrollLeft - walk;
    });
}

export function renderAcutePanel(acuteNodes) {
    const acuteTable = document.getElementById('acute-table');
    if (!acuteTable) return;
    const acuteTableBody = acuteTable.querySelector('tbody');
    const acuteTableHeader = acuteTable.querySelector('thead tr');

    acuteTableHeader.innerHTML = '<th style="min-width: 150px;">Name</th>'; // Set min-width for Name column
    acuteTableBody.innerHTML = '';

    const dates = [];
    for (let i = 0; i < 4; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().slice(0, 10));
    }
    // dates are now ordered from today to oldest

    dates.forEach((date, index) => {
        const th = document.createElement('th');
        if (index === 0) {
            th.textContent = 'Td';
        } else {
            th.textContent = `D-${index}`;
            th.style.fontSize = '0.6rem'; // Smaller font size
        }
        acuteTableHeader.appendChild(th);
    });

    const history = JSON.parse(localStorage.getItem(ACUTE_STORAGE_KEY)) || {};
    console.log('Rendering acute panel with nodes:', acuteNodes);
    console.log('Using history data from localStorage:', history);

    acuteNodes.forEach(node => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        nameCell.textContent = node.name;
        row.appendChild(nameCell);

        dates.forEach(date => {
            const cell = document.createElement('td');
            cell.className = 'contribution-cell'; // Add class for styling

            const commitChange = history[node.id] && history[node.id][date] ? history[node.id][date] : 0;
            
            // Create tooltip structure
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            const tooltipText = document.createElement('span');
            tooltipText.className = 'tooltiptext';
            tooltipText.textContent = `${commitChange > 0 ? '+' : ''}${commitChange} contributions on ${date}`;
            tooltip.appendChild(tooltipText);

            // Set background color based on contribution
            if (commitChange > 20) {
                tooltip.style.backgroundColor = '#216e39'; 
            } else if (commitChange > 10) {
                tooltip.style.backgroundColor = '#30a14e';
            } else if (commitChange > 0) {
                tooltip.style.backgroundColor = '#40c463';
            } else {
                 tooltip.style.backgroundColor = '#ebedf0';
            }

            cell.appendChild(tooltip);
            row.appendChild(cell);
        });

        acuteTableBody.appendChild(row);
    });
}
