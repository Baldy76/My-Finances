/**
 * COMMAND CENTER BRAIN (app.js)
 * v2.0 - Account Centric Architecture
 */

console.log("Brain Booting...");

// --- DATA STATE ---
let accounts = (JSON.parse(localStorage.getItem('myAccounts')) || []).map(a => ({...a, overdraft: parseFloat(a.overdraft) || 0}));
let debts = (JSON.parse(localStorage.getItem('myDebts')) || []).map(d => ({...d, limit: parseFloat(d.limit) || 0})); 
let pots = (JSON.parse(localStorage.getItem('myPots')) || []).map(p => ({...p, balance: parseFloat(p.balance) || 0}));
// Bills now need to link to accounts and track paid states
let cashflowData = JSON.parse(localStorage.getItem('cashflowData')) || [];
let historyLog = JSON.parse(localStorage.getItem('myHistory')) || [];

const today = new Date();
const currentYear = today.getFullYear();
const currentDay = today.getDate();
const currentMonthNum = today.getMonth(); 
const currentMonthKey = `${currentYear}-${currentMonthNum}`; // e.g. "2026-2" for March 2026

// Formatting helper for date inputs
const todayIso = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

// --- NAVIGATION & SHEETS ---
window.switchView = function(viewId) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('view-active'));
    document.getElementById(`view-${viewId}`).classList.add('view-active');
    window.scrollTo(0,0);
    
    if(viewId === 'home') renderAccountsHub();
    if(viewId === 'admin') renderAdminList();
    if(viewId === 'vault') renderVault();
    if(viewId === 'history') renderHistory();
    if(viewId === 'analytics') generateAnalytics();
    
    if(window.lucide) lucide.createIcons();
    if(navigator.vibrate) navigator.vibrate(10);
};

window.openSheet = function(sheetId) {
    document.getElementById(sheetId).classList.add('sheet-open');
    if(window.lucide) lucide.createIcons();
    if(navigator.vibrate) navigator.vibrate(10);
};

window.closeSheet = function(sheetId) {
    document.getElementById(sheetId).classList.remove('sheet-open');
};

// --- BOOT ---
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Set date
        document.getElementById('date-display-home').innerText = today.toLocaleString('en-GB', {weekday:'short', day:'numeric', month:'long'});
        // Populate day selectors for new bills
        const daySel = document.getElementById('new-bill-day');
        if(daySel) { for(let i=1; i<=31; i++) { let o = document.createElement('option'); o.value=i; o.innerText=i; daySel.appendChild(o); } }
        
        // Initial Renders
        renderAccountsHub();
        
        // Hide loader
        const shield = document.getElementById('loading-shield');
        if(shield) { setTimeout(() => { shield.style.opacity = '0'; setTimeout(() => shield.remove(), 500); }, 400); }

        setupThemeToggle();
    } catch (err) { console.error("Boot failure:", err); }
});

