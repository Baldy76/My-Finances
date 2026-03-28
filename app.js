// 1. DATA STATE
let data = JSON.parse(localStorage.getItem('financeApp')) || {
    account: [], debt: [], savings: [], bills: [], salaries: []
};

data.account.forEach(acc => { if (acc.overdraft === undefined) acc.overdraft = 0; });
if (!data.salaries) data.salaries = [];
data.salaries.forEach(s => { if (s.lastPaidMonth === undefined) s.lastPaidMonth = null; });

const now = new Date();
const currentMonthKey = now.getFullYear() + '-' + now.getMonth();

if (localStorage.getItem('lastOpenedMonth') !== currentMonthKey) {
    data.bills.forEach(b => b.paid = false);
    localStorage.setItem('lastOpenedMonth', currentMonthKey);
    localStorage.setItem('financeApp', JSON.stringify(data));
}

let currentMode = '';
let currentAccountIndex = null;
let editingIndex = null; 
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
        } catch (e) { console.error("Holidays fetch failed"); }
    }
    autoProcessSalaries();
    render();
}
loadHolidays();

// --- SMART DATES & AUTO DEPOSIT ---
function getNextWorkingDay(year, month, targetDay) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let date = new Date(year, month, Math.min(targetDay, daysInMonth));
    while (date.getDay() === 0 || date.getDay() === 6 || bankHolidays.includes(date.toISOString().split('T')[0])) {
        date.setDate(date.getDate() + 1); 
    }
    return date;
}

function getPreviousWorkingDay(year, month, targetDay) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let date = new Date(year, month, Math.min(targetDay, daysInMonth));
    while (date.getDay() === 0 || date.getDay() === 6 || bankHolidays.includes(date.toISOString().split('T')[0])) {
        date.setDate(date.getDate() - 1); 
    }
    return date;
}

function getLastWorkingDayOfMonth(year, month) {
    return getPreviousWorkingDay(year, month, new Date(year, month + 1, 0).getDate());
}

function autoProcessSalaries() {
    let madeChanges = false;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    data.salaries.forEach(s => {
        let actualPayday = s.dateType === 'last' ? getLastWorkingDayOfMonth(now.getFullYear(), now.getMonth()) : getPreviousWorkingDay(now.getFullYear(), now.getMonth(), s.date);
        const paydayMidnight = new Date(actualPayday.getFullYear(), actualPayday.getMonth(), actualPayday.getDate());

        if (today >= paydayMidnight && s.lastPaidMonth !== currentMonthKey) {
            const targetAcc = data.account[s.accountIndex];
            if (targetAcc) {
                targetAcc.amount += s.amount;
                const dateStr = paydayMidnight.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                logTx(targetAcc, s.amount, 'in', 'Salary Deposit', dateStr);
            }
            s.lastPaidMonth = currentMonthKey;
            madeChanges = true;
        }
    });
    if (madeChanges) localStorage.setItem('financeApp', JSON.stringify(data));
}

function logTx(account, amount, type, desc, date) {
    if(!account.transactions) account.transactions = [];
    account.transactions.unshift({ amount, type, desc, date });
    if (account.transactions.length > 20) account.transactions.pop();
}

// 2. EMOJI ENGINE
const emojis = { 
    salary: "💸", wage: "💸", pay: "💸",
    barclays: "🦅", lloyds: "🐎", halifax: "✖️", monzo: "🔥", starling: "⭐", santander: "🔴", bank: "🏦",
    credit: "💳", card: "💳", loan: "🤝", mortgage: "🏠", klarna: "🛍️", clearpay: "🛒", paypal: "🅿️",
    save: "🐷", savings: "🍯", pot: "🍯", emergency: "🚨", holiday: "✈️", car: "🚗", wedding: "💍", invest: "📈",
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
    editingIndex = null; 
    document.getElementById('modal-title').innerText = "Add " + mode;
    document.querySelectorAll('.modal-content input, .modal-content select').forEach(el => el.value = "");
    
    document.getElementById('item-date').style.display = (mode === 'bill') ? 'block' : 'none';
    document.getElementById('item-overdraft').style.display = (mode === 'account') ? 'block' : 'none';
    document.getElementById('debt-type').style.display = (mode === 'debt') ? 'block' : 'none';
    document.getElementById('bill-type').style.display = (mode === 'bill') ? 'block' : 'none';
    document.getElementById('salary-account').style.display = (mode === 'salary') ? 'block' : 'none';
    document.getElementById('salary-date-type').style.display = (mode === 'salary') ? 'block' : 'none';
    document.getElementById('item-duration').style.display = 'none'; 

    if (mode === 'salary') {
        const accSelect = document.getElementById('salary-account');
        accSelect.innerHTML = '<option value="" disabled selected>Select Destination Account</option>';
        data.account.forEach((a, index) => { accSelect.innerHTML += `<option value="${index}">${a.name}</option>`; });
    }
    document.getElementById('input-modal').style.display = 'flex';
}

