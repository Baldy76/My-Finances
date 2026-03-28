// 1. DATA STATE
let data = JSON.parse(localStorage.getItem('financeApp')) || {
    account: [], debt: [], savings: [], bills: []
};

data.account.forEach(acc => { if (acc.overdraft === undefined) acc.overdraft = 0; });

const currentMonthKey = new Date().getFullYear() + '-' + new Date().getMonth();
if (localStorage.getItem('lastOpenedMonth') !== currentMonthKey) {
    data.bills.forEach(b => b.paid = false);
    localStorage.setItem('lastOpenedMonth', currentMonthKey);
    localStorage.setItem('financeApp', JSON.stringify(data));
}

let currentMode = '';
let currentAccountIndex = null;
let editingIndex = null; // NEW: Tracks if we are editing an existing item
let bankHolidays = JSON.parse(localStorage.getItem('ukBankHolidays')) || [];

window.onload = () => {
    const durationSelect = document.getElementById('item-duration');
    for(let i = 3; i <= 24; i++) {
        let opt = document.createElement('option');
        opt.value = i;
        opt.innerHTML = i + " Months";
        durationSelect.appendChild(opt);
    }
};

async function loadHolidays() {
    if (bankHolidays.length === 0) {
        try {
            const res = await fetch('https://www.gov.uk/bank-holidays.json');
            const govData = await res.json();
            bankHolidays = govData['england-and-wales'].events.map(e => e.date);
            localStorage.setItem('ukBankHolidays', JSON.stringify(bankHolidays));
            render();
        } catch (e) { console.error("Holidays fetch failed"); }
    }
}
loadHolidays();

function getNextWorkingDay(year, month, targetDay) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let date = new Date(year, month, Math.min(targetDay, daysInMonth));
    while (date.getDay() === 0 || date.getDay() === 6 || bankHolidays.includes(date.toISOString().split('T')[0])) {
        date.setDate(date.getDate() + 1);
    }
    return date;
}

// 2. SUPERCHARGED EMOJI ENGINE
const emojis = { 
    // Banks
    barclays: "🦅", lloyds: "🐎", halifax: "✖️", monzo: "🔥", starling: "⭐", santander: "🔴", bank: "🏦",
    // Debt & Credit
    credit: "💳", card: "💳", loan: "🤝", mortgage: "🏠", klarna: "🛍️", clearpay: "🛒", paypal: "🅿️",
    // Savings
    save: "🐷", savings: "🍯", pot: "🍯", emergency: "🚨", holiday: "✈️", car: "🚗", wedding: "💍", invest: "📈",
    // Bills & Life
    gas: "🔥", electric: "⚡", water: "💧", mobile: "📱", phone: "📞", internet: "🌐", wifi: "📡", 
    netflix: "🍿", gym: "🏋️", council: "🏛️", rent: "🔑", default: "✨" 
};

function getEmoji(name) {
    let n = name.toLowerCase();
    for (let k in emojis) { if (n.includes(k)) return emojis[k]; }
    return emojis.default;
}

// 3. UI ACTIONS
function switchTab(id, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-btn'));
    document.getElementById(id).classList.add('active');
    btn.classList.add('active-btn');
}

function openModal(mode) {
    currentMode = mode;
    editingIndex = null; // Ensure we are adding a NEW item, not editing
    document.getElementById('modal-title').innerText = "Add " + mode;
    
    document.querySelectorAll('.modal-content input, .modal-content select').forEach(el => el.value = "");
    
    document.getElementById('item-date').style.display = (mode === 'bill') ? 'block' : 'none';
    document.getElementById('item-overdraft').style.display = (mode === 'account') ? 'block' : 'none';
    document.getElementById('debt-type').style.display = (mode === 'debt') ? 'block' : 'none';
    document.getElementById('bill-type').style.display = (mode === 'bill') ? 'block' : 'none';
    document.getElementById('item-duration').style.display = 'none'; 

    document.getElementById('input-modal').style.display = 'flex';
}