// --- CORE RENDERING (HOME SCREEN) ---
function renderAccountsHub() {
    const hub = document.getElementById('accounts-hub-list');
    const emptyState = document.getElementById('empty-state-home');
    
    if(accounts.length === 0) {
        hub.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    hub.innerHTML = '';

    accounts.forEach(acc => {
        const avail = (parseFloat(acc.balance)||0) + (parseFloat(acc.overdraft)||0);
        const balColor = (parseFloat(acc.balance)||0) < 0 ? 'text-red-500' : 'text-slate-900 dark:text-white';
        
        // CSS Card Generation (Replaces Clearbit Logos)
        const init = acc.name.substring(0,2).toUpperCase();
        
        hub.innerHTML += `
            <div class="bg-white dark:bg-cardbg rounded-[2rem] p-6 shadow-xl border border-slate-100 dark:border-gray-800 relative overflow-hidden">
                <div class="absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-10" style="background-color: ${acc.color}; filter: blur(30px);"></div>
                
                <div class="flex justify-between items-start mb-6 relative z-10">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-2xl flex justify-center items-center font-black text-sm text-white shadow-md" style="background: linear-gradient(135deg, ${acc.color}, #0F172A);">${init}</div>
                        <div>
                            <h2 class="font-black text-xl tracking-tight">${acc.name}</h2>
                            ${acc.overdraft > 0 ? `<p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">OD Limit: £${acc.overdraft}</p>` : ''}
                        </div>
                    </div>
                </div>

                <div class="mb-6 relative z-10">
                    <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Balance</p>
                    <p class="text-4xl font-black tracking-tighter ${balColor}">£${(parseFloat(acc.balance)||0).toFixed(2)}</p>
                </div>

                <div class="grid grid-cols-2 gap-3 relative z-10">
                    <button onclick="launchBillsSheet(${acc.id})" class="bg-slate-50 dark:bg-gray-800 text-slate-900 dark:text-white py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform border border-slate-200 dark:border-gray-700">
                        <i data-lucide="calendar-check" class="w-4 h-4 text-starling"></i> View Bills
                    </button>
                    <button onclick="launchSpendSheet(${acc.id})" class="bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md">
                        <i data-lucide="shopping-bag" class="w-4 h-4"></i> Log Spend
                    </button>
                </div>
            </div>
        `;
    });
    if(window.lucide) lucide.createIcons();
}

// --- QUICK SPEND LOGIC ---
let selectedMerchant = 'Other';

window.selectMerchant = function(element, merchant) {
    document.querySelectorAll('.merchant-pill').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    selectedMerchant = merchant;
    
    const customInput = document.getElementById('spend-custom-merchant');
    if(merchant === 'Other') {
        customInput.classList.remove('hidden');
        customInput.focus();
    } else {
        customInput.classList.add('hidden');
        customInput.value = '';
    }
}

window.launchSpendSheet = function(accountId) {
    const acc = accounts.find(a => a.id === accountId);
    if(!acc) return;
    
    document.getElementById('spend-sheet-title').innerText = `Spend from ${acc.name}`;
    document.getElementById('spend-active-account').value = accountId;
    document.getElementById('spend-date').value = todayIso;
    document.getElementById('spend-amt').value = '';
    
    // Reset to 'Other'
    const pills = document.querySelectorAll('.merchant-pill');
    if(pills.length > 0) selectMerchant(pills[pills.length-1], 'Other');
    
    openSheet('sheet-spend');
}

window.submitSpend = function() {
    const accId = parseInt(document.getElementById('spend-active-account').value);
    const amt = parseFloat(document.getElementById('spend-amt').value);
    let merchant = selectedMerchant === 'Other' ? document.getElementById('spend-custom-merchant').value : selectedMerchant;
    const dateStr = document.getElementById('spend-date').value; // YYYY-MM-DD

    if(!amt || !merchant) return alert("Please enter amount and merchant.");

    const acc = accounts.find(a => a.id === accId);
    if(acc) {
        acc.balance -= amt;
        
        // Format date for history log nicely
        const dObj = new Date(dateStr);
        const fDate = dObj.toLocaleString('en-GB',{day:'numeric',month:'short'});
        
        historyLog.unshift({ id: Date.now(), title: merchant, amount: `-£${amt.toFixed(2)}`, desc: `Paid from ${acc.name}`, timestamp: fDate, color: 'text-slate-800 dark:text-white' });
        if(historyLog.length > 100) historyLog.pop();
        
        saveData();
        renderAccountsHub();
        closeSheet('sheet-spend');
    }
}

// --- BILLS CALENDAR LOGIC ---
function resolveActualDay(dayStr) {
    if (dayStr === 'last_working_day') {
        let lastDay = new Date(currentYear, currentMonthNum + 1, 0); 
        if (lastDay.getDay() === 0) lastDay.setDate(lastDay.getDate() - 2); 
        else if (lastDay.getDay() === 6) lastDay.setDate(lastDay.getDate() - 1); 
        return lastDay.getDate();
    }
    let checkDate = new Date(currentYear, currentMonthNum, parseInt(dayStr));
    if (checkDate.getMonth() !== currentMonthNum) checkDate = new Date(currentYear, currentMonthNum + 1, 0);
    const dow = checkDate.getDay();
    if (dow === 0 || dow === 6) checkDate.setDate(checkDate.getDate() + (dow === 0 ? 1 : 2)); // Bills push forward
    return checkDate.getDate();
}

window.launchBillsSheet = function(accountId) {
    const acc = accounts.find(a => a.id === accountId);
    if(!acc) return;
    
    document.getElementById('bills-active-account').value = accountId;
    document.getElementById('bills-sheet-title').innerText = `${acc.name} Bills`;
    
    const dueList = document.getElementById('bills-due-list');
    const paidList = document.getElementById('bills-paid-list');
    dueList.innerHTML = ''; paidList.innerHTML = '';
    
    let hasDue = false;

    // Get bills for this account
    const accBills = cashflowData
        .filter(b => b.accountId === accountId && (b.frequency === 'monthly' || b.frequency === 'one_off'))
        .map(b => ({...b, actualDay: resolveActualDay(b.day)}))
        .sort((a,b) => a.actualDay - b.actualDay);

    accBills.forEach(bill => {
        const isPaidThisMonth = bill.paidMonths && bill.paidMonths.includes(currentMonthKey);
        
        const html = `
            <div class="bg-slate-50 dark:bg-gray-800 p-4 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-transparent">
                <div class="flex items-center gap-3">
                    <button onclick="toggleBillPaid(${bill.id}, ${accountId})" class="w-6 h-6 rounded-full border-2 ${isPaidThisMonth ? 'bg-starling border-starling text-slate-900' : 'border-slate-300 dark:border-gray-600 text-transparent'} flex items-center justify-center transition-colors">
                        <i data-lucide="check" class="w-4 h-4"></i>
                    </button>
                    <div>
                        <p class="font-black text-sm ${isPaidThisMonth ? 'line-through opacity-50' : ''}">${bill.name}</p>
                        <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Day ${bill.actualDay}</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <p class="font-black text-sm">£${bill.amount.toFixed(2)}</p>
                    <button onclick="deleteBill(${bill.id}, ${accountId})" class="text-red-400 opacity-50 hover:opacity-100"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>
        `;

        if(isPaidThisMonth) {
            paidList.innerHTML += html;
        } else {
            hasDue = true;
            dueList.innerHTML += html;
        }
    });

    document.getElementById('no-bills-due').classList.toggle('hidden', hasDue);
    if(window.lucide) lucide.createIcons();
    openSheet('sheet-bills');
}

window.toggleBillPaid = function(billId, accId) {
    const bill = cashflowData.find(b => b.id === billId);
    if(!bill) return;
    
    if(!bill.paidMonths) bill.paidMonths = [];
    
    const index = bill.paidMonths.indexOf(currentMonthKey);
    const acc = accounts.find(a => a.id === accId);

    if(index > -1) {
        // Unmark paid (Refund the account conceptually, though usually people just toggle UI. Let's just toggle UI state for now to keep balance manual control clean, or auto-deduct? Auto-deduct is better UX).
        bill.paidMonths.splice(index, 1);
        if(acc) acc.balance += bill.amount; // Refund
    } else {
        // Mark paid
        bill.paidMonths.push(currentMonthKey);
        if(acc) acc.balance -= bill.amount; // Deduct
        recordTx(bill.name, `-£${bill.amount.toFixed(2)}`, `Bill paid from ${acc.name}`, 'text-red-500');
    }
    
    saveData();
    renderAccountsHub(); // Update background balance
    launchBillsSheet(accId); // Refresh sheet
}

window.openAddBillModal = function() {
    document.getElementById('new-bill-name').value = '';
    document.getElementById('new-bill-amount').value = '';
    closeSheet('sheet-bills');
    setTimeout(() => openSheet('sheet-add-bill'), 300); // Wait for first sheet to close
}

window.submitNewBill = function() {
    const accId = parseInt(document.getElementById('bills-active-account').value);
    const name = document.getElementById('new-bill-name').value;
    const amount = parseFloat(document.getElementById('new-bill-amount').value);
    const day = document.getElementById('new-bill-day').value;
    const freq = document.getElementById('new-bill-freq').value;

    if(!name || !amount || !day) return alert("Please fill all fields.");

    cashflowData.push({ id: Date.now(), accountId: accId, type: 'bill', frequency: freq, day: day, name, amount, paidMonths: [] });
    saveData();
    
    closeSheet('sheet-add-bill');
    setTimeout(() => launchBillsSheet(accId), 300);
}

window.deleteBill = function(billId, accId) {
    if(!confirm("Delete this bill entirely?")) return;
    cashflowData = cashflowData.filter(b => b.id !== billId);
    saveData();
    launchBillsSheet(accId);
}

// --- ADMIN, VAULT, HISTORY (Standard Functions) ---
function createAccount() {
    const type = document.getElementById('admin-type').value;
    const name = document.getElementById('admin-name').value;
    const sec = parseFloat(document.getElementById('admin-secondary').value) || 0;
    if(!name) return alert("Enter name");
    
    const colorThemes = ['#8B5CF6', '#F59E0B', '#EC4899', '#3B82F6', '#10B981', '#EF4444'];
    const newObj = { id: Date.now(), name, balance: 0, color: colorThemes[Math.floor(Math.random() * colorThemes.length)] };
    
    if(type === 'bank') { newObj.overdraft = sec; accounts.push(newObj); }
    else if(type === 'debt') { newObj.limit = sec; debts.push(newObj); }
    else { pots.push(newObj); }
    
    document.getElementById('admin-name').value = ''; document.getElementById('admin-secondary').value = '';
    saveData(); renderAdminList();
}

function renderAdminList() {
    const list = document.getElementById('admin-list'); if(!list) return;
    list.innerHTML = '';
    const all = [...accounts.map(a=>({...a, t:'bank'})), ...debts.map(d=>({...d, t:'debt'})), ...pots.map(p=>({...p, t:'pot'}))];
    all.forEach(item => {
        list.innerHTML += `<div class="bg-white dark:bg-gray-800 p-4 rounded-2xl flex justify-between items-center mb-2 shadow-sm">
            <p class="text-sm font-black">${item.name} <span class="text-[9px] opacity-40 uppercase ml-2">${item.t}</span></p>
            <button onclick="deleteAccount('${item.t}', ${item.id})" class="text-red-500 p-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>`;
    });
    if(window.lucide) lucide.createIcons();
}

window.deleteAccount = function(type, id) {
    if(!confirm("Delete?")) return;
    if(type==='bank') { accounts=accounts.filter(a=>a.id!==id); cashflowData = cashflowData.filter(b=>b.accountId!==id); }
    else if(type==='debt') debts=debts.filter(d=>d.id!==id); 
    else pots=pots.filter(p=>p.id!==id);
    saveData(); renderAdminList();
};

function renderVault() {
    const pList = document.getElementById('pots-dashboard-list'); pList.innerHTML = '';
    pots.forEach(p => {
        pList.innerHTML += `<div class="bg-white dark:bg-gray-800 p-5 rounded-3xl mb-3 shadow-sm flex justify-between items-center border border-slate-100 dark:border-transparent">
            <div><p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">${p.name}</p><p class="text-2xl font-black text-yellow-500">£${(parseFloat(p.balance)||0).toFixed(2)}</p></div>
            <button onclick="withdrawFromPot(${p.id})" class="bg-slate-100 dark:bg-gray-700 px-4 py-2 rounded-xl font-black text-xs active:scale-95 transition-transform">Withdraw</button></div>`;
    });
    const dList = document.getElementById('debt-dashboard-list'); dList.innerHTML = '';
    debts.forEach(d => {
        const util = d.limit > 0 ? Math.min((d.balance / d.limit) * 100, 100) : 0;
        dList.innerHTML += `<div class="bg-white dark:bg-gray-800 p-6 rounded-3xl mb-3 shadow-sm border border-slate-100 dark:border-transparent">
            <div class="flex justify-between items-center mb-2"><p class="text-sm font-black">${d.name}</p><p class="text-xl font-black text-red-500">£${(parseFloat(d.balance)||0).toFixed(2)}</p></div>
            ${d.limit > 0 ? `<div class="w-full bg-slate-100 dark:bg-gray-900 h-1.5 rounded-full overflow-hidden mb-4"><div class="bg-red-500 h-full" style="width: ${util}%"></div></div>` : ''}
            <div class="flex gap-2">
                <button onclick="payDebt(${d.id})" class="flex-1 bg-starling py-3 rounded-xl font-black text-xs text-slate-900 active:scale-95 transition-transform">Pay</button>
                <button onclick="addInterest(${d.id})" class="flex-1 bg-red-50 dark:bg-red-900/30 text-red-500 py-3 rounded-xl font-black text-xs active:scale-95 transition-transform">+ Int</button></div></div>`;
    });
    document.getElementById('total-debt-display').innerText = `£${debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0).toFixed(2)}`;
}

window.payDebt = function(id) { let a = prompt("Amount?"); if(a) { debts.find(x=>x.id==id).balance -= parseFloat(a); saveData(); renderVault(); recordTx(`Paid Debt`, `-£${a}`); } };
window.addInterest = function(id) { let a = prompt("Amount?"); if(a) { debts.find(x=>x.id==id).balance += parseFloat(a); saveData(); renderVault(); recordTx(`Interest`, `+£${a}`); } };
window.withdrawFromPot = function(id) { let a = prompt("Amount?"); if(a) { pots.find(x=>x.id==id).balance -= parseFloat(a); saveData(); renderVault(); recordTx(`Withdraw`, `-£${a}`, 'From Pot'); } };

function renderHistory() {
    const list = document.getElementById('history-list'); list.innerHTML = '';
    if(historyLog.length===0) list.innerHTML = '<p class="text-center p-8 opacity-50 font-black text-[10px] uppercase tracking-widest">No Logs</p>';
    historyLog.forEach(tx => {
        list.innerHTML += `<div class="bg-white dark:bg-gray-800 p-5 rounded-3xl mb-3 flex justify-between shadow-sm border border-slate-100 dark:border-transparent">
            <div><p class="text-sm font-black">${tx.title}</p><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">${tx.timestamp} • ${tx.desc}</p></div>
            <p class="font-black text-lg ${tx.color}">${tx.amount}</p></div>`;
    });
}
window.clearHistory = function() { if(confirm("Wipe?")) { historyLog = []; saveData(); renderHistory(); } };

function generateAnalytics() {
    const cash = accounts.reduce((s,a)=>s+(parseFloat(a.balance)||0),0), potVal = pots.reduce((s,p)=>s+(parseFloat(p.balance)||0),0), debtVal = debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);
    const grand = cash + potVal - debtVal, total = Math.abs(cash) + Math.abs(potVal) + Math.abs(debtVal);
    document.getElementById('analytics-total').innerText = `£${grand.toFixed(0)}`;
    const chart = document.getElementById('donut-chart');
    if(total <= 0) { chart.style.background = '#334155'; } else {
        const p1 = (Math.abs(cash)/total)*360, p2 = (Math.abs(potVal)/total)*360;
        chart.style.background = `conic-gradient(#00E6C3 0deg ${p1}deg, #FBBF24 ${p1}deg ${p1+p2}deg, #EF4444 ${p1+p2}deg 360deg)`;
    }
}

// Data Handling
function saveData() {
    localStorage.setItem('myAccounts', JSON.stringify(accounts));
    localStorage.setItem('myDebts', JSON.stringify(debts));
    localStorage.setItem('myPots', JSON.stringify(pots));
    localStorage.setItem('cashflowData', JSON.stringify(cashflowData));
    localStorage.setItem('myHistory', JSON.stringify(historyLog));
}

function setupThemeToggle() {
    document.getElementById('theme-toggle-btn').onclick = () => {
        const h = document.documentElement;
        if(h.classList.contains('dark')) { h.classList.remove('dark'); localStorage.setItem('appTheme', 'light'); }
        else { h.classList.add('dark'); localStorage.setItem('appTheme', 'dark'); }
    };
}
document.getElementById('add-account-btn').onclick = createAccount;