function checkDuration(type) {
    const val = document.getElementById(type + '-type').value;
    document.getElementById('item-duration').style.display = (val === 'Short Term Debt' || val === 'Short Term') ? 'block' : 'none';
    if(val !== 'Short Term Debt' && val !== 'Short Term') document.getElementById('item-duration').value = "";
}

function toggleSalaryDate() {
    const val = document.getElementById('salary-date-type').value;
    document.getElementById('item-date').style.display = (val === 'specific') ? 'block' : 'none';
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; editingIndex = null; }

function saveItem() {
    const name = document.getElementById('item-name').value;
    const amount = parseFloat(document.getElementById('item-amount').value) || 0;
    const date = parseInt(document.getElementById('item-date').value) || 1;
    const overdraft = parseFloat(document.getElementById('item-overdraft').value) || 0;
    let subType = "", duration = null, salaryAcc = null, salaryDateType = null;

    if (currentMode === 'debt') {
        subType = document.getElementById('debt-type').value;
        if (subType === 'Short Term Debt') duration = document.getElementById('item-duration').value;
    } else if (currentMode === 'bill') {
        subType = document.getElementById('bill-type').value;
        if (subType === 'Short Term') duration = document.getElementById('item-duration').value;
    } else if (currentMode === 'salary') {
        salaryAcc = parseInt(document.getElementById('salary-account').value);
        salaryDateType = document.getElementById('salary-date-type').value;
    }

    if (name) {
        if (editingIndex !== null && currentMode === 'account') {
            data.account[editingIndex].name = name;
            data.account[editingIndex].amount = amount;
            data.account[editingIndex].overdraft = overdraft;
        } else {
            if (currentMode === 'account') data.account.push({ name, amount, overdraft, transactions: [] });
            else if (currentMode === 'bill') data.bills.push({ name, amount, date, paid: false, subType, duration });
            else if (currentMode === 'debt') data.debt.push({ name, amount, subType, duration });
            else if (currentMode === 'salary') data.salaries.push({ name, amount, accountIndex: salaryAcc, dateType: salaryDateType, date: (salaryDateType === 'specific' ? date : null), lastPaidMonth: null });
            else data.savings.push({ name, amount });
        }
        editingIndex = null; render(); closeModal('input-modal');
    }
}

// --- NEW TRANSACTION LOGIC ---
function toggleTxFields() {
    const type = document.getElementById('tx-type').value;
    document.getElementById('tx-merchant').style.display = type === 'purchase' ? 'block' : 'none';
    document.getElementById('tx-transfer-to').style.display = type === 'transfer' ? 'block' : 'none';
    document.getElementById('tx-credit-desc').style.display = type === 'credit' ? 'block' : 'none';
    checkMerchant();
}

function checkMerchant() {
    const type = document.getElementById('tx-type').value;
    const merch = document.getElementById('tx-merchant').value;
    document.getElementById('tx-desc-other').style.display = (type === 'purchase' && merch === 'Other') ? 'block' : 'none';
}