function checkDuration(type) {
    const val = document.getElementById(type + '-type').value;
    if (val === 'Short Term Debt' || val === 'Short Term') {
        document.getElementById('item-duration').style.display = 'block';
    } else {
        document.getElementById('item-duration').style.display = 'none';
        document.getElementById('item-duration').value = ""; 
    }
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
    editingIndex = null; // Reset edit state on close
}

// NEW: EDITING LOGIC
function editCurrentAccount() {
    closeModal('account-modal');
    currentMode = 'account';
    editingIndex = currentAccountIndex; // Remember which account we are editing
    
    const acc = data.account[currentAccountIndex];
    
    document.getElementById('modal-title').innerText = "Edit Account";
    document.getElementById('item-name').value = acc.name;
    document.getElementById('item-amount').value = acc.amount;
    document.getElementById('item-overdraft').value = acc.overdraft || 0;
    
    // Hide irrelevant fields, show overdraft
    document.getElementById('item-date').style.display = 'none';
    document.getElementById('debt-type').style.display = 'none';
    document.getElementById('bill-type').style.display = 'none';
    document.getElementById('item-duration').style.display = 'none';
    document.getElementById('item-overdraft').style.display = 'block';

    document.getElementById('input-modal').style.display = 'flex';
}

function saveItem() {
    const name = document.getElementById('item-name').value;
    const amount = parseFloat(document.getElementById('item-amount').value) || 0;
    const date = parseInt(document.getElementById('item-date').value) || 1;
    const overdraft = parseFloat(document.getElementById('item-overdraft').value) || 0;
    
    let subType = "";
    let duration = null;

    if (currentMode === 'debt') {
        subType = document.getElementById('debt-type').value;
        if (subType === 'Short Term Debt') duration = document.getElementById('item-duration').value;
    } else if (currentMode === 'bill') {
        subType = document.getElementById('bill-type').value;
        if (subType === 'Short Term') duration = document.getElementById('item-duration').value;
    }

    if (name) {
        if (editingIndex !== null && currentMode === 'account') {
            // WE ARE EDITING AN EXISTING ACCOUNT
            data.account[editingIndex].name = name;
            data.account[editingIndex].amount = amount;
            data.account[editingIndex].overdraft = overdraft;
        } else {
            // WE ARE ADDING A NEW ITEM
            if (currentMode === 'account') data.account.push({ name, amount, overdraft, transactions: [] });
            else if (currentMode === 'bill') data.bills.push({ name, amount, date, paid: false, subType, duration });
            else if (currentMode === 'debt') data.debt.push({ name, amount, subType, duration });
            else data.savings.push({ name, amount });
        }
        
        editingIndex = null; // Clear edit state
        render();
        closeModal('input-modal');
    }
}

