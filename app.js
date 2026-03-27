/**
 * COMMAND CENTER BRAIN (app.js)
 * v1.0.0 - Full Build
 */

console.log("Brain Initializing...");

// --- GLOBAL STATE ---
let accounts = (JSON.parse(localStorage.getItem('myAccounts')) || []).map(a => ({...a, overdraft: a.overdraft || 0, domain: a.domain || ''}));
let debts = (JSON.parse(localStorage.getItem('myDebts')) || []).map(d => ({...d, limit: d.limit || 0, domain: d.domain || ''})); 
let pots = JSON.parse(localStorage.getItem('myPots')) || [];
let cashflowData = JSON.parse(localStorage.getItem('cashflowData')) || [];
let historyLog = JSON.parse(localStorage.getItem('myHistory')) || [];

const today = new Date();
const currentYear = today.getFullYear();
const currentDay = today.getDate();
const currentMonthNum = today.getMonth();
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log("DOM Loaded. Connecting UI...");
        initUI();
        updateApp();
        
        // Hide loading shield
        setTimeout(() => {
            const shield = document.getElementById('loading-shield');
            if(shield) shield.style.opacity = '0';
            setTimeout(() => shield ? shield.remove() : null, 500);
        }, 300);

    } catch (err) {
        console.error("Critical Brain Failure:", err);
        alert("Brain Error. Check console.");
    }
});

function initUI() {
    const dateEl = document.getElementById('date-display');
    if(dateEl) dateEl.innerText = `Today is ${monthNames[currentMonthNum]} ${currentDay}`;

    // Setup Selectors
    const daySelect = document.getElementById('cf-day');
    if(daySelect) {
        for(let i = 1; i <= 31; i++) {
            const opt = document.createElement('option');
            opt.value = i; opt.innerText = i;
            daySelect.appendChild(opt);
        }
    }
    const monthSelect = document.getElementById('cf-month');
    if(monthSelect) {
        monthNames.forEach((m, idx) => {
            const opt = document.createElement('option');
            opt.value = idx; opt.innerText = m;
            monthSelect.appendChild(opt);
        });
        monthSelect.value = currentMonthNum;
    }
    setupListeners();
}

// --- LOGO ENGINE ---
function getLogoUrl(item) {
    if (item.domain && item.domain.trim() !== '') return `https://logo.clearbit.com/${item.domain}`;
    const name = item.name.toLowerCase();
    if (name.includes('halifax')) return 'https://logo.clearbit.com/halifax.co.uk';
    if (name.includes('barclays')) return 'https://logo.clearbit.com/barclays.co.uk';
    if (name.includes('starling')) return 'https://logo.clearbit.com/starlingbank.com';
    if (name.includes('amex')) return 'https://logo.clearbit.com/americanexpress.com';
    if (name.includes('monzo')) return 'https://logo.clearbit.com/monzo.com';
    return null;
}

// --- SMART CALENDAR LOGIC (WEEKEND PAYROLL SHIFT) ---
function resolveActualDay(item) {
    let day = item.day;
    let dNum;

    if (day === 'last_working_day') {
        let lastDay = new Date(currentYear, currentMonthNum + 1, 0); 
        if (lastDay.getDay() === 0) lastDay.setDate(lastDay.getDate() - 2); 
        else if (lastDay.getDay() === 6) lastDay.setDate(lastDay.getDate() - 1); 
        return lastDay.getDate();
    }

    dNum = parseInt(day);
    let checkDate = new Date(currentYear, currentMonthNum, dNum);
    
    // Safety check for months with fewer days
    if (checkDate.getMonth() !== currentMonthNum) {
        checkDate = new Date(currentYear, currentMonthNum + 1, 0);
    }

    const dow = checkDate.getDay();
    if (dow === 0 || dow === 6) { // Weekend
        if (item.type === 'income') {
            // Pay comes EARLY on Friday
            checkDate.setDate(checkDate.getDate() - (dow === 0 ? 2 : 1));
        } else {
            // Bills come LATE on Monday
            checkDate.setDate(checkDate.getDate() + (dow === 0 ? 1 : 2));
        }
    }
    return checkDate.getDate();
}

