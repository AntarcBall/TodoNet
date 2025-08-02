// acute.js

const ACUTE_STORAGE_KEY = 'commitHistory'; // Keeping the storage key for backward compatibility

function getTodayDateString() {
    const today = new Date();
    return today.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function trackCommitChange(nodeId, oldCommit, newCommit) {
    const change = newCommit - oldCommit;
    if (change === 0) return;

    const history = JSON.parse(localStorage.getItem(ACUTE_STORAGE_KEY)) || {};
    if (!history[nodeId]) {
        history[nodeId] = {};
    }

    const today = getTodayDateString();
    history[nodeId][today] = (history[nodeId][today] || 0) + change;

    localStorage.setItem(ACUTE_STORAGE_KEY, JSON.stringify(history));
}

export function renderAcutePanel(acuteNodes) {
    const acuteTable = document.getElementById('acute-table');
    if (!acuteTable) return;
    const acuteTableBody = acuteTable.querySelector('tbody');
    const acuteTableHeader = acuteTable.querySelector('thead tr');

    acuteTableHeader.innerHTML = '<th>Name</th>';
    acuteTableBody.innerHTML = '';

    const dates = [];
    for (let i = 0; i < 4; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().slice(0, 10));
    }
    dates.reverse(); // Display oldest date first

    dates.forEach((date, index) => {
        const th = document.createElement('th');
        const d = new Date(date);
        if (date === getTodayDateString()) {
            th.textContent = 'Today';
        } else {
            th.textContent = `${d.getMonth() + 1}/${d.getDate()}`;
        }
        acuteTableHeader.appendChild(th);
    });

    const history = JSON.parse(localStorage.getItem(ACUTE_STORAGE_KEY)) || {};

    acuteNodes.forEach(node => {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        nameCell.textContent = node.name;
        row.appendChild(nameCell);

        dates.forEach(date => {
            const cell = document.createElement('td');
            const commitChange = history[node.id] && history[node.id][date] ? history[node.id][date] : 0;
            cell.textContent = commitChange > 0 ? `+${commitChange}` : '-';
            cell.style.textAlign = 'center';

            if (commitChange > 20) {
                cell.style.backgroundColor = '#216e39'; 
                cell.style.color = 'white';
            } else if (commitChange > 10) {
                cell.style.backgroundColor = '#30a14e';
                cell.style.color = 'white';
            } else if (commitChange > 0) {
                cell.style.backgroundColor = '#40c463';
                cell.style.color = 'white';
            } else {
                 cell.style.backgroundColor = '#ebedf0';
            }

            row.appendChild(cell);
        });

        acuteTableBody.appendChild(row);
    });
}