function openAccountDetails(idx) {
    currentAccountIndex = idx;
    const acc = data.account[idx];
    
    // Setup Modal Info
    document.getElementById('acc-modal-title').innerText = `${getEmoji(acc.name)} ${acc.name}`;
    let balanceDisplay = acc.amount >= 0 ? `£${acc.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}` : `-£${Math.abs(acc.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    const balElement = document.getElementById('acc-modal-balance');
    balElement.innerText = balanceDisplay;
    balElement.style.color = acc.amount >= 0 ? 'var(--success)' : 'var(--danger)';
    
    // Reset Transaction Fields
    document.getElementById('tx-amount').value = '';
    document.getElementById('tx-type').value = 'purchase';
    document.getElementById('tx-merchant').value = '';
    document.getElementById('tx-desc-other').value = '';
    document.getElementById('tx-credit-desc').value = '';
    
    // Build Transfer Dropdown dynamically
    const transferSelect = document.getElementById('tx-transfer-to');
    transferSelect.innerHTML = '<option value="" disabled selected>Select Destination...</option>';
    
    let accGrp = '<optgroup label="Bank Accounts">';
    data.account.forEach((a, i) => { if (i !== idx) accGrp += `<option value="acc_${i}">${a.name}</option>`; });
    accGrp += '</optgroup>';
    
    let savGrp = '<optgroup label="Savings Pots">';
    data.savings.forEach((s, i) => { savGrp += `<option value="sav_${i}">${s.name}</option>`; });
    savGrp += '</optgroup>';
    
    let debtGrp = '<optgroup label="Debts & Loans">';
    data.debt.forEach((d, i) => { debtGrp += `<option value="debt_${i}">${d.name}</option>`; });
    debtGrp += '</optgroup>';
    
    transferSelect.innerHTML += accGrp + savGrp + debtGrp;
    toggleTxFields();

    // Render Recent Activity (Now shows Descriptions!)
    const txList = document.getElementById('transactions-list');
    txList.innerHTML = acc.transactions.length ? acc.transactions.map(tx => {
        const descText = tx.desc || (tx.type === 'in' ? 'Deposit' : 'Purchase');
        return `
        <div class="tx-item" style="align-items: center;">
            <div>
                <div style="color:#e2e8f0; font-size: 0.95rem; font-weight: bold;">${descText}</div>
                <div style="color:#64748b; font-size: 0.75rem;">${tx.date}</div>
            </div>
            <span class="${tx.type === 'in' ? 'tx-in' : ''}">${tx.type === 'in' ? '+' : '-'}£${tx.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
        </div>`;
    }).join('') : '<p style="color:#64748b">No recent activity.</p>';
    
    document.getElementById('account-modal').style.display = 'flex';
}

function processTransaction() {
    const amt = parseFloat(document.getElementById('tx-amount').value);
    if (!amt || amt <= 0 || currentAccountIndex === null) return;
    
    const acc = data.account[currentAccountIndex];
    const type = document.getElementById('tx-type').value;
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    
    if (type === 'purchase') {
        let merchant = document.getElementById('tx-merchant').value;
        if (!merchant) return alert('Please select a category.');
        if (merchant === 'Other') merchant = document.getElementById('tx-desc-other').value || 'Purchase';
        
        acc.amount -= amt;
        logTx(acc, amt, 'out', merchant, dateStr);
        
    } else if (type === 'credit') {
        let desc = document.getElementById('tx-credit-desc').value || 'Credit / Refund';
        acc.amount += amt;
        logTx(acc, amt, 'in', desc, dateStr);
        
    } else if (type === 'transfer') {
        const target = document.getElementById('tx-transfer-to').value;
        if (!target) return alert('Please select a destination.');
        
        const [targetType, targetIdx] = target.split('_');
        const idx = parseInt(targetIdx);
        let targetName = "";
        
        acc.amount -= amt; // Deduct from current
        
        if (targetType === 'acc') {
            const tAcc = data.account[idx];
            tAcc.amount += amt;
            targetName = tAcc.name;
            logTx(tAcc, amt, 'in', `Transfer from ${acc.name}`, dateStr);
        } else if (targetType === 'sav') {
            const tSav = data.savings[idx];
            tSav.amount += amt;
            targetName = tSav.name;
        } else if (targetType === 'debt') {
            const tDebt = data.debt[idx];
            tDebt.amount -= amt; // Paying debt REDUCES the owed amount!
            targetName = tDebt.name;
        }
        
        logTx(acc, amt, 'out', `Transfer to ${targetName}`, dateStr);
    }
    
    render();
    openAccountDetails(currentAccountIndex);
}

function editCurrentAccount() {
    closeModal('account-modal');
    currentMode = 'account';
    editingIndex = currentAccountIndex; 
    const acc = data.account[currentAccountIndex];
    
    document.getElementById('modal-title').innerText = "Edit Account";
    document.getElementById('item-name').value = acc.name;
    document.getElementById('item-amount').value = acc.amount;
    document.getElementById('item-overdraft').value = acc.overdraft || 0;
    
    document.getElementById('item-date').style.display = 'none';
    document.getElementById('debt-type').style.display = 'none';
    document.getElementById('bill-type').style.display = 'none';
    document.getElementById('item-duration').style.display = 'none';
    document.getElementById('salary-account').style.display = 'none';
    document.getElementById('salary-date-type').style.display = 'none';
    document.getElementById('item-overdraft').style.display = 'block';

    document.getElementById('input-modal').style.display = 'flex';
}

function toggleBill(idx) { data.bills[idx].paid = !data.bills[idx].paid; render(); }

// 4. RENDER
function render() {
    localStorage.setItem('financeApp', JSON.stringify(data));
    const now = new Date();
    
    // --- SALARIES ---
    const salariesList = document.getElementById('salaries-list');
    salariesList.innerHTML = '';
    if (data.salaries.length === 0) {
        salariesList.innerHTML = '<p style="color:#64748b; font-size: 0.9rem;">No upcoming income added.</p>';
    } else {
        data.salaries.map((s, i) => {
            let actualPayday = s.dateType === 'last' ? getLastWorkingDayOfMonth(now.getFullYear(), now.getMonth()) : getPreviousWorkingDay(now.getFullYear(), now.getMonth(), s.date);
            return { ...s, idx: i, actualPayday };
        }).sort((a,b) => a.actualPayday - b.actualPayday).forEach(s => {
            const isPaid = (s.lastPaidMonth === currentMonthKey);
            const payStr = `Payday: ${s.actualPayday.toLocaleDateString('en-GB',{weekday:'short', day:'numeric', month:'short'})}`;
            const targetAccountName = data.account[s.accountIndex] ? data.account[s.accountIndex].name : 'Unknown';
            const paidBadge = isPaid ? `<span style="background: rgba(16, 185, 129, 0.2); color: var(--success); font-size:0.7rem; padding:3px 6px; border-radius:6px; margin-left:8px;">Deposited ✓</span>` : '';

            salariesList.innerHTML += `
                <div class="list-item" style="border-left: 4px solid var(--primary); opacity: ${isPaid ? '0.6' : '1'};">
                    <div>
                        <div style="margin-bottom:8px"><span class="bill-date" style="background:var(--primary); color:#fff">${payStr}</span> ${paidBadge}</div>
                        <strong>${getEmoji(s.name)} ${s.name}</strong>
                        <div style="color:#94a3b8; font-size:0.8rem; margin-top:4px">Into: ${targetAccountName}</div>
                    </div>
                    <div style="color:var(--success); font-size:1.1rem; font-weight:bold;">+£${s.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                </div>`;
        });
    }

    // --- ACCOUNTS ---
    document.getElementById('accounts-list').innerHTML = data.account.map((a, i) => {
        let balanceDisplay = a.amount >= 0 ? `£${a.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}` : `-£${Math.abs(a.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        let balanceColor = a.amount >= 0 ? 'var(--text)' : 'var(--danger)';
        let odText = '';
        if (a.overdraft > 0) {
            if (a.amount < 0) {
                let available = a.overdraft + a.amount; 
                odText = `<div class="tile-sub">OD: £${a.overdraft.toLocaleString()} | Avail: £${available.toLocaleString()}</div>`;
            } else { odText = `<div class="tile-sub">OD Facility: £${a.overdraft.toLocaleString()}</div>`; }
        }
        return `<div class="tile" onclick="openAccountDetails(${i})"><span class="tile-emoji">${getEmoji(a.name)}</span><h4>${a.name}</h4><p style="color: ${balanceColor}">${balanceDisplay}</p>${odText}</div>`;
    }).join('');

    // --- DEBTS ---
    document.getElementById('debts-list').innerHTML = data.debt.map(item => {
        let subText = item.subType || "";
        if (item.duration) subText += ` (${item.duration}m remaining)`;
        return `<div class="tile"><span class="tile-emoji">${getEmoji(item.name)}</span><h4>${item.name}</h4><p>£${item.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>${subText ? `<div class="tile-sub">${subText}</div>` : ''}</div>`;
    }).join('');

    // --- SAVINGS ---
    document.getElementById('savings-list').innerHTML = data.savings.map(item => `<div class="tile"><span class="tile-emoji">${getEmoji(item.name)}</span><h4>${item.name}</h4><p>£${item.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</p></div>`).join('');

    // --- BILLS ---
    const billsList = document.getElementById('bills-list');
    billsList.innerHTML = '';
    data.bills.map((b, i) => {
        const actual = getNextWorkingDay(now.getFullYear(), now.getMonth(), b.date);
        return { ...b, idx: i, actual };
    }).sort((a,b) => a.actual - b.actual).forEach(b => {
        const isMoved = b.date !== b.actual.getDate();
        const dateStr = isMoved ? `<span class="bill-date" style="text-decoration:line-through; opacity:0.5">${b.date}th</span> <span class="bill-date" style="background:var(--success); color:#fff">Due: ${b.actual.toLocaleDateString('en-GB',{weekday:'short', day:'numeric', month:'short'})}</span>` : `<span class="bill-date">${b.date}th</span>`;
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