function appliesThisMonth(item) {
    const freq = item.frequency || 'monthly';
    if (freq === 'monthly') return true;
    if (freq === 'one_off') return parseInt(item.month) === currentMonthNum;
    if (freq === 'quarterly') return (currentMonthNum - parseInt(item.month) + 12) % 3 === 0;
    return true;
}

// --- CORE UPDATE ENGINE ---
function updateApp() {
    console.log("Updating Application State...");
    const totalCashIncludingOD = accounts.reduce((s, a) => s + (parseFloat(a.balance)||0) + (parseFloat(a.overdraft) || 0), 0);
    
    let remainingBills = 0;
    let remainingIncome = 0;
    let alertsHtml = '';
    let upcomingHtml = '';

    const sortedEntries = cashflowData
        .filter(appliesThisMonth)
        .map(item => ({ ...item, actualDay: resolveActualDay(item) }))
        .sort((a, b) => a.actualDay - b.actualDay);

    const pending = sortedEntries.filter(item => item.actualDay >= currentDay);

    pending.forEach(item => {
        if (item.type === 'bill') remainingBills += item.amount;
        else remainingIncome += item.amount;

        let diff = item.actualDay - currentDay;
        let dueText = diff === 0 ? 'TODAY' : `in ${diff} days`;

        upcomingHtml += `
            <div class="flex justify-between items-center border-b border-slate-100 dark:border-gray-800/50 last:border-0 pb-3 last:pb-0 pt-3 first:pt-0">
                <div>
                    <p class="text-sm font-black text-slate-800 dark:text-white">${item.name}</p>
                    <p class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">${dueText}</p>
                </div>
                <p class="text-sm font-black ${item.type === 'bill' ? 'text-red-500' : 'text-starling'}">
                    ${item.type === 'bill' ? '-' : '+'}£${item.amount.toFixed(2)}
                </p>
            </div>
        `;

        if (item.manual && item.type === 'bill' && (diff === 0 || diff === 1)) {
            alertsHtml += `<div class="bg-red-500 text-white p-4 rounded-2xl text-sm font-black shadow-lg flex items-center gap-3">🚨 <span class="flex-1">Pay ${item.name} ${diff === 0 ? 'Today' : 'Tomorrow'}!</span><button onclick="this.parentElement.remove()" class="text-xl">✕</button></div>`;
        }
    });

    document.getElementById('alerts-container').innerHTML = alertsHtml;
    document.getElementById('upcoming-list').innerHTML = upcomingHtml;
    document.getElementById('no-upcoming').classList.toggle('hidden', pending.length > 0);

    const safeToSpend = totalCashIncludingOD - remainingBills;
    const projEOM = totalCashIncludingOD - remainingBills + remainingIncome;

    document.getElementById('safe-to-spend').innerText = `£${safeToSpend.toFixed(2)}`;
    document.getElementById('total-cash').innerText = `£${totalCashIncludingOD.toFixed(2)}`;
    document.getElementById('display-bills').innerText = `£${remainingBills.toFixed(2)}`;
    
    const barEl = document.getElementById('cash-bar');
    const safePercent = totalCashIncludingOD > 0 ? Math.max(0, Math.min(100, (safeToSpend / totalCashIncludingOD) * 100)) : 0;
    barEl.style.width = `${safePercent}%`;
    barEl.className = `h-2 rounded-full transition-all duration-1000 ease-out ${safePercent < 20 ? 'bg-red-500' : 'bg-starling'}`;

    renderAccounts();
    saveData();
    if(window.lucide) lucide.createIcons();
}

