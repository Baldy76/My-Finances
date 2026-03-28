// 1. DATA STATE
let data = JSON.parse(localStorage.getItem('financeApp')) || {
    account: [], debt: [], savings: [], bills: []
};

// Retrofit older accounts to ensure they have an overdraft property
data.account.forEach(acc => { if (acc.overdraft === undefined) acc.overdraft = 0; });

// 2. AUTO-RESET MONTHLY BILLS
const currentMonthKey = new Date().getFullYear() + '-' + new Date().getMonth();
if (localStorage.getItem('lastOpenedMonth') !== currentMonthKey) {
    data.bills.forEach(b => b.paid = false);
    localStorage.setItem('lastOpenedMonth', currentMonthKey);
    localStorage.setItem('financeApp', JSON.stringify(data));
}

let currentMode = '';
let currentAccountIndex = null;
let bankHolidays = JSON.parse(localStorage.getItem('ukBankHolidays')) || [];

// Populate the 3-24 months duration dropdown dynamically
window.onload = () => {
    const durationSelect = document.getElementById('item-duration');
    for(let i = 3; i <= 24; i++) {
        let opt = document.createElement('option');
        opt.value = i;
        opt.innerHTML = i + " Months";
        durationSelect.appendChild(opt);
    }
};

// 3. FETCH HOLIDAYS
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

// 4. SMART DATE CALCULATOR
function getNextWorkingDay(year, month, targetDay) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let date = new Date(year, month, Math.min(targetDay, daysInMonth));

    while (date.getDay() === 0 || date.getDay() === 6 || bankHolidays.includes(date.toISOString().split('T')[0])) {
        date.setDate(date.getDate() + 1);
    }
    return date;
}

// 5. EMOJI ENGINE
const emojis = { bank: "🏦", savings: "💰", card: "💳", holiday: "✈️", klarna: "🛍️", loan: "📉", gas: "🔥", electric: "⚡", water: "💧", mobile: "📱", internet: "🌐", default: "✨" };
function getEmoji(name) {
    let n = name.toLowerCase();
    for (let k in emojis) { if (n.includes(k)) return emojis[k]; }
    return emojis.default;
}

// 6. UI ACTIONS
function switchTab(id, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-btn'));
    document.getElementById(id).classList.add('active');
    btn.classList.add('active-btn');
}

function openModal(mode) {
    currentMode = mode;
    document.getElementById('modal-title').innerText = "Add " + mode;
    
    // Reset inputs safely
    document.querySelectorAll('.modal-content input, .modal-content select').forEach(el => el.value = "");
    
    // Toggle dropdowns
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
        if (currentMode === 'account') data.account.push({ name, amount, overdraft, transactions: [] });
        else if (currentMode === 'bill') data.bills.push({ name, amount, date, paid: false, subType, duration });
        else if (currentMode === 'debt') data.debt.push({ name, amount, subType, duration });
        else data.savings.push({ name, amount });
        
        render();
        closeModal('input-modal');
    }
}

function openAccountDetails(idx) {
    currentAccountIndex = idx;
    const acc = data.account[idx];
    
    document.getElementById('acc-modal-title').innerText = `${getEmoji(acc.name)} ${acc.name}`;
    
    // Format negative balances correctly
    let balanceDisplay = acc.amount >= 0 ? `£${acc.amount.toLocaleString()}` : `-£${Math.abs(acc.amount).toLocaleString()}`;
    const balElement = document.getElementById('acc-modal-balance');
    balElement.innerText = balanceDisplay;
    balElement.style.color = acc.amount >= 0 ? 'var(--success)' : 'var(--danger)';
    
    const txList = document.getElementById('transactions-list');
    txList.innerHTML = acc.transactions.length ? acc.transactions.map(tx => `
        <div class="tx-item">
            <span style="color:#64748b">${tx.date}</span>
            <span class="${tx.type === 'in' ? 'tx-in' : ''}">${tx.type === 'in' ? '+' : '-'}£${tx.amount.toLocaleString()}</span>
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

// 7. RENDER
function render() {
    localStorage.setItem('financeApp', JSON.stringify(data));
    const now = new Date();
    
    // Accounts (With Overdraft Logic)
    document.getElementById('accounts-list').innerHTML = data.account.map((a, i) => {
        let balanceDisplay = a.amount >= 0 ? `£${a.amount.toLocaleString()}` : `-£${Math.abs(a.amount).toLocaleString()}`;
        let balanceColor = a.amount >= 0 ? 'var(--text)' : 'var(--danger)';
        
        let odText = '';
        if (a.overdraft > 0) {
            if (a.amount < 0) {
                // E.g., OD is 500, amount is -100. Available = 500 + (-100) = 400.
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

    // Debts
    document.getElementById('debts-list').innerHTML = data.debt.map(item => {
        let subText = item.subType || "";
        if (item.duration) subText += ` (${item.duration}m remaining)`;
        return `
        <div class="tile">
            <span class="tile-emoji">${getEmoji(item.name)}</span>
            <h4>${item.name}</h4>
            <p>£${item.amount.toLocaleString()}</p>
            ${subText ? `<div class="tile-sub">${subText}</div>` : ''}
        </div>`;
    }).join('');

    // Savings
    document.getElementById('savings-list').innerHTML = data.savings.map(item => `
        <div class="tile">
            <span class="tile-emoji">${getEmoji(item.name)}</span>
            <h4>${item.name}</h4>
            <p>£${item.amount.toLocaleString()}</p>
        </div>`).join('');

    // Smart Bills
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
                    <div style="color:#e2e8f0; font-size:0.95rem; margin-top:2px">£${b.amount.toLocaleString()}</div>
                </div>
                <button class="${b.paid ? 'badge-paid' : 'badge-unpaid'}" onclick="toggleBill(${b.idx})">${b.paid ? 'Paid ✓' : 'Mark Paid'}</button>
            </div>`;
    });
}

function clearAllData() { if(confirm("Are you sure? This will delete EVERYTHING.")) { localStorage.clear(); location.reload(); } }
render();
