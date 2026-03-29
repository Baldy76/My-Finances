// 1. Theme Engine Functions
function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    const meta = document.getElementById('theme-meta'); 
    if(meta) meta.content = isDark ? "#000000" : "#f2f2f7";
    
    const btnLight = document.getElementById('btnLight'); 
    const btnDark = document.getElementById('btnDark');
    if (btnLight && btnDark) {
        if (isDark) { btnLight.classList.remove('active'); btnDark.classList.add('active'); } 
        else { btnLight.classList.add('active'); btnDark.classList.remove('active'); }
    }
}

window.setThemeMode = (isDark) => { 
    applyTheme(isDark); 
    localStorage.setItem('MyApp_Theme', isDark); 
};

// 2. UK Banking Logic
const ukHolidays2026 = ["2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-28"];

function isNonWorkingDay(d) {
    const dayOfWeek = d.getDay(); 
    const offsetDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
    return dayOfWeek === 0 || dayOfWeek === 6 || ukHolidays2026.includes(offsetDate.toISOString().split('T')[0]);
}

function getAdjustedPaymentDate(year, month, day) {
    let date = new Date(year, month, day);
    while (isNonWorkingDay(date)) date.setDate(date.getDate() + 1); 
    return date;
}

function getAdjustedIncomeDate(year, month, dayVal) {
    let date;
    if (dayVal === 'last') date = new Date(year, month + 1, 0); 
    else date = new Date(year, month, parseInt(dayVal));
    while (isNonWorkingDay(date)) date.setDate(date.getDate() - 1); 
    return date;
}

