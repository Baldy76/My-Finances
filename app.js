/**
 * COMMAND CENTER BRAIN (app.js)
 * v1.0.1 - Form Clear & Logo Logic Update
 */

console.log("Brain Waking Up...");

// --- DATA STATE ---
let accounts = (JSON.parse(localStorage.getItem('myAccounts')) || []).map(a => ({...a, overdraft: parseFloat(a.overdraft) || 0, domain: a.domain || ''}));
let debts = (JSON.parse(localStorage.getItem('myDebts')) || []).map(d => ({...d, limit: parseFloat(d.limit) || 0, domain: d.domain || ''})); 
let pots = (JSON.parse(localStorage.getItem('myPots')) || []).map(p => ({...p, balance: parseFloat(p.balance) || 0}));
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
        initUI();
        updateApp();
        const shield = document.getElementById('loading-shield');
        if(shield) { setTimeout(() => { shield.style.opacity = '0'; setTimeout(() => shield.remove(), 500); }, 400); }
    } catch (err) { console.error("Boot failure:", err); }
});

function initUI() {
    const dEl = document.getElementById('date-display');
    if(dEl) dEl.innerText = `${monthNames[currentMonthNum]} ${currentDay}`;

    const daySel = document.getElementById('cf-day');
    if(daySel) { for(let i=1; i<=31; i++) { let o = document.createElement('option'); o.value=i; o.innerText=i; daySel.appendChild(o); } }
    const moSel = document.getElementById('cf-month');
    if(moSel) { monthNames.forEach((m, i) => { let o = document.createElement('option'); o.value=i; o.innerText=m; moSel.appendChild(o); }); moSel.value = currentMonthNum; }
    
    setupListeners();
}

// --- LOGO ENGINE ---
function getLogoUrl(item) {
    if (item.domain && item.domain.trim() !== '') {
        // Construct the URL and return it
        return `https://logo.clearbit.com/${item.domain.replace('https://', '').replace('http://', '').trim()}`;
    }
    const n = item.name.toLowerCase();
    if (n.includes('halifax')) return 'https://logo.clearbit.com/halifax.co.uk';
    if (n.includes('barclays')) return 'https://logo.clearbit.com/barclays.co.uk';
    if (n.includes('starling')) return 'https://logo.clearbit.com/starlingbank.com';
    if (n.includes('amex')) return 'https://logo.clearbit.com/americanexpress.com';
    if (n.includes('monzo')) return 'https://logo.clearbit.com/monzo.com';
    if (n.includes('natwest')) return 'https://logo.clearbit.com/natwest.com';
    return null;
}

// --- CALENDAR & RULE ENGINE ---
function resolveActualDay(item) {
    if (item.day === 'last_working_day') {
        let lastDay = new Date(currentYear, currentMonthNum + 1, 0); 
        if (lastDay.getDay() === 0) lastDay.setDate(lastDay.getDate() - 2); 
        else if (lastDay.getDay() === 6) lastDay.setDate(lastDay.getDate() - 1); 
        return lastDay.getDate();
    }
    let checkDate = new Date(currentYear, currentMonthNum, parseInt(item.day));
    if (checkDate.getMonth() !== currentMonthNum) checkDate = new Date(currentYear, currentMonthNum + 1, 0);
    const dow = checkDate.getDay();
    if (dow === 0 || dow === 6) { 
        if (item.type === 'income') checkDate.setDate(checkDate.getDate() - (dow === 0 ? 2 : 1));
        else checkDate.setDate(checkDate.getDate() + (dow === 0 ? 1 : 2));
    }
    return checkDate.getDate();
}