// --- RENDERING HELPERS ---
function renderAccounts() {
    const list = document.getElementById('accounts-list');
    list.innerHTML = '';
    accounts.forEach(acc => {
        const logo = getLogoUrl(acc);
        const iconHtml = logo 
            ? `<img src="${logo}" class="w-10 h-10 rounded-xl shadow-sm object-contain bg-white p-1" onerror="this.style.display='none'">`
            : `<div class="w-10 h-10 rounded-xl flex justify-center items-center font-black text-xs text-white" style="background-color: ${acc.color}">${acc.name.substring(0,2).toUpperCase()}</div>`;

        const avail = (parseFloat(acc.balance)||0) + (parseFloat(acc.overdraft) || 0);
        list.innerHTML += `
            <div class="flex justify-between items-center bg-white dark:bg-cardbg p-4 rounded-3xl border border-slate-100 dark:border-transparent shadow-sm mb-3">
                <div class="flex items-center gap-4">
                    ${iconHtml}
                    <div><p class="font-black text-slate-800 dark:text-white">${acc.name}</p><p class="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Avail: £${avail.toFixed(2)}</p></div>
                </div>
                <p class="font-black text-xl ${(parseFloat(acc.balance)||0) < 0 ? 'text-red-500' : 'text-slate-800 dark:text-white'}">£${(parseFloat(acc.balance)||0).toFixed(2)}</p>
            </div>
        `;
    });
}

// --- MODAL & BUTTON LISTENERS ---
function setupListeners() {
    console.log("Setting up button listeners...");
    
    const triggerMap = {
        'add-btn': {id: 'update-modal', render: renderTransactModal},
        'nav-cashflow': {id: 'cashflow-modal', render: renderLedger},
        'nav-vault': {id: 'vault-modal', render: renderVault},
        'nav-admin': {id: 'admin-modal', render: renderAdminList},
        'view-history-btn': {id: 'history-modal', render: renderHistory},
        'force-override-btn': {id: 'override-modal', render: renderOverrideModal},
        'nav-analytics': {id: 'analytics-modal', render: generateAnalytics}
    };

    Object.entries(triggerMap).forEach(([btnId, config]) => {
        const btn = document.getElementById(btnId);
        if(btn) {
            btn.onclick = (e) => {
                e.preventDefault();
                console.log(`Button Clicked: ${btnId} -> Opening ${config.id}`);
                if(config.render) config.render();
                openModal(config.id);
            };
        } else {
            console.warn(`Listener failed: Button ID '${btnId}' not found in HTML.`);
        }
    });

    // Close buttons logic
    document.querySelectorAll('[id^="close-"]').forEach(btn => {
        btn.onclick = () => {
            const modalId = btn.id.replace('close-', '') + '-modal';
            console.log(`Closing Modal: ${modalId}`);
            closeModal(modalId);
        };
    });

    // Action buttons
    document.getElementById('add-account-btn').onclick = createAccount;
    document.getElementById('add-cf-btn').onclick = addCashflow;
    document.getElementById('quick-spend-btn').onclick = quickSpend;
    document.getElementById('transfer-btn').onclick = executeTransfer;
    document.getElementById('save-override-btn').onclick = saveOverrides;
    
    // Theme toggle
    document.getElementById('theme-toggle-btn').onclick = () => {
        const html = document.documentElement;
        if(html.classList.contains('dark')) {
            html.classList.remove('dark');
            localStorage.setItem('appTheme', 'light');
        } else {
            html.classList.add('dark');
            localStorage.setItem('appTheme', 'dark');
        }
    };
}

function openModal(id) { 
    const el = document.getElementById(id);
    if(el) { el.classList.remove('hidden'); el.classList.add('flex'); }
}

function closeModal(id) { 
    const el = document.getElementById(id);
    if(el) { el.classList.add('hidden'); el.classList.remove('flex'); }
    updateApp();
}

// --- LOGIC FUNCTIONS ---