function fireConfetti() {
    const colors = ['#0A84FF', '#FF375F', '#30D158', '#BF5AF2', '#FFD60A'];
    for (let i = 0; i < 60; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'absolute';
        confetti.style.width = '8px'; confetti.style.height = '16px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.top = '50%'; confetti.style.left = '50%';
        confetti.style.zIndex = '9999'; confetti.style.borderRadius = '2px';
        document.body.appendChild(confetti);

        const angle = Math.random() * Math.PI * 2;
        const velocity = 100 + Math.random() * 200;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity - 100;

        confetti.animate([
            { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
            { transform: `translate(${tx}px, ${ty}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
        ], {
            duration: 1000 + Math.random() * 1000, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'forwards'
        }).onfinish = () => confetti.remove();
    }
}

// 3. Main App Logic
document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem('MyApp_Theme') === 'true';
    applyTheme(savedTheme);

    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));

    const syncBtn = document.getElementById('sync-updates-btn');
    if (syncBtn) {
        syncBtn.addEventListener('click', () => {
            syncBtn.innerText = "Syncing...";
            if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(regs => { for (let r of regs) r.unregister(); });
            caches.keys().then(names => { for (let n of names) caches.delete(n); })
            .then(() => setTimeout(() => window.location.reload(true), 500));
        });
    }

    let financialItems = JSON.parse(localStorage.getItem("financialItems")) || [];
    const views = ['cards', 'bills', 'home', 'loans', 'admin', 'account-details'];
    let currentActiveAccountId = null; 

    const dateSelects = ['cardDay', 'loanDay', 'billDay', 'salaryDay', 'editDay'];
    dateSelects.forEach(id => {
        const sel = document.getElementById(id);
        if (sel && sel.options.length <= 2) { 
            for(let i=1; i<=31; i++) {
                const s = ["th", "st", "nd", "rd"], v = i % 100;
                const ordinal = (s[(v - 20) % 10] || s[v] || s[0]);
                sel.insertAdjacentHTML('beforeend', `<option value="${i}">${i}${ordinal}</option>`);
            }
        }
    });

    const typeRadios = document.querySelectorAll('input[name="itemType"]');
    const formGroups = {
        account: document.getElementById('account-fields'), card: document.getElementById('card-fields'),
        loan: document.getElementById('loan-fields'), bill: document.getElementById('bill-fields'),
        salary: document.getElementById('salary-fields')
    };

    function updateFormFields(selectedType) {
        Object.values(formGroups).forEach(group => { group.style.display = 'none'; group.querySelectorAll('input, select').forEach(input => input.required = false); });
        if (formGroups[selectedType]) {
            formGroups[selectedType].style.display = 'block';
            if (selectedType === 'account') document.getElementById('accountType').required = true;
            else if (selectedType === 'card') { document.getElementById('cardLimit').required = true; document.getElementById('cardDay').required = true; }
            else if (selectedType === 'loan') { document.getElementById('loanOriginal').required = true; document.getElementById('loanMonthly').required = true; document.getElementById('loanDay').required = true; }
            else if (selectedType === 'bill') { document.getElementById('billDay').required = true; document.getElementById('billAccount').required = true; }
            else if (selectedType === 'salary') { document.getElementById('salaryDay').required = true; document.getElementById('salaryAccount').required = true; }
        }
        
        let placeholder = "Current Balance (£)";
        if (selectedType === 'bill') placeholder = "Bill Amount (£)";
        if (selectedType === 'salary') placeholder = "Salary Amount (£)";
        document.getElementById('itemAmount').placeholder = placeholder;
    }
    typeRadios.forEach(radio => radio.addEventListener('change', (e) => updateFormFields(e.target.value)));

    function populateDropdowns() {
        const billSelect = document.getElementById('billAccount');
        const salarySelect = document.getElementById('salaryAccount');
        const txSelect = document.getElementById('txAccount');
        const txToSelect = document.getElementById('txToAccount');
        
        if (billSelect) billSelect.innerHTML = '<option value="" disabled selected>Select Account to Debit</option>';
        if (salarySelect) salarySelect.innerHTML = '<option value="" disabled selected>Select Account to Credit</option>';
        if (txSelect) txSelect.innerHTML = '<option value="" disabled selected>Select Item</option>';
        if (txToSelect) txToSelect.innerHTML = '<option value="" disabled selected>Select Item to Credit</option>';
        
        const transactionItems = financialItems.filter(i => i.type === 'account' || i.type === 'card' || i.type === 'loan');
        const justAccounts = financialItems.filter(i => i.type === 'account');

        justAccounts.forEach(acc => {
            if (billSelect) billSelect.insertAdjacentHTML('beforeend', `<option value="${acc.id}">${acc.emoji || ''} ${acc.name}</option>`);
            if (salarySelect) salarySelect.insertAdjacentHTML('beforeend', `<option value="${acc.id}">${acc.emoji || ''} ${acc.name}</option>`);
        });

        transactionItems.forEach(item => {
            if (txSelect) txSelect.insertAdjacentHTML('beforeend', `<option value="${item.id}">${item.emoji || ''} ${item.name}</option>`);
            if (txToSelect) txToSelect.insertAdjacentHTML('beforeend', `<option value="${item.id}">${item.emoji || ''} ${item.name}</option>`);
        });
    }

    const txAccountSelect = document.getElementById('txAccount');
    const lblOut = document.getElementById('lbl-tx-out');
    const lblIn = document.getElementById('lbl-tx-in');
    const lblBonus = document.getElementById('lbl-tx-bonus');
    const lblTransfer = document.getElementById('lbl-tx-transfer');
    const lblInterest = document.getElementById('lbl-tx-interest');

    txAccountSelect.addEventListener('change', (e) => {
        const item = financialItems.find(i => i.id === e.target.value);
        if (!item) return;

        if (item.type === 'account') {
            lblOut.style.display = 'block'; lblOut.innerText = 'Out (Spend)';
            lblIn.style.display = 'block'; lblIn.innerText = 'In';
            lblBonus.style.display = 'block'; lblTransfer.style.display = 'block'; lblInterest.style.display = 'none';
            document.getElementById('tx-out').checked = true;
        } else { 
            lblOut.style.display = 'block'; lblOut.innerText = 'Charge';
            lblIn.style.display = 'block'; lblIn.innerText = 'Payment';
            lblInterest.style.display = 'block'; lblBonus.style.display = 'none'; lblTransfer.style.display = 'none';
            document.getElementById('tx-in').checked = true;
        }
        document.getElementById(document.querySelector('input[name="txType"]:checked').id).dispatchEvent(new Event('change'));
    });

    const txTypeRadios = document.querySelectorAll('input[name="txType"]');
    const transferContainer = document.getElementById('transfer-to-container');
    const txToAccount = document.getElementById('txToAccount');

    txTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if(e.target.value === 'transfer') { transferContainer.style.display = 'block'; txToAccount.required = true; } 
            else { transferContainer.style.display = 'none'; txToAccount.required = false; }
        });
    });

    views.forEach(view => {
        const navBtn = document.getElementById(`nav-${view}`);
        if (navBtn) navBtn.addEventListener("click", () => switchView(view));
    });

    function switchView(targetView) {
        views.forEach(view => {
            const vEl = document.getElementById(`view-${view}`);
            const nEl = document.getElementById(`nav-${view}`);
            if(vEl) vEl.classList.toggle("active-view", view === targetView);
            if(nEl) nEl.classList.toggle("active", view === targetView || (targetView === 'account-details' && (view === 'home' || view === 'cards' || view === 'loans')));
        });
        if (targetView === 'home' || targetView === 'cards' || targetView === 'loans' || targetView === 'bills') renderAll();
        if (targetView === 'admin') populateDropdowns(); 
    }

    window.switchBackToHome = () => { 
        const acc = financialItems.find(i => i.id === currentActiveAccountId);
        currentActiveAccountId = null; 
        if (acc && acc.type === 'card') switchView('cards');
        else if (acc && acc.type === 'loan') switchView('loans');
        else switchView('home'); 
    };

    function renderAll() { renderHome(); renderCards(); renderLoans(); renderBills(); populateDropdowns(); }

    function renderHome() {
        const homeContent = document.getElementById("home-content");
        if (!homeContent) return;
        homeContent.innerHTML = ""; 
        const accounts = financialItems.filter(i => i.type === 'account');
        if (accounts.length === 0) { homeContent.innerHTML = "<p class='placeholder-text'>No accounts added yet.</p>"; return; }
        const grid = document.createElement('div'); grid.className = 'tiles-grid';
        accounts.forEach(item => {
            const balanceDisplay = `${item.balance < 0 ? '-' : ''}£${Math.abs(item.balance).toFixed(2)}`;
            const themeClass = item.theme || '';
            let extraInfoHtml = '';
            if (item.hasOverdraft) { extraInfoHtml = `<div class="available-balance">${item.balance >= 0 ? 'Limit' : 'Available'}: £${(item.balance >= 0 ? item.odLimit : (item.balance + item.odLimit)).toFixed(2)}</div>`; }
            const tile = document.createElement('div');
            tile.className = `square-tile ${themeClass ? 'themed ' + themeClass : ''}`;
            tile.onclick = () => openAccountDetails(item.id); 
            tile.innerHTML = `
                <div class="top-info">
                    <div class="header-row"><div class="name">${item.name}</div><div class="simple-emoji">${item.emoji || '🏦'}</div></div>
                    <div class="sub">${item.accountType === 'savings' ? 'Savings' : 'Current'} Account</div>
                </div>
                <div class="bottom-info"><div class="item-amount ${item.balance < 0 && !themeClass ? 'text-red' : ''}">${balanceDisplay}</div>${extraInfoHtml}</div>
            `;
            grid.appendChild(tile);
        });
        homeContent.appendChild(grid);
    }

    function renderCards() {
        const content = document.getElementById("cards-content");
        if (!content) return;
        content.innerHTML = "";
        const cards = financialItems.filter(i => i.type === 'card');
        if (cards.length === 0) { content.innerHTML = "<p class='placeholder-text'>No cards added.</p>"; return; }
        const grid = document.createElement('div'); grid.className = 'tiles-grid';
        cards.forEach(item => {
            const balanceDisplay = `${item.balance < 0 ? '-' : ''}£${Math.abs(item.balance).toFixed(2)}`;
            const themeClass = item.theme || '';
            const ringStyle = `background: conic-gradient(${themeClass ? 'rgba(255,255,255,0.9)' : 'var(--accent)'} ${item.creditLimit > 0 ? (Math.abs(item.balance) / item.creditLimit) * 100 : 0}%, transparent 0);`;
            const tile = document.createElement('div'); 
            tile.className = `square-tile ${themeClass ? 'themed ' + themeClass : ''}`;
            tile.onclick = () => openAccountDetails(item.id); 
            tile.innerHTML = `
                <div class="top-info">
                    <div class="header-row"><div class="name">${item.name}</div><div class="progress-ring" style="${ringStyle}"><div class="progress-ring-inner">${item.emoji || '💳'}</div></div></div>
                    <div class="sub">Due: Day ${item.dueDate || 'N/A'}</div>
                </div>
                <div class="bottom-info"><div class="item-amount ${item.balance < 0 && !themeClass ? 'text-red' : ''}">${balanceDisplay}</div><div class="available-balance">Limit: £${(item.creditLimit || 0).toFixed(2)}</div></div>
            `;
            grid.appendChild(tile);
        });
        content.appendChild(grid);
    }

    function renderLoans() {
        const content = document.getElementById("loans-content");
        if (!content) return;
        content.innerHTML = "";
        const loans = financialItems.filter(i => i.type === 'loan');
        if (loans.length === 0) { content.innerHTML = "<p class='placeholder-text'>No loans added.</p>"; return; }
        const grid = document.createElement('div'); grid.className = 'tiles-grid';
        loans.forEach(item => {
            const balanceDisplay = `${item.balance < 0 ? '-' : ''}£${Math.abs(item.balance).toFixed(2)}`;
            const themeClass = item.theme || '';
            const ringStyle = `background: conic-gradient(${themeClass ? 'rgba(255,255,255,0.9)' : 'var(--accent)'} ${item.originalAmount > 0 ? ((item.originalAmount - Math.abs(item.balance)) / item.originalAmount) * 100 : 0}%, transparent 0);`;
            const tile = document.createElement('div'); 
            tile.className = `square-tile ${themeClass ? 'themed ' + themeClass : ''}`;
            tile.onclick = () => openAccountDetails(item.id); 
            tile.innerHTML = `
                <div class="top-info">
                    <div class="header-row"><div class="name">${item.name}</div><div class="progress-ring" style="${ringStyle}"><div class="progress-ring-inner">${item.emoji || '💰'}</div></div></div>
                    <div class="sub">Due: Day ${item.dueDate || 'N/A'}</div>
                </div>
                <div class="bottom-info"><div class="item-amount ${item.balance < 0 && !themeClass ? 'text-red' : ''}">${balanceDisplay}</div><div class="available-balance">£${(item.monthlyPayment || 0).toFixed(2)} / mo</div></div>
            `;
            grid.appendChild(tile);
        });
        content.appendChild(grid);
    }

    function renderBills() {
        const billsContent = document.getElementById("bills-content");
        if (!billsContent) return;
        billsContent.innerHTML = "";
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); 
        const scheduleItems = financialItems.filter(i => i.type === 'bill' || i.type === 'salary');
        if (scheduleItems.length === 0) { billsContent.innerHTML = "<p class='placeholder-text'>No items scheduled.</p>"; return; }
        const scheduledList = scheduleItems.map(item => {
            let actualDate = item.type === 'bill' ? getAdjustedPaymentDate(now.getFullYear(), now.getMonth(), parseInt(item.dueDate)) : getAdjustedIncomeDate(now.getFullYear(), now.getMonth(), item.dueDate);
            return { ...item, actualDate };
        }).sort((a, b) => a.actualDate - b.actualDate);
        const upcoming = scheduledList.filter(b => b.actualDate >= today);
        const past = scheduledList.filter(b => b.actualDate < today);
        const listContainer = document.createElement('div'); listContainer.className = 'settings-group';
        upcoming.forEach(item => {
            const isIncome = item.type === 'salary';
            const row = document.createElement('div'); row.className = 'item-tile';
            row.onclick = () => openEditModal(item.id); 
            row.innerHTML = `<div class="item-info"><div class="list-emoji">${item.emoji || (isIncome ? '💸' : '📑')}</div><div><div class="name">${item.name}</div><div class="sub" style="color: ${isIncome ? '#34C759' : 'var(--accent)'}; font-weight: 600;">${isIncome ? 'INCOME' : 'UPCOMING'}: ${item.actualDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', weekday: 'short' })}</div></div></div><div class="amount-container"><div class="item-amount ${isIncome ? 'text-green' : ''}">${isIncome ? '+' : ''}£${Math.abs(item.balance).toFixed(2)}</div></div>`;
            listContainer.appendChild(row);
        });
        if (upcoming.length > 0 && past.length > 0) { const divider = document.createElement('div'); divider.className = 'bill-divider'; listContainer.appendChild(divider); }
        past.forEach(item => {
            const isIncome = item.type === 'salary';
            const row = document.createElement('div'); row.className = 'item-tile is-paid';
            row.onclick = () => openEditModal(item.id); 
            row.innerHTML = `<div class="item-info"><div class="list-emoji" style="opacity: 0.5;">${item.emoji || (isIncome ? '💸' : '📑')}</div><div><div class="name">${item.name}</div><div class="sub">${isIncome ? 'Received' : 'Paid'}: ${item.actualDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', weekday: 'short' })}</div></div></div><div class="amount-container"><div class="item-amount"><span class="status-badge paid" style="color: ${isIncome ? '#34C759' : '#8E8E93'}">${isIncome ? 'Received' : 'Paid'}</span>£${Math.abs(item.balance).toFixed(2)}</div></div>`;
            listContainer.appendChild(row);
        });
        billsContent.appendChild(listContainer);
    }

    window.openAccountDetails = (itemId) => {
        currentActiveAccountId = itemId;
        const item = financialItems.find(i => i.id === itemId);
        if(!item) return;
        document.getElementById('detail-account-name').innerText = `${item.emoji || ''} ${item.name}`;
        const balEl = document.getElementById('detail-account-balance');
        balEl.innerText = `${item.balance < 0 ? '-' : ''}£${Math.abs(item.balance).toFixed(2)}`;
        balEl.className = `detail-balance-large ${item.balance < 0 ? 'text-red' : ''}`;
        const odEl = document.getElementById('detail-account-od');
        if (item.type === 'account' && item.hasOverdraft) odEl.innerText = item.balance >= 0 ? `Limit: £${item.odLimit.toFixed(2)}` : `Available: £${(item.balance + item.odLimit).toFixed(2)}`;
        else if (item.type === 'card' && item.creditLimit) odEl.innerText = `Credit Limit: £${item.creditLimit.toFixed(2)}`;
        else odEl.innerText = "";
        const listEl = document.getElementById('transaction-list'); listEl.innerHTML = "";
        const txs = (item.transactions || []).slice(0, 20);
        if (txs.length === 0) listEl.innerHTML = "<p class='placeholder-text' style='padding-bottom: 20px;'>No recent transactions.</p>"; 
        else txs.forEach(tx => {
            const row = document.createElement('div'); row.className = 'settings-row tx-row';
            row.innerHTML = `<div style="flex: 1;"><div class="tx-flex"><span class="tx-desc">${tx.description}</span><span class="tx-val ${tx.amount < 0 ? 'text-red' : 'text-green'}">${tx.amount < 0 ? '-' : '+'}£${Math.abs(tx.amount).toFixed(2)}</span></div><div class="tx-flex" style="margin-bottom:0;"><span class="tx-date">${tx.date}</span><span class="tx-rolling">Bal: ${tx.rollingBalance < 0 ? '-' : ''}£${Math.abs(tx.rollingBalance).toFixed(2)}</span></div></div>`;
            listEl.appendChild(row);
        });
        switchView('account-details');
    };

    const overlay = document.getElementById('modal-overlay');
    const txModal = document.getElementById('transaction-modal');
    const editModal = document.getElementById('edit-modal');

    window.openTransactionModal = () => { const txAcc = document.getElementById('txAccount'); txAcc.selectedIndex = 0; txAcc.dispatchEvent(new Event('change')); overlay.classList.add('active'); setTimeout(() => txModal.classList.add('open'), 10); };
    
    window.openEditModal = (overrideId) => {
        const targetId = overrideId || currentActiveAccountId;
        currentActiveAccountId = targetId;
        const item = financialItems.find(i => i.id === targetId);
        if(!item) return;
        document.getElementById('editName').value = item.name; document.getElementById('editBalance').value = item.balance;
        const odWrapper = document.getElementById('edit-od-wrapper'), cardWrapper = document.getElementById('edit-card-wrapper'), dateWrapper = document.getElementById('edit-date-wrapper');
        odWrapper.style.display = 'none'; cardWrapper.style.display = 'none'; dateWrapper.style.display = 'none';
        if(item.type === 'account' && item.hasOverdraft) { odWrapper.style.display = 'block'; document.getElementById('editOdLimit').value = item.odLimit; } 
        else if (item.type === 'card') { cardWrapper.style.display = 'block'; document.getElementById('editCardLimit').value = item.creditLimit; dateWrapper.style.display = 'block'; document.getElementById('editDay').value = item.dueDate; }
        else if (['loan', 'bill', 'salary'].includes(item.type)) { dateWrapper.style.display = 'block'; document.getElementById('editDay').value = item.dueDate; }
        overlay.classList.add('active'); setTimeout(() => editModal.classList.add('open'), 10);
    };

    window.closeAllModals = () => { txModal.classList.remove('open'); editModal.classList.remove('open'); setTimeout(() => overlay.classList.remove('active'), 300); };

    document.getElementById('transaction-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const fromAccId = document.getElementById('txAccount').value, type = document.querySelector('input[name="txType"]:checked').value, amountInput = parseFloat(document.getElementById('txAmount').value), dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
        let desc = document.getElementById('txDesc').value, confettiTriggered = false;
        if (type === 'transfer') {
            const toAccId = document.getElementById('txToAccount').value, fromIdx = financialItems.findIndex(i => i.id === fromAccId), toIdx = financialItems.findIndex(i => i.id === toAccId);
            if (fromIdx !== -1 && toIdx !== -1) { financialItems[fromIdx].balance -= amountInput; financialItems[fromIdx].transactions.unshift({ date: dateStr, description: `To ${financialItems[toIdx].name}`, amount: -amountInput, rollingBalance: financialItems[fromIdx].balance }); if (financialItems[toIdx].balance < 0 && (financialItems[toIdx].balance + amountInput) >= 0 && (financialItems[toIdx].type === 'card' || financialItems[toIdx].type === 'loan')) confettiTriggered = true; financialItems[toIdx].balance += amountInput; financialItems[toIdx].transactions.unshift({ date: dateStr, description: `From ${financialItems[fromIdx].name}`, amount: amountInput, rollingBalance: financialItems