function updateApp() {
    const totalRes = accounts.reduce((s, a) => s + (parseFloat(a.balance)||0) + (parseFloat(a.overdraft)||0), 0);
    let remBills = 0, upH = '', alertH = '';

    const sorted = cashflowData
        .filter(item => {
            const f = item.frequency || 'monthly';
            if (f === 'monthly') return true;
            if (f === 'one_off') return parseInt(item.month) === currentMonthNum;
            if (f === 'quarterly') return (currentMonthNum - parseInt(item.month) + 12) % 3 === 0;
            return true;
        })
        .map(item => ({ ...item, actualDay: resolveActualDay(item) }))
        .sort((a, b) => a.actualDay - b.actualDay);

    sorted.filter(i => i.actualDay >= currentDay).forEach(item => {
        if (item.type === 'bill') remBills += item.amount;
        let diff = item.actualDay - currentDay;
        upH += `<div class="flex justify-between items-center border-b dark:border-gray-800/50 pb-3 last:border-0"><div><p class="text-sm font-black">${item.name}</p><p class="text-[10px] text-slate-500 uppercase font-bold tracking-widest">${diff===0?'Today':'in '+diff+' days'}</p></div><p class="text-sm font-black ${item.type==='bill'?'text-red-500':'text-starling'}">${item.type==='bill'?'-':'+'}£${item.amount.toFixed(2)}</p></div>`;
        if (item.manual && item.type === 'bill' && (diff === 0 || diff === 1)) {
            alertH += `<div class="bg-red-500 text-white p-4 rounded-2xl text-sm font-black shadow-lg flex items-center gap-3">🚨 <span class="flex-1">Pay ${item.name} ${diff === 0 ? 'Today' : 'Tomorrow'}!</span><button onclick="this.parentElement.remove()" class="text-xl">✕</button></div>`;
        }
    });

    document.getElementById('alerts-container').innerHTML = alertH;
    document.getElementById('upcoming-list').innerHTML = upH;
    document.getElementById('no-upcoming').classList.toggle('hidden', sorted.length > 0);

    const safeToSpend = totalRes - remBills;
    document.getElementById('safe-to-spend').innerText = `£${safeToSpend.toFixed(2)}`;
    document.getElementById('total-cash').innerText = `£${totalRes.toFixed(2)}`;
    document.getElementById('display-bills').innerText = `£${remBills.toFixed(2)}`;
    
    const bar = document.getElementById('cash-bar');
    const pc = totalRes > 0 ? Math.max(0, Math.min(100, (safeToSpend / totalRes) * 100)) : 0;
    bar.style.width = `${pc}%`;
    bar.className = `h-2 rounded-full transition-all duration-1000 ${pc < 20 ? 'bg-red-500' : 'bg-starling'}`;

    renderAccounts();
    saveData();
    if(window.lucide) lucide.createIcons();
}

function renderAccounts() {
    const list = document.getElementById('accounts-list'); list.innerHTML = '';
    accounts.forEach(acc => {
        const logo = getLogoUrl(acc);
        const iconHtml = logo ? `<img src="${logo}" class="w-10 h-10 rounded-xl bg-white p-1 shadow-sm border border-slate-100 dark:border-transparent">` : `<div class="w-10 h-10 rounded-xl flex justify-center items-center font-black text-xs text-white" style="background-color:${acc.color}">${acc.name.substring(0,2).toUpperCase()}</div>`;
        list.innerHTML += `<div class="flex justify-between items-center bg-white dark:bg-cardbg p-4 rounded-3xl shadow-sm mb-3">
            <div class="flex items-center gap-4">${iconHtml}<div><p class="font-black">${acc.name}</p><p class="text-[9px] text-slate-500 font-bold uppercase">Avail: £${((parseFloat(acc.balance)||0)+(parseFloat(acc.overdraft)||0)).toFixed(2)}</p></div></div>
            <p class="font-black text-xl ${(parseFloat(acc.balance)||0)<0?'text-red-500':''}">£${(parseFloat(acc.balance)||0).toFixed(2)}</p></div>`;
    });
}

// --- ACTIONS & LISTENERS ---
function setupListeners() {
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
        if(btn) btn.onclick = (e) => { e.preventDefault(); if(config.render) config.render(); openModal(config.id); };
    });

    const closeIds = ['update', 'vault', 'cashflow', 'admin', 'history', 'analytics', 'override'];
    closeIds.forEach(id => {
        const btn = document.getElementById(`close-${id}`);
        if(btn) btn.onclick = () => closeModal(`${id}-modal`);
    });

    document.getElementById('add-account-btn').onclick = createAccount;
    document.getElementById('add-cf-btn').onclick = addCashflow;
    document.getElementById('quick-spend-btn').onclick = quickSpend;
    document.getElementById('transfer-btn').onclick = executeTransfer;
    document.getElementById('save-override-btn').onclick = saveOverrides;
    document.getElementById('export-data-btn').onclick = exportData;
    document.getElementById('import-data-btn').onclick = () => document.getElementById('import-file-input').click();
    document.getElementById('import-file-input').onchange = importData;
    document.getElementById('theme-toggle-btn').onclick = () => {
        const h = document.documentElement;
        if(h.classList.contains('dark')) { h.classList.remove('dark'); localStorage.setItem('appTheme', 'light'); }
        else { h.classList.add('dark'); localStorage.setItem('appTheme', 'dark'); }
    };
}

function openModal(id) { 
    const el = document.getElementById(id);
    if(el) { 
        el.classList.remove('hidden'); el.classList.add('flex'); 
        if(navigator.vibrate) navigator.vibrate(10);
        if(window.lucide) lucide.createIcons(); // RE-RENDER ICONS FOR MODAL
    }
}