function createAccount() {
    const type = document.getElementById('admin-type').value;
    const name = document.getElementById('admin-name').value;
    const domain = document.getElementById('admin-domain').value;
    const sec = parseFloat(document.getElementById('admin-secondary').value) || 0;
    if(!name) return alert("Please enter a name");
    const newObj = { id: Date.now(), name, domain, balance: 0, color: colorThemes[Math.floor(Math.random() * colorThemes.length)] };
    if(type === 'bank') { newObj.overdraft = sec; accounts.push(newObj); }
    else if(type === 'debt') { newObj.limit = sec; debts.push(newObj); }
    else { pots.push(newObj); }
    saveData(); renderAdminList(); updateApp();
}

function renderAdminList() {
    const list = document.getElementById('admin-list'); list.innerHTML = '';
    const all = [...accounts.map(a=>({...a, t:'bank'})), ...debts.map(d=>({...d, t:'debt'})), ...pots.map(p=>({...p, t:'pot'}))];
    all.forEach(item => {
        list.innerHTML += `<div class="bg-white dark:bg-gray-800 p-4 rounded-2xl flex justify-between items-center mb-2 shadow-sm">
            <p class="text-sm font-black">${item.name} <span class="text-[9px] opacity-50 font-bold uppercase">${item.t}</span></p>
            <button onclick="deleteAccount('${item.t}', ${item.id})" class="text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>`;
    });
    lucide.createIcons();
}

window.deleteAccount = function(type, id) {
    if(!confirm("Delete this?")) return;
    if(type === 'bank') accounts = accounts.filter(a=>a.id!==id);
    else if(type === 'debt') debts = debts.filter(d=>d.id!==id);
    else pots = pots.filter(p=>p.id!==id);
    saveData(); renderAdminList(); updateApp();
};

function addCashflow() {
    const type = document.getElementById('cf-type').value;
    const freq = document.getElementById('cf-freq').value;
    const day = document.getElementById('cf-day').value;
    const month = document.getElementById('cf-month').value;
    const name = document.getElementById('cf-name').value;
    const amount = parseFloat(document.getElementById('cf-amount').value);
    const manual = document.getElementById('cf-manual').checked;
    if(!day || !name || !amount) return alert("Fill all fields");
    cashflowData.push({ id: Date.now(), type, frequency: freq, day, month, name, amount, manual });
    saveData(); closeModal('cashflow-modal');
}

function renderLedger() {
    const ledger = document.getElementById('full-ledger'); ledger.innerHTML = '';
    cashflowData.forEach(item => {
        ledger.innerHTML += `<div class="bg-white dark:bg-gray-800 p-4 rounded-2xl flex justify-between items-center mb-2 shadow-sm">
            <div><p class="text-sm font-black">${item.name}</p><p class="text-[10px] text-slate-400 font-bold uppercase">Day ${item.day}</p></div>
            <div class="flex items-center gap-2"><p class="font-black">£${item.amount.toFixed(2)}</p>
            <button onclick="deleteCf(${item.id})" class="text-red-500"><i data-lucide="x-circle" class="w-4 h-4"></i></button></div>
        </div>`;
    });
    lucide.createIcons();
}

window.deleteCf = function(id) { cashflowData = cashflowData.filter(c=>c.id!==id); saveData(); renderLedger(); updateApp(); };