function openAccountDetails(idx) {
    currentAccountIndex = idx;
    const acc = data.account[idx];
    
    document.getElementById('acc-modal-title').innerText = `${getEmoji(acc.name)} ${acc.name}`;
    
    let balanceDisplay = acc.amount >= 0 ? `£${acc.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}` : `-£${Math.abs(acc.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    const balElement = document.getElementById('acc-modal-balance');
    balElement.innerText = balanceDisplay;
    balElement.style.color = acc.amount >= 0 ? 'var(--success)' : 'var(--danger)';
    
    const txList = document.getElementById('transactions-list');
    txList.innerHTML = acc.transactions.length ? acc.transactions.map(tx => `
        <div class="tx-item">
            <span style="color:#64748b">${tx.date}</span>
            <span class="${tx.type === 'in' ? 'tx-in' : ''}">${tx.type === 'in' ? '+' : '-'}£${tx.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
        </div>`).join('') : '<p style="color:#64748b">No transactions.</p>';
    document.getElementById('account-modal').style.display = 'flex';
}

function addTransaction(type) {
    const amt = parseFloat(document.getElementById('tx-amount').value);
    if (amt && currentAccountIndex !== null) {
        const acc = data.account[currentAccountIndex];
        if (type === 'in') acc.amount += amt; else acc.amount -= amt;
        acc.transactions.unshift({ amount: amt, type, date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) });
        if (acc.transactions.length > 20) acc.transactions.pop();
        render();
        openAccountDetails(currentAccountIndex);
        document.getElementById('tx-amount').value = '';
    }
}

function toggleBill(idx) {
    data.bills[idx].paid = !data.bills[idx].paid;
    render();
}

// 4. RENDER
function render() {
    localStorage.setItem('financeApp', JSON.stringify(data));
    const now = new Date();
    
    document.getElementById('accounts-list').innerHTML = data.account.map((a, i) => {
        let balanceDisplay = a.amount >= 0 ? `£${a.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}` : `-£${Math.abs(a.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        let balanceColor = a.amount >= 0 ? 'var(--text)' : 'var(--danger)';
        
        let odText = '';
        if (a.overdraft > 0) {
            if (a.amount < 0) {
                let available = a.overdraft + a.amount; 
                odText = `<div class="tile-sub">OD: £${a.overdraft.toLocaleString()} | Avail: £${available.toLocaleString()}</div>`;
            } else {
                odText = `<div class="tile-sub">OD Facility: £${a.overdraft.toLocaleString()}</div>`;
            }
        }

        return `
        <div class="tile" onclick="openAccountDetails(${i})">
            <span class="tile-emoji">${getEmoji(a.name)}</span>
            <h4>${a.name}</h4>
            <p style="color: ${balanceColor}">${balanceDisplay}</p>
            ${odText}
        </div>`;
    }).join('');

    document.getElementById('debts-list').innerHTML = data.debt.map(item => {
        let subText = item.subType || "";
        if (item.duration) subText += ` (${item.duration}m remaining)`;
        return `
        <div class="tile">
            <span class="tile-emoji">${getEmoji(item.name)}</span>
            <h4>${item.name}</h4>
            <p>£${item.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            ${subText ? `<div class="tile-sub">${subText}</div>` : ''}
        </div>`;
    }).join('');

    document.getElementById('savings-list').innerHTML = data.savings.map(item => `
        <div class="tile">
            <span class="tile-emoji">${getEmoji(item.name)}</span>
            <h4>${item.name}</h4>
            <p>£${item.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>`).join('');

    const billsList = document.getElementById('bills-list');
    billsList.innerHTML = '';
    data.bills.map((b, i) => {
        const actual = getNextWorkingDay(now.getFullYear(), now.getMonth(), b.date);
        return { ...b, idx: i, actual };
    }).sort((a,b) => a.actual - b.actual).forEach(b => {
        const isMoved = b.date !== b.actual.getDate();
        const dateStr = isMoved ? 
            `<span class="bill-date" style="text-decoration:line-through; opacity:0.5">${b.date}th</span> 
             <span class="bill-date" style="background:var(--success); color:#fff">Due: ${b.actual.toLocaleDateString('en-GB',{weekday:'short', day:'numeric', month:'short'})}</span>` : 
            `<span class="bill-date">${b.date}th</span>`;

        let billSub = b.subType || "";
        if (b.duration) billSub += ` (${b.duration}m)`;

        billsList.innerHTML += `
            <div class="list-item ${b.paid ? 'bill-paid' : ''}">
                <div>
                    <div style="margin-bottom:8px">${dateStr}</div>
                    <strong>${getEmoji(b.name)} ${b.name}</strong>
                    <div style="color:#94a3b8; font-size:0.8rem; margin-top:4px">${billSub}</div>
                    <div style="color:#e2e8f0; font-size:0.95rem; margin-top:2px">£${b.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                </div>
                <button class="${b.paid ? 'badge-paid' : 'badge-unpaid'}" onclick="toggleBill(${b.idx})">${b.paid ? 'Paid ✓' : 'Mark Paid'}</button>
            </div>`;
    });
}

function clearAllData() { if(confirm("Are you sure? This will delete EVERYTHING.")) { localStorage.clear(); location.reload(); } }
render();