function closeModal(id) { const el = document.getElementById(id); if(el) { el.classList.add('hidden'); el.classList.remove('flex'); } updateApp(); }

function createAccount() {
    const type = document.getElementById('admin-type').value;
    const name = document.getElementById('admin-name').value;
    const domain = document.getElementById('admin-domain').value;
    const sec = parseFloat(document.getElementById('admin-secondary').value) || 0;
    if(!name) return alert("Enter account name");
    const colorThemes = ['#8B5CF6', '#F59E0B', '#EC4899', '#3B82F6', '#10B981', '#EF4444'];
    const newObj = { id: Date.now(), name, domain, balance: 0, color: colorThemes[Math.floor(Math.random() * colorThemes.length)] };
    if(type === 'bank') newObj.overdraft = sec; else if(type === 'debt') newObj.limit = sec;
    if(type === 'bank') accounts.push(newObj); else if(type === 'debt') debts.push(newObj); else pots.push(newObj);
    
    // --- CLEAR ADMIN FORM ---
    document.getElementById('admin-name').value = '';
    document.getElementById('admin-domain').value = '';
    document.getElementById('admin-secondary').value = '';

    saveData(); renderAdminList(); updateApp();
}

function addCashflow() {
    const type = document.getElementById('cf-type').value;
    const freq = document.getElementById('cf-freq').value;
    const day = document.getElementById('cf-day').value;
    const month = document.getElementById('cf-month').value;
    const name = document.getElementById('cf-name').value;
    const amount = parseFloat(document.getElementById('cf-amount').value);
    const manual = document.getElementById('cf-manual').checked;
    if(!day || !name || !amount) return alert("Missing info");
    cashflowData.push({ id: Date.now(), type, frequency: freq, day, month, name, amount, manual });
    
    // --- CLEAR BILLS FORM ---
    document.getElementById('cf-name').value = '';
    document.getElementById('cf-amount').value = '';
    document.getElementById('cf-manual').checked = false;

    saveData(); closeModal('cashflow-modal');
}

function renderAdminList() {
    const list = document.getElementById('admin-list'); list.innerHTML = '';
    const all = [...accounts.map(a=>({...a, t:'bank'})), ...debts.map(d=>({...d, t:'debt'})), ...pots.map(p=>({...p, t:'pot'}))];
    all.forEach(item => {
        list.innerHTML += `<div class="bg-white dark:bg-gray-800 p-4 rounded-2xl flex justify-between items-center mb-2 shadow-sm">
            <p class="text-sm font-black">${item.name} <span class="text-[9px] opacity-40 uppercase ml-2">${item.t}</span></p>
            <button onclick="deleteAccount('${item.t}', ${item.id})" class="text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>`;
    });
    lucide.createIcons();
}

window.deleteAccount = function(type, id) {
    if(!confirm("Delete?")) return;
    if(type==='bank') accounts=accounts.filter(a=>a.id!==id); else if(type==='debt') debts=debts.filter(d=>d.id!==id); else pots=pots.filter(p=>p.id!==id);
    renderAdminList(); updateApp();
};

function renderLedger() {
    const ledger = document.getElementById('full-ledger'); ledger.innerHTML = '';
    cashflowData.forEach(item => {
        ledger.innerHTML += `<div class="bg-white dark:bg-gray-800 p-4 rounded-2xl flex justify-between items-center mb-2 shadow-sm border border-slate-50 dark:border-transparent">
            <div><p class="text-sm font-black">${item.name}</p><p class="text-[10px] text-slate-400 font-bold">Day ${item.day}</p></div>
            <div class="flex items-center gap-2"><p class="font-black">£${item.amount.toFixed(2)}</p>
            <button onclick="deleteCf(${item.id})" class="text-red-400"><i data-lucide="x-circle" class="w-4 h-4"></i></button></div></div>`;
    });
    lucide.createIcons();
}
window.deleteCf = function(id) { cashflowData = cashflowData.filter(c=>c.id!==id); saveData(); renderLedger(); updateApp(); };

