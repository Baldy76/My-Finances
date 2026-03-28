// 1. DATA ENGINE
let data = JSON.parse(localStorage.getItem('financeApp')) || {
    account: [],
    debt: [],
    savings: [],
    bills: []
};

// Retrofit old data if needed
data.account.forEach(acc => { if(!acc.transactions) acc.transactions = []; });
if(!data.bills) data.bills = [];

let currentMode = '';
let currentAccountIndex = null; 
let bankHolidays = JSON.parse(localStorage.getItem('ukBankHolidays')) || [];

// 2. FETCH UK BANK HOLIDAYS
async function loadBankHolidays() {
    // Only fetch if we don't have them to save data
    if (bankHolidays.length === 0) {
        try {
            const res = await fetch('https://www.gov.uk/bank-holidays.json');
            const govData = await res.json();
            // Extract dates for England and Wales (format: "YYYY-MM-DD")
            bankHolidays = govData['england-and-wales'].events.map(e => e.date);
            localStorage.setItem('ukBankHolidays', JSON.stringify(bankHolidays));
            saveAndRender(); // Re-render once we have the holidays
        } catch (e) {
            console.log("Could not load bank holidays. Using weekends only.");
        }
    }
}
loadBankHolidays();

// 3. SMART DATE CALCULATOR
function getNextWorkingDay(year, month, targetDay) {
    // Prevent errors if a month has fewer days than the bill date (e.g. Feb 31st -> Feb 28th)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let safeDay = Math.min(targetDay, daysInMonth);
    
    let date = new Date(year, month, safeDay);

    while (true) {
        let dayOfWeek = date.getDay();
        let dateString = date.toISOString().split('T')[0]; // Gets "YYYY-MM-DD"

        // Check if it's a Weekend (0 = Sunday, 6 = Saturday) OR a Bank Holiday
        let isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
        let isHoliday = bankHolidays.includes(dateString);

        if (isWeekend || isHoliday) {
            date.setDate(date.getDate() + 1); // Push forward 1 day
        } else {
            break; // It's a working day!
        }
    }
    return date;
}

// 4. EMOJI ENGINE
const emojis = { bank: "🏦", savings: "💰", card: "💳", holiday: "✈️", klarna: "🛍️", loan: "📉", gas: "🔥", electric: "⚡", water: "💧", mobile: "📱", internet: "🌐", default: "✨" };
function getEmoji(name) {
    let lowerName = name.toLowerCase();
    for (let key in emojis) { if (lowerName.includes(key)) return emojis[key]; }
    return emojis.default;
}

// 5. NAVIGATION & MODALS
function switchTab(pageId, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-btn'));
    document.getElementById(pageId).classList.add('active');
    btn.classList.add('active-btn');
}

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

// 6. SAVING ITEMS & TRANSACTIONS
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
        
        if (type === 'in') acc.amount += amount;
        else acc.amount -= amount;

        acc.transactions.unshift({ amount, type, date: dateStr });
        if (acc.transactions.length > 20) acc.transactions.pop();

        amountInput.value = '';
        saveAndRender();
        openAccountDetails(currentAccountIndex);
    }
}

function renderTransactions(acc) {
    const list = document.getElementById('transactions-list');
    list.innerHTML = '';
    if (acc.transactions.length === 0) return list.innerHTML = '<p style="color:#64748b;">No recent transactions.</p>';
    
    acc.transactions.forEach(tx => {
        const sign = tx.type === 'in' ? '+' : '-';
        const colorClass = tx.type === 'in' ? 'tx-in' : 'tx-out';
        list.innerHTML += `<div class="tx-item"><span style="color:#94a3b8">${tx.date}</span><span class="${colorClass}">${sign}£${tx.amount.toLocaleString()}</span></div>`;
    });
}

function toggleBill(index) {
    data.bills[index].paid = !data.bills[index].paid;
    saveAndRender();
}

// 7. MASTER RENDER (With Smart Sorting)
function saveAndRender() {
    localStorage.setItem('financeApp', JSON.stringify(data));
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Accounts
    const accList = document.getElementById('accounts-list');
    accList.innerHTML = '';
    data.account.forEach((item, index) => {
        accList.innerHTML += `<div class="tile" onclick="openAccountDetails(${index})"><span class="tile-emoji">${getEmoji(item.name)}</span><h4>${item.name}</h4><p>£${item.amount.toLocaleString()}</p></div>`;
    });

    // Smart Bills 
    const billsList = document.getElementById('bills-list');
    billsList.innerHTML = '';
    
    // Step 1: Calculate actual due dates for this month
    let processedBills = data.bills.map((item, index) => {
        let actualDateObj = getNextWorkingDay(currentYear, currentMonth, item.date);
        return { ...item, originalIndex: index, actualDateObj };
    });

    // Step 2: Sort by the newly calculated actual dates
    processedBills.sort((a, b) => a.actualDateObj - b.actualDateObj).forEach(item => {
        const paidClass = item.paid ? 'bill-paid' : '';
        const btnClass = item.paid ? 'badge-paid' : 'badge-unpaid';
        const btnText = item.paid ? 'Paid ✓' : 'Mark Paid';
        
        // Format the date string for display (e.g., "Mon 16th")
        const actualDayNum = item.actualDateObj.getDate();
        const actualDayName = item.actualDateObj.toLocaleDateString('en-GB', { weekday: 'short' });
        
        let dateDisplay = `<span class="bill-date">${item.date}${getOrdinal(item.date)}</span>`;
        
        // If the date was pushed forward, show the change!
        if (item.date !== actualDayNum) {
            dateDisplay = `<span class="bill-date" style="background: rgba(239, 68, 68, 0.2); color: #fca5a5; text-decoration: line-through;">${item.date}${getOrdinal(item.date)}</span>
                           <span class="bill-date" style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7; margin-left: 5px;">Due: ${actualDayName} ${actualDayNum}${getOrdinal(actualDayNum)}</span>`;
        }

        billsList.innerHTML += `
            <div class="list-item ${paidClass}">
                <div>
                    <div style="margin-bottom: 6px;">${dateDisplay}</div>
                    <strong>${getEmoji(item.name)} ${item.name}</strong>
                    <div style="font-size:0.9rem; color:#94a3b8; margin-top:4px;">£${item.amount.toLocaleString()}</div>
                </div>
                <button class="${btnClass}" onclick="toggleBill(${item.originalIndex})">${btnText}</button>
            </div>`;
    });

    // Debts & Savings
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
