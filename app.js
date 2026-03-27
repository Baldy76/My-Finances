/**
 * COMMAND CENTER BRAIN (app.js)
 * v1.0.0
 */

// --- GLOBAL STATE ---
let accounts = (JSON.parse(localStorage.getItem('myAccounts')) || []).map(a => ({...a, overdraft: a.overdraft || 0, domain: a.domain || ''}));
let debts = (JSON.parse(localStorage.getItem('myDebts')) || []).map(d => ({...d, limit: d.limit || 0, domain: d.domain || ''})); 
let pots = JSON.parse(localStorage.getItem('myPots')) || [];
let cashflowData = JSON.parse(localStorage.getItem('cashflowData')) || [];
let historyLog = JSON.parse(localStorage.getItem('myHistory')) || [];
let editingCfId = null;

const today = new Date();
const currentYear = today.getFullYear();
const currentDay = today.getDate();
const currentMonthNum = today.getMonth();
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initUI();
    updateApp();
});

function initUI() {
    const dateEl = document.getElementById('date-display');
    if(dateEl) dateEl.innerText = `Today is ${monthNames[currentMonthNum]} ${currentDay}`;

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
    if (name.includes('amex') || name.includes('american express')) return 'https://logo.clearbit.com/americanexpress.com';
    if (name.includes('monzo')) return 'https://logo.clearbit.com/monzo.com';
    if (name.includes('natwest')) return 'https://logo.clearbit.com/natwest.com';
    if (name.includes('amazon')) return 'https://logo.clearbit.com/amazon.co.uk';
    if (name.includes('sky')) return 'https://logo.clearbit.com/sky.com';
    return null;
}

// --- SMART CALENDAR LOGIC (WEEKEND SHIFTS) ---
function resolveActualDay(item) {
    let day = item.day;
    if (day === 'last_working_day') {
        let lastDay = new Date(currentYear, currentMonthNum + 1, 0); 
        if (lastDay.getDay() === 0) lastDay.setDate(lastDay.getDate() - 2); 
        else if (lastDay.getDay() === 6) lastDay.setDate(lastDay.getDate() - 1); 
        return lastDay.getDate();
    }
    let dNum = parseInt(day);
    let checkDate = new Date(currentYear, currentMonthNum, dNum);
    if (checkDate.getMonth() !== currentMonthNum) checkDate = new Date(currentYear, currentMonthNum + 1, 0);
    const dow = checkDate.getDay();
    if (dow === 0 || dow === 6) { 
        if (item.type === 'income') checkDate.setDate(checkDate.getDate() - (dow === 0 ? 2 : 1));
        else checkDate.setDate(checkDate.getDate() + (dow === 0 ? 1 : 2));
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

// --- DATA PERSISTENCE ---
function saveData() {
    localStorage.setItem('myAccounts', JSON.stringify(accounts));
    localStorage.setItem('myDebts', JSON.stringify(debts));
    localStorage.setItem('myPots', JSON.stringify(pots));
    localStorage.setItem('cashflowData', JSON.stringify(cashflowData));
}

// --- UPDATE ENGINE ---
function updateApp() {
    const totalCashIncludingOD = accounts.reduce((s, a) => s + a.balance + (a.overdraft || 0), 0);
    let remainingBills = 0;
    let remainingIncome = 0;
    let alertsHtml = '';
    let upcomingHtml = '';

    const pendingEntries = cashflowData
        .filter(appliesThisMonth)
        .map(item => ({ ...item, actualDay: resolveActualDay(item) }))
        .sort((a, b) => a.actualDay - b.actualDay)
        .filter(item => item.actualDay >= currentDay);

    pendingEntries.forEach(item => {
        if (item.type === 'bill') remainingBills += item.amount;
        else remainingIncome += item.amount;
        let diff = item.actualDay - currentDay;
        let dueText = diff === 0 ? 'TODAY' : `in ${diff} days`;
        upcomingHtml += `<div class="flex justify-between items-center border-b border-slate-100 dark:border-gray-800/50 last:border-0 pb-3 last:pb-0 pt-3 first:pt-0"><div><p class="text-sm font-black text-slate-800 dark:text-white">${item.name} ${item.manual ? '⚠️' : ''}</p><p class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">${dueText}</p></div><p class="text-sm font-black ${item.type === 'bill' ? 'text-red-500' : 'text-starling'}">${item.type === 'bill' ? '-' : '+'}£${item.amount.toFixed(2)}</p></div>`;
        if (item.manual && item.type === 'bill' && (diff === 0 || diff === 1)) {
            alertsHtml += `<div class="bg-red-500 text-white p-4 rounded-2xl text-sm font-black shadow-lg flex items-center gap-3">🚨 <span class="flex-1">Pay ${item.name} ${diff === 0 ? 'Today' : 'Tomorrow'}!</span><button onclick="this.parentElement.remove()" class="text-xl">✕</button></div>`;
        }
    });

    document.getElementById('alerts-container').innerHTML = alertsHtml;
    document.getElementById('upcoming-list').innerHTML = upcomingHtml;
    document.getElementById('no-upcoming').classList.toggle('hidden', pendingEntries.length > 0);

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

// [Include your Transact, Transfer, Admin, and History rendering functions here]
// ... Full functionality included in committed repository file.