function renderVault() {
    const pList = document.getElementById('pots-dashboard-list'); pList.innerHTML = '';
    pots.forEach(p => {
        pList.innerHTML += `<div class="bg-white dark:bg-gray-800 p-4 rounded-3xl mb-3 shadow-sm flex justify-between items-center">
            <div><p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">${p.name}</p><p class="text-2xl font-black text-yellow-500">£${(parseFloat(p.balance)||0).toFixed(2)}</p></div>
            <button onclick="withdrawFromPot(${p.id})" class="bg-slate-100 dark:bg-gray-700 px-4 py-2 rounded-xl font-black text-xs">Withdraw</button></div>`;
    });
    const dList = document.getElementById('debt-dashboard-list'); dList.innerHTML = '';
    debts.forEach(d => {
        const util = d.limit > 0 ? Math.min((d.balance / d.limit) * 100, 100) : 0;
        dList.innerHTML += `<div class="bg-white dark:bg-gray-800 p-5 rounded-3xl mb-3 shadow-sm">
            <div class="flex justify-between items-center mb-2"><p class="text-sm font-black">${d.name}</p><p class="text-xl font-black text-red-500">£${(parseFloat(d.balance)||0).toFixed(2)}</p></div>
            ${d.limit > 0 ? `<div class="w-full bg-slate-100 dark:bg-gray-900 h-1.5 rounded-full overflow-hidden mb-4"><div class="bg-red-500 h-full" style="width: ${util}%"></div></div>` : ''}
            <div class="flex gap-2">
                <button onclick="payDebt(${d.id})" class="flex-1 bg-starling py-2 rounded-xl font-black text-xs text-slate-900">Pay</button>
                <button onclick="addInterest(${d.id})" class="flex-1 bg-red-100 dark:bg-red-900/30 text-red-500 py-2 rounded-xl font-black text-xs">+ Int</button></div></div>`;
    });
    document.getElementById('total-debt-display').innerText = `£${debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0).toFixed(2)}`;
}

window.payDebt = function(id) { let a = prompt("Amount?"); if(a) { let d = debts.find(x=>x.id==id); d.balance -= parseFloat(a); saveData(); renderVault(); updateApp(); recordTx(`Paid ${d.name}`, `-£${a}`); } };
window.addInterest = function(id) { let a = prompt("Amount?"); if(a) { let d = debts.find(x=>x.id==id); d.balance += parseFloat(a); saveData(); renderVault(); updateApp(); recordTx(`${d.name} Int`, `+£${a}`); } };
window.withdrawFromPot = function(id) { let a = prompt("Amount?"); if(a) { let p = pots.find(x=>x.id==id); p.balance -= parseFloat(a); saveData(); renderVault(); updateApp(); recordTx(`Withdraw`, `-£${a}`, p.name); } };

function renderTransactModal() {
    const sAcc = document.getElementById('spend-account'); const tF = document.getElementById('transfer-from'); const tT = document.getElementById('transfer-to');
    sAcc.innerHTML = '<option value="" disabled selected>Account...</option>'; tF.innerHTML = sAcc.innerHTML; tT.innerHTML = sAcc.innerHTML;
    accounts.forEach(a => { const h = `<option value="bank_${a.id}">🏦 ${a.name} (£${(parseFloat(a.balance)||0).toFixed(2)})</option>`; sAcc.innerHTML += h; tF.innerHTML += h; tT.innerHTML += h; });
    debts.forEach(d => { sAcc.innerHTML += `<option value="debt_${d.id}">💳 ${d.name} (£${(parseFloat(d.balance)||0).toFixed(2)})</option>`; });
    pots.forEach(p => { tT.innerHTML += `<option value="pot_${p.id}">🍯 ${p.name} (£${(parseFloat(p.balance)||0).toFixed(2)})</option>`; });
}

function quickSpend() {
    const v = document.getElementById('spend-account').value; const a = parseFloat(document.getElementById('spend-amount').value);
    const desc = document.getElementById('spend-desc').value || 'Purchase';
    if(!v || !a) return;
    const [type, id] = v.split('_');
    let t = type === 'bank' ? accounts.find(x=>x.id==id) : debts.find(x=>x.id==id);
    if(type==='bank') t.balance -= a; else t.balance += a;
    recordTx(`Spend: ${t.name}`, `-£${a.toFixed(2)}`, desc, 'text-red-500');
    saveData(); closeModal('update-modal');
}

function executeTransfer() {
    const fId = document.getElementById('transfer-from').value; const tId = document.getElementById('transfer-to').value;
    const amt = parseFloat(document.getElementById('transfer-amount').value);
    if(!fId || !tId || !amt) return;
    const [fT, fI] = fId.split('_'); const [tT, tI] = tId.split('_');
    let src = accounts.find(x=>x.id==fI); let dest = tT === 'bank' ? accounts.find(x=>x.id==tI) : pots.find(x=>x.id==tI);
    src.balance -= amt; dest.balance += amt;
    recordTx(`Transfer`, `£${amt.toFixed(2)}`, `${src.name} ➔ ${dest.name}`, 'text-blue-500');
    saveData(); closeModal('update-modal');
}

