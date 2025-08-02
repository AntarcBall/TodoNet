// history.js

const HISTORY_STORAGE_KEY = 'commitHistory';

function getTodayDateString() {
    const today = new Date();
    return today.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function trackCommitChange(nodeId, oldCommit, newCommit) {
    const change = newCommit - oldCommit;
    if (change === 0) return;

    const history = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY)) || {};
    if (!history[nodeId]) {
        history[nodeId] = {};
    }

    const today = getTodayDateString();
    history[nodeId][today] = (history[nodeId][today] || 0) + change;

    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}

export function renderHistoryPanel(acuteNodes) {
    const historyPanel = document.getElementById('history-panel');
    const historyTable = document.getElementById('history-table');
    const historyTableBody = historyTable.querySelector('tbody');
    const historyTableHeader = historyTable.querySelector('thead tr');

    historyTableHeader.innerHTML = '<th>Name</th>';
    historyTableBody.innerHTML = '';

    const dates = [];
    for (let i = 0; i < 4; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().slice(0, 10));
    }

    dates.forEach((date, index) => {
        const th = document.createElement('th');
        if (index === 0) {
            th.textContent = 'Today';
        } else if (index === 1) {
            th.textContent = 'Yesterday';
        } else {
            th.textContent = date.slice(5); // MM-DD
        }
        historyTableHeader.appendChild(th);
    });

    const history = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY)) || {};

    acuteNodes.forEach(node => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        nameCell.textContent = node.name;
        row.appendChild(nameCell);

        dates.forEach(date => {
            const cell = document.createElement('td');
            const commitChange = history[node.id] && history[node.id][date] ? history[node.id][date] : 0;
            cell.textContent = commitChange > 0 ? `+${commitChange}` : commitChange;

            if (commitChange > 0) {
                cell.style.backgroundColor = '#d6f5d6'; // slight green
            }
            if (commitChange > 10) {
                cell.style.backgroundColor = '#8ceb8c'; // green
            }
            if (commitChange > 20) {
                cell.style.backgroundColor = '#42d442'; // darker green
            }

            row.appendChild(cell);
        });

        historyTableBody.appendChild(row);
    });
}