function renderVault() {
    const pList = document.getElementById('pots-dashboard-list'); pList.innerHTML = '';
    pots.forEach(p => {
        pList.innerHTML += `<div class="bg-white dark:bg-gray-800 p-4 rounded-3xl mb-3 shadow-sm flex justify-between items-center">
            <div><p class="text-xs font-black uppercase text-slate-400 tracking-widest">${p.name}</p><p class="text-2xl font-black text-yellow-500">£${p.balance.toFixed(2)}</p></div>
            <button onclick="withdrawFromPot(${p.id})" class="bg-slate-100 dark:bg-gray-700 px-4 py-2 rounded-xl font-black text-xs">Withdraw</button>
        </div>`;
    });

    const dList = document.getElementById('debt-dashboard-list'); dList.innerHTML = '';
    debts.forEach(d => {
        const util = d.limit > 0 ? Math.min((d.balance / d.limit) * 100, 100) : 0;
        dList.innerHTML += `<div class="bg-white dark:bg-gray-800 p-5 rounded-3xl mb-3 shadow-sm">
            <div class="flex justify-between items-center mb-2"><p class="text-sm font-black">${d.name}</p><p class="text-xl font-black text-red-500">£${d.balance.toFixed(2)}</p></div>
            ${d.limit > 0 ? `<div class="w-full bg-slate-100 dark:bg-gray-900 h-1 rounded-full overflow-hidden mb-4"><div class="bg-red-500 h-full" style="width: ${util}%"></div></div>` : ''}
            <div class="flex gap-2">
                <button onclick="payDebt(${d.id})" class="flex-1 bg-starling text-slate-900 py-2 rounded-xl font-black text-xs">Pay</button>
                <button onclick="addInterest(${d.id})" class="flex-1 bg-red-100 dark:bg-red-900/30 text-red-500 py-2 rounded-xl font-black text-xs">+ Int</button>
            </div>
        </div>`;
    });
    document.getElementById('total-debt-display').innerText = `£${debts.reduce((s,d)=>s+d.balance,0).toFixed(2)}`;
}

window.payDebt = function(id) { let a = prompt("Amount paid?"); if(a) { let d = debts.find(x=>x.id==id); d.balance -= parseFloat(a); saveData(); renderVault(); updateApp(); } };
window.addInterest = function(id) { let a = prompt("Interest amount?"); if(a) { let d = debts.find(x=>x.id==id); d.balance += parseFloat(a); saveData(); renderVault(); updateApp(); } };

function renderTransactModal() {
    const sAcc = document.getElementById('spend-account');
    const tFrom = document.getElementById('transfer-from');
    const tTo = document.getElementById('transfer-to');
    sAcc.innerHTML = '<option value="" disabled selected>Select Account</option>';
    tFrom.innerHTML = '<option value="" disabled selected>From...</option>';
    tTo.innerHTML = '<option value="" disabled selected>To...</option>';
    accounts.forEach(a => {
        const h = `<option value="bank_${a.id}">🏦 ${a.name} (£${a.balance.toFixed(2)})</option>`;
        sAcc.innerHTML += h; tFrom.innerHTML += h; tTo.innerHTML += h;
    });
    debts.forEach(d => { sAcc.innerHTML += `<option value="debt_${d.id}">💳 ${d.name} (£${d.balance.toFixed(2)})</option>`; });
    pots.forEach(p => { tTo.innerHTML += `<option value="pot_${p.id}">🍯 ${p.name} (£${p.balance.toFixed(2)})</option>`; });
}

function quickSpend() {
    const val = document.getElementById('spend-account').value;
    const amt = parseFloat(document.getElementById('spend-amount').value);
    if(!val || !amt) return;
    const [type, id] = val.split('_');
    let t = type === 'bank' ? accounts.find(a=>a.id==id) : debts.find(d=>d.id==id);
    if(type === 'bank') t.balance -= amt; else t.balance += amt;
    saveData(); closeModal('update-modal');
}

function executeTransfer() {
    const fId = document.getElementById('transfer-from').value;
    const tId = document.getElementById('transfer-to').value;
    const amt = parseFloat(document.getElementById('transfer-amount').value);
    if(!fId || !tId || !amt) return;
    const [fT, fI] = fId.split('_'); const [tT, tI] = tId.split('_');
    let source = accounts.find(a=>a.id==fI);
    let dest = tT === 'bank' ? accounts.find(a=>a.id==tI) : pots.find(p=>p.id==tI);
    source.balance -= amt; dest.balance += amt;
    saveData(); closeModal('update-modal');
}

