let data = JSON.parse(localStorage.getItem('financeData')) || {
    account: [],
    debt: [],
    savings: []
};

let currentMode = '';

function switchTab(pageId, clickedButton) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-btn'));
    document.getElementById(pageId).classList.add('active');
    clickedButton.classList.add('active-btn');
}

function openModal(mode) {
    currentMode = mode;
    document.getElementById('modal-title').innerText = "Add " + mode.charAt(0).toUpperCase() + mode.slice(1);
    document.getElementById('input-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('input-modal').style.display = 'none';
    document.getElementById('item-name').value = '';
    document.getElementById('item-amount').value = '';
}

function saveItem() {
    const name = document.getElementById('item-name').value;
    const amount = parseFloat(document.getElementById('item-amount').value);

    if (name && amount) {
        data[currentMode].push({ name, amount });
        localStorage.setItem('financeData', JSON.stringify(data));
        renderAll();
        closeModal();
    }
}

function renderAll() {
    // Render Accounts (Home)
    const accList = document.getElementById('accounts-list');
    accList.innerHTML = '';
    let totalAcc = 0;
    data.account.forEach(item => {
        totalAcc += item.amount;
        accList.innerHTML += `<div class="tile"><h4>${item.name}</h4><p>£${item.amount.toLocaleString()}</p></div>`;
    });

    // Render Debts
    const debtList = document.getElementById('debts-list');
    debtList.innerHTML = '';
    let totalDebt = 0;
    data.debt.forEach(item => {
        totalDebt += item.amount;
        debtList.innerHTML += `<div class="debt-row"><span>${item.name}</span><strong>£${item.amount.toLocaleString()}</strong></div>`;
    });

    // Render Savings
    const saveList = document.getElementById('savings-list');
    saveList.innerHTML = '';
    let totalSave = 0;
    data.savings.forEach(item => {
        totalSave += item.amount;
        saveList.innerHTML += `<div class="tile"><h4>${item.name}</h4><p>£${item.amount.toLocaleString()}</p></div>`;
    });

    // Update Totals
    document.getElementById('total-debt').innerText = `Total Owed: £${totalDebt.toLocaleString()}`;
    document.getElementById('total-savings').innerText = `Total Saved: £${totalSave.toLocaleString()}`;
    document.getElementById('net-worth').innerText = `Net Worth: £${(totalAcc + totalSave - totalDebt).toLocaleString()}`;
}

function clearAllData() {
    if(confirm("Are you sure you want to delete everything?")) {
        localStorage.clear();
        location.reload();
    }
}

// Initial Run
renderAll();
