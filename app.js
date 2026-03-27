// --- STATE & DATA ---
let accounts = (JSON.parse(localStorage.getItem('myAccounts')) || []).map(a => ({...a, overdraft: a.overdraft || 0}));
let debts = (JSON.parse(localStorage.getItem('myDebts')) || []).map(d => ({...d, limit: d.limit || 0})); 
let pots = JSON.parse(localStorage.getItem('myPots')) || [];
let cashflowData = JSON.parse(localStorage.getItem('cashflowData')) || [];
let historyLog = JSON.parse(localStorage.getItem('myHistory')) || [];
let editingCfId = null; 
const colorThemes = ['#8B5CF6', '#F59E0B', '#EC4899', '#3B82F6', '#10B981', '#EF4444', '#06B6D4', '#84CC16'];

const today = new Date();
const currentYear = today.getFullYear();
const currentDay = today.getDate();
const currentMonthNum = today.getMonth(); 
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// --- INITIALIZE UI ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('date-display').innerText = `Today is ${monthNames[currentMonthNum]} ${currentDay}`;
    setupSelectors();
    applyTheme(localStorage.getItem('appTheme') || 'dark');
    updateApp();
});

// --- CORE FUNCTIONS ---
function setupSelectors() {
    const daySelect = document.getElementById('cf-day');
    if(daySelect) {
        for(let i = 1; i <= 31; i++) { daySelect.innerHTML += `<option value="${i}">${i}</option>`; }
    }
    const monthSelect = document.getElementById('cf-month');
    if(monthSelect) {
        monthNames.forEach((m, idx) => { monthSelect.innerHTML += `<option value="${idx}">${m}</option>`; });
        monthSelect.value = currentMonthNum;
    }
}

function recordTx(title, amount, desc, typeColor = 'text-slate-800 dark:text-white') {
    const timestamp = new Date().toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
    historyLog.unshift({ id: Date.now(), title, amount, desc, timestamp, color: typeColor });
    if(historyLog.length > 100) historyLog.pop(); 
    localStorage.setItem('myHistory', JSON.stringify(historyLog));
}

function getLastWorkingDay(year, month) {
    let lastDay = new Date(year, month + 1, 0); 
    if (lastDay.getDay() === 0) lastDay.setDate(lastDay.getDate() - 2); 
    else if (lastDay.getDay() === 6) lastDay.setDate(lastDay.getDate() - 1); 
    return lastDay.getDate();
}

function appliesThisMonth(item) {
    const freq = item.frequency || 'monthly';
    if (freq === 'monthly') return true;
    if (freq === 'one_off') return parseInt(item.month) === currentMonthNum;
    if (freq === 'quarterly') return (currentMonthNum - parseInt(item.month) + 12) % 3 === 0;
    return true;
}

// All your specific UI updating logic goes here...
// (I will provide the bridge in the final index file)