function renderHistory() {
    const list = document.getElementById('history-list'); list.innerHTML = '<p class="text-center text-slate-400 p-4">Logs appearing soon...</p>';
}

function generateAnalytics() {
    const cash = accounts.reduce((s,a)=>s+a.balance,0);
    const potVal = pots.reduce((s,p)=>s+p.balance,0);
    const debtVal = debts.reduce((s,d)=>s+d.balance,0);
    const grand = cash + potVal - debtVal;
    document.getElementById('an-cash').innerText = `£${cash.toFixed(0)}`;
    document.getElementById('an-pots').innerText = `£${potVal.toFixed(0)}`;
    document.getElementById('an-debt').innerText = `£${debtVal.toFixed(0)}`;
    document.getElementById('analytics-total').innerText = `£${grand.toFixed(0)}`;
}

function renderOverrideModal() {
    const bCont = document.getElementById('update-banks-container'); bCont.innerHTML = '<h3 class="text-xs font-black uppercase mb-2">Banks</h3>';
    accounts.forEach(a => { bCont.innerHTML += `<div class="mb-2"><label class="text-[10px] uppercase font-bold text-slate-400">${a.name}</label><input type="number" id="over-bank-${a.id}" value="${a.balance}" class="w-full bg-slate-100 dark:bg-gray-800 p-3 rounded-xl font-black"></div>`; });
    const pCont = document.getElementById('update-pots-container'); pCont.innerHTML = '<h3 class="text-xs font-black uppercase mb-2">Pots</h3>';
    pots.forEach(p => { pCont.innerHTML += `<div class="mb-2"><label class="text-[10px] uppercase font-bold text-slate-400">${p.name}</label><input type="number" id="over-pot-${p.id}" value="${p.balance}" class="w-full bg-slate-100 dark:bg-gray-800 p-3 rounded-xl font-black"></div>`; });
    const dCont = document.getElementById('update-debts-container'); dCont.innerHTML = '<h3 class="text-xs font-black uppercase mb-2">Debts</h3>';
    debts.forEach(d => { dCont.innerHTML += `<div class="mb-2"><label class="text-[10px] uppercase font-bold text-slate-400">${d.name}</label><input type="number" id="over-debt-${d.id}" value="${d.balance}" class="w-full bg-slate-100 dark:bg-gray-800 p-3 rounded-xl font-black"></div>`; });
}

function saveOverrides() {
    accounts.forEach(a => a.balance = parseFloat(document.getElementById(`over-bank-${a.id}`).value) || 0);
    pots.forEach(p => p.balance = parseFloat(document.getElementById(`over-pot-${p.id}`).value) || 0);
    debts.forEach(d => d.balance = parseFloat(document.getElementById(`over-debt-${d.id}`).value) || 0);
    saveData(); closeModal('override-modal');
}

function saveData() {
    localStorage.setItem('myAccounts', JSON.stringify(accounts));
    localStorage.setItem('myDebts', JSON.stringify(debts));
    localStorage.setItem('myPots', JSON.stringify(pots));
    localStorage.setItem('cashflowData', JSON.stringify(cashflowData));
}

function exportData() {
    const blob = new Blob([JSON.stringify({accounts, debts, pots, cashflowData})], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'backup.json'; a.click();
}

function importData(e) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const d = JSON.parse(event.target.result);
        accounts = d.accounts; debts = d.debts; pots = d.pots; cashflowData = d.cashflowData;
        saveData(); location.reload();
    };
    reader.readAsText(e.target.files[0]);
}

window.withdrawFromPot = function(id) {
    let a = prompt("Amount to withdraw?");
    if(a) {
        let p = pots.find(x=>x.id==id);
        p.balance -= parseFloat(a);
        saveData(); renderVault(); updateApp();
    }
};
