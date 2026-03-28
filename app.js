// 1. DATA ENGINE (Upgraded for Transactions & Bills)
let data = JSON.parse(localStorage.getItem('financeApp')) || {
    account: [], // Now holds {name, amount, transactions: []}
    debt: [],
    savings: [],
    bills: []    // Holds {name, amount, date, paid}
};

// Retrofit old data if you have existing accounts without transactions
data.account.forEach(acc => { if(!acc.transactions) acc.transactions = []; });
if(!data.bills) data.bills = [];

let currentMode = '';
let currentAccountIndex = null; // Remembers which account is open

const emojis = { bank: "🏦", savings: "💰", card: "💳", car: "🚗", holiday: "✈️", house: "🏠", food: "🍔", klarna: "🛍️", paypal: "🅿️", loan: "📉", gas: "🔥", electric: "⚡", water: "💧", mobile: "📱", internet: "🌐", default: "✨" };
function getEmoji(name) {
    name = name.toLowerCase();
    for (let key in emojis) { if (name.includes(key)) return emojis[key]; }
    return emojis.default;
}

function switchTab(pageId, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-btn'));
    document.getElementById(pageId).classList.add('active');
    btn.classList.add('active-btn');
}

// 2. MODAL CONTROLS
function openModal(mode) {
    currentMode = mode;
    document.getElementById('modal-title').innerText = "New " + mode;
    document.getElementById('item-date').style.display = (mode === 'bill') ? 'block' : 'none';
    document.getElementById('input-modal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.querySelectorAll('input').forEach(i => i.value = '');
}

// 3. SAVING NEW ITEMS (Accounts, Debts, Bills)
function saveItem() {
    const name = document.getElementById('item-name').value;
    const amount = parseFloat(document.getElementById('item-amount').value) || 0;
    const date = parseInt(document.getElementById('item-date').value) || 1;

    if (name) {
        if (currentMode === 'account') data.account.push({ name, amount, transactions: [] });
        else if (currentMode === 'bill') data.bills.push({ name, amount, date, paid: false });
        else data[currentMode].push({ name, amount });
        
        saveAndRender();
        closeModal('input-modal');
    }
}

// 4. ACCOUNT TRANSACTIONS
function openAccountDetails(index) {
    currentAccountIndex = index;
    const acc = data.account[index];
    
    document.getElementById('acc-modal-title').innerText = `${getEmoji(acc.name)} ${acc.name}`;
    document.getElementById('acc-modal-balance').innerText = `£${acc.amount.toLocaleString()}`;
    
    renderTransactions(acc);
    document.getElementById('account-modal').style.display = 'flex';
}

function addTransaction(type) {
    const amountInput = document.getElementById('tx-amount');
    const amount = parseFloat(amountInput.value);
    
    if (amount && currentAccountIndex !== null) {
        const acc = data.account[currentAccountIndex];
        const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        
        // Update Balance
        if (type === 'in') acc.amount += amount;
        else acc.amount -= amount;

        // Save Transaction (Limit to last 20)
        acc.transactions.unshift({ amount, type, date: dateStr });
        if (acc.transactions.length > 20) acc.transactions.pop();

        amountInput.value = '';
        saveAndRender();
        openAccountDetails(currentAccountIndex); // Refresh modal view
    }
}

function renderTransactions(acc) {
    const list = document.getElementById('transactions-list');
    list.innerHTML = '';
    
    if (acc.transactions.length === 0) {
        list.innerHTML = '<p style="color:#64748b; font-size:0.9rem;">No recent transactions.</p>';
        return;
    }

    acc.transactions.forEach(tx => {
        const sign = tx.type === 'in' ? '+' : '-';
        const colorClass = tx.type === 'in' ? 'tx-in' : 'tx-out';
        list.innerHTML += `
            <div class="tx-item">
                <span style="color:#94a3b8">${tx.date}</span>
                <span class="${colorClass}">${sign}£${tx.amount.toLocaleString()}</span>
            </div>
        `;
    });
}

// 5. BILLS LOGIC
function toggleBill(index) {
    data.bills[index].paid = !data.bills[index].paid;
    saveAndRender();
}

// 6. MASTER RENDER
function saveAndRender() {
    localStorage.setItem('financeApp', JSON.stringify(data));
    
    // Accounts
    const accList = document.getElementById('accounts-list');
    accList.innerHTML = '';
    data.account.forEach((item, index) => {
        accList.innerHTML += `
            <div class="tile" onclick="openAccountDetails(${index})">
                <span class="tile-emoji">${getEmoji(item.name)}</span>
                <h4>${item.name}</h4>
                <p>£${item.amount.toLocaleString()}</p>
            </div>`;
    });

    // Bills
    const billsList = document.getElementById('bills-list');
    billsList.innerHTML = '';
    // Sort bills by date
    data.bills.sort((a, b) => a.date - b.date).forEach((item, index) => {
        const paidClass = item.paid ? 'bill-paid' : '';
        const btnClass = item.paid ? 'badge-paid' : 'badge-unpaid';
        const btnText = item.paid ? 'Paid ✓' : 'Mark Paid';
        
        billsList.innerHTML += `
            <div class="list-item ${paidClass}">
                <div>
                    <span class="bill-date">${item.date}${getOrdinal(item.date)}</span>
                    <strong>${getEmoji(item.name)} ${item.name}</strong>
                    <div style="font-size:0.9rem; color:#94a3b8; margin-top:4px;">£${item.amount.toLocaleString()}</div>
                </div>
                <button class="${btnClass}" onclick="toggleBill(${index})">${btnText}</button>
            </div>`;
    });

    // Debts & Savings (Simplified rendering for brevity, same as before)
    document.getElementById('debts-list').innerHTML = data.debt.map(item => `<div class="list-item"><span>${getEmoji(item.name)} ${item.name}</span><strong>£${item.amount.toLocaleString()}</strong></div>`).join('');
    document.getElementById('savings-list').innerHTML = data.savings.map(item => `<div class="tile"><span class="tile-emoji">${getEmoji(item.name)}</span><h4>${item.name}</h4><p>£${item.amount.toLocaleString()}</p></div>`).join('');
}

function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

function clearAllData() {
    if(confirm("Delete everything?")) { localStorage.clear(); location.reload(); }
}

saveAndRender();