function recordTx(title, amt, desc, color='text-slate-800 dark:text-white') {
    const ts = new Date().toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
    historyLog.unshift({ id: Date.now(), title, amount:amt, desc: desc||'', timestamp: ts, color });
    if(historyLog.length > 100) historyLog.pop(); localStorage.setItem('myHistory', JSON.stringify(historyLog));
}

function renderHistory() {
    const list = document.getElementById('history-list'); list.innerHTML = '';
    if(historyLog.length===0) list.innerHTML = '<p class="text-center p-8 opacity-50 font-bold text-[10px]">No History</p>';
    historyLog.forEach(tx => {
        list.innerHTML += `<div class="bg-white dark:bg-gray-800 p-4 rounded-2xl mb-2 flex justify-between shadow-sm">
            <div><p class="text-sm font-black">${tx.title}</p><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">${tx.timestamp} • ${tx.desc}</p></div>
            <p class="font-black ${tx.color}">${tx.amount}</p></div>`;
    });
}

function generateAnalytics() {
    const cash = accounts.reduce((s,a)=>s+(parseFloat(a.balance)||0),0);
    const potVal = pots.reduce((s,p)=>s+(parseFloat(p.balance)||0),0);
    const debtVal = debts.reduce((s,d)=>s+(parseFloat(d.balance)||0),0);
    const grand = cash + potVal - debtVal;
    document.getElementById('an-cash').innerText = `£${cash.toFixed(0)}`;
    document.getElementById('an-pots').innerText = `£${potVal.toFixed(0)}`;
    document.getElementById('an-debt').innerText = `£${debtVal.toFixed(0)}`;
    document.getElementById('analytics-total').innerText = `£${grand.toFixed(0)}`;
    const total = Math.abs(cash) + Math.abs(potVal) + Math.abs(debtVal);
    const chart = document.getElementById('donut-chart');
    if(total <= 0) chart.style.background = '#334155';
    else {
        const p1 = (Math.abs(cash)/total)*360, p2 = (Math.abs(potVal)/total)*360;
        chart.style.background = `conic-gradient(#00E6C3 0deg ${p1}deg, #FBBF24 ${p1}deg ${p1+p2}deg, #EF4444 ${p1+p2}deg 360deg)`;
    }
}

function renderOverrideModal() {
    const cont = document.getElementById('override-inputs-container'); cont.innerHTML = '';
    const sections = [ {t:'Banks', d:accounts, i:'over-bank-'}, {t:'Pots', d:pots, i:'over-pot-'}, {t:'Debts', d:debts, i:'over-debt-'} ];
    sections.forEach(s => {
        if(s.d.length === 0) return;
        let h = `<h3 class="text-xs font-black uppercase mb-3 tracking-widest opacity-40">${s.t}</h3>`;
        s.d.forEach(item => {
            h += `<div class="mb-3"><label class="text-[9px] uppercase font-black text-slate-400 mb-1 block">${item.name}</label>
                  <input type="number" id="${s.i}${item.id}" value="${item.balance}" class="w-full bg-slate-50 dark:bg-gray-800 p-3.5 rounded-xl font-black"></div>`;
        });
        cont.innerHTML += `<div class="bg-white dark:bg-darkbg p-5 rounded-3xl mb-4 border dark:border-gray-700 shadow-sm">${h}</div>`;
    });
}

function saveOverrides() {
    accounts.forEach(a => { const el = document.getElementById(`over-bank-${a.id}`); if(el) a.balance = parseFloat(el.value) || 0; });
    pots.forEach(p => { const el = document.getElementById(`over-pot-${p.id}`); if(el) p.balance = parseFloat(el.value) || 0; });
    debts.forEach(d => { const el = document.getElementById(`over-debt-${d.id}`); if(el) d.balance = parseFloat(el.value) || 0; });
    saveData(); closeModal('override-modal');
}

function saveData() {
    localStorage.setItem('myAccounts', JSON.stringify(accounts));
    localStorage.setItem('myDebts', JSON.stringify(debts));
    localStorage.setItem('myPots', JSON.stringify(pots));
    localStorage.setItem('cashflowData', JSON.stringify(cashflowData));
}

function exportData() {
    const data = JSON.stringify({accounts, debts, pots, cashflowData, historyLog});
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `CC_Backup.json`; a.click();
}

function importData(e) {
    const r = new FileReader();
    r.onload = (ev) => {
        const d = JSON.parse(ev.target.result);
        accounts = d.accounts; debts = d.debts; pots = d.pots; cashflowData = d.cashflowData; historyLog = d.historyLog || [];
        saveData(); location.reload();
    }; r.readAsText(e.target.files[0]);
}
