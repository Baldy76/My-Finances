// 1. DATA STATE
let data = JSON.parse(localStorage.getItem('financeApp')) || {
    account: [], debt: [], savings: [], bills: []
};

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
    document.getElementById('item-date').style.display = (mode === 'bill') ? 'block' : 'none';
    document.getElementById('input-modal').style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
    document.querySelectorAll('input').forEach(i => i.value = '');
}

function saveItem() {
    const name = document.getElementById('item-name').value;
    const amount = parseFloat(document.getElementById('item-amount').value) || 0;
    const date = parseInt(document.getElementById('item-date').value) || 1;

    if (name) {
        if (currentMode === 'account') data.account.push({ name, amount, transactions: [] });
        else if (currentMode === 'bill') data.bills.push({ name, amount, date, paid: false });
        else data[currentMode].push({ name, amount });
        render();
        closeModal('input-modal');
    }
}

function openAccountDetails(idx) {
    currentAccountIndex = idx;
    const acc = data.account[idx];
    document.getElementById('acc-modal-title').innerText = `${getEmoji(acc.name)} ${acc.name}`;
    document.getElementById('acc-modal-balance').innerText = `£${acc.amount.toLocaleString()}`;
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
    
    // Accounts
    document.getElementById('accounts-list').innerHTML = data.account.map((a, i) => `
        <div class="tile" onclick="openAccountDetails(${i})">
            <span class="tile-emoji">${getEmoji(a.name)}</span>
            <h4>${a.name}</h4>
            <p>£${a.amount.toLocaleString()}</p>
        </div>`).join('');

    // Debts & Savings (Tiles)
    ['debts', 'savings'].forEach(key => {
        const list = key === 'debts' ? data.debt : data.savings;
        document.getElementById(key + '-list').innerHTML = list.map(item => `
            <div class="tile">
                <span class="tile-emoji">${getEmoji(item.name)}</span>
                <h4>${item.name}</h4>
                <p>£${item.amount.toLocaleString()}</p>
            </div>`).join('');
    });

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

        billsList.innerHTML += `
            <div class="list-item ${b.paid ? 'bill-paid' : ''}">
                <div>
                    <div style="margin-bottom:8px">${dateStr}</div>
                    <strong>${getEmoji(b.name)} ${b.name}</strong>
                    <div style="color:#94a3b8; font-size:0.9rem; margin-top:4px">£${b.amount.toLocaleString()}</div>
                </div>
                <button class="${b.paid ? 'badge-paid' : 'badge-unpaid'}" onclick="toggleBill(${b.idx})">${b.paid ? 'Paid ✓' : 'Mark Paid'}</button>
            </div>`;
    });
}

function clearAllData() { if(confirm("Delete everything?")) { localStorage.clear(); location.reload(); } }
render();
