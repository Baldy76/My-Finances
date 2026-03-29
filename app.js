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

// 3. Main App Logic
document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem('MyApp_Theme') === 'true';
    applyTheme(savedTheme);

    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));

    const syncBtn = document.getElementById('sync-updates-btn');
    if (syncBtn) {
        syncBtn.addEventListener('click', () => {
            syncBtn.innerText = "Syncing...";
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    for (let reg of registrations) reg.unregister();
                });
            }
            caches.keys().then(names => {
                for (let name of names) caches.delete(name);
            }).then(() => setTimeout(() => window.location.reload(true), 500));
        });
    }

    let financialItems = JSON.parse(localStorage.getItem("financialItems")) || [];
    const views = ['cards', 'bills', 'home', 'loans', 'admin', 'account-details'];
    let currentActiveAccountId = null; 

    const salaryDaySelect = document.getElementById('salaryDay');
    if (salaryDaySelect && salaryDaySelect.options.length <= 2) {
        for(let i=1; i<=31; i++) {
            const s = ["th", "st", "nd", "rd"], v = i % 100;
            const ordinal = (s[(v - 20) % 10] || s[v] || s[0]);
            salaryDaySelect.insertAdjacentHTML('beforeend', `<option value="${i}">${i}${ordinal}</option>`);
        }
    }

    // Dynamic Form Handling
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
        if (txSelect) txSelect.innerHTML = '<option value="" disabled selected>Select Account / Card</option>';
        if (txToSelect) txToSelect.innerHTML = '<option value="" disabled selected>Select Account / Card to Credit</option>';
        
        // Include BOTH Accounts and Cards for the transaction dropdowns
        const accountsAndCards = financialItems.filter(i => i.type === 'account' || i.type === 'card');
        const justAccounts = financialItems.filter(i => i.type === 'account');

        justAccounts.forEach(acc => {
            if (billSelect) billSelect.insertAdjacentHTML('beforeend', `<option value="${acc.id}">${acc.name}</option>`);
            if (salarySelect) salarySelect.insertAdjacentHTML('beforeend', `<option value="${acc.id}">${acc.name}</option>`);
        });

        accountsAndCards.forEach(item => {
            if (txSelect) txSelect.insertAdjacentHTML('beforeend', `<option value="${item.id}">${item.name}</option>`);
            if (txToSelect) txToSelect.insertAdjacentHTML('beforeend', `<option value="${item.id}">${item.name}</option>`);
        });
    }

    const txTypeRadios = document.querySelectorAll('input[name="txType"]');
    const transferContainer = document.getElementById('transfer-to-container');
    const txToAccount = document.getElementById('txToAccount');
    const txAccount = document.getElementById('txAccount');

    txTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if(e.target.value === 'transfer') {
                transferContainer.style.display = 'block';
                txToAccount.required = true;
                txAccount.options[0].text = "Transfer From Account/Card";
            } else {
                transferContainer.style.display = 'none';
                txToAccount.required = false;
                txAccount.options[0].text = "Select Account/Card";
            }
        });
    });

    // Navigation Logic
    views.forEach(view => {
        const navBtn = document.getElementById(`nav-${view}`);
        if (navBtn) navBtn.addEventListener("click", () => switchView(view));
    });

    function switchView(targetView) {
        views.forEach(view => {
            const vEl = document.getElementById(`view-${view}`);
            const nEl = document.getElementById(`nav-${view}`);
            if(vEl) vEl.classList.toggle("active-view", view === targetView);
            if(nEl) nEl.classList.toggle("active", view === targetView || (targetView === 'account-details' && (view === 'home' || view === 'cards')));
        });
        if (targetView === 'home' || targetView === 'cards' || targetView === 'bills') renderAll();
        if (targetView === 'admin') populateDropdowns(); 
    }

    window.switchBackToHome = () => { 
        // Go back to the correct tab based on item type
        const acc = financialItems.find(i => i.id === currentActiveAccountId);
        currentActiveAccountId = null; 
        if (acc && acc.type === 'card') switchView('cards');
        else switchView('home'); 
    };

    // Rendering Views
    function renderAll() { renderHome(); renderCards(); renderLoans(); renderBills(); populateDropdowns(); }

    function renderHome() {
        const homeContent = document.getElementById("home-content");
        if (!homeContent) return;
        homeContent.innerHTML = ""; 
        const accounts = financialItems.filter(i => i.type === 'account');
        if (accounts.length === 0) { homeContent.innerHTML = "<p class='placeholder-text'>No accounts added yet.</p>"; return; }

        const grid = document.createElement('div'); grid.className = 'tiles-grid';

        accounts.forEach(item => {
            const isNegative = item.balance < 0;
            const sign = isNegative ? '-' : '';
            const balanceDisplay = `${sign}£${Math.abs(item.balance).toFixed(2)}`;
            
            let extraInfoHtml = '';
            if (item.hasOverdraft) {
                if (item.balance >= 0) extraInfoHtml = `<div class="available-balance">Overdraft Limit: £${(item.odLimit || 0).toFixed(2)}</div>`;
                else extraInfoHtml = `<div class="available-balance">Available OD: £${(item.balance + (item.odLimit || 0)).toFixed(2)}</div>`;
            }

            const subText = item.accountType === 'savings' ? 'Savings Account' : 'Current Account';
            const tile = document.createElement('div');
            tile.className = 'square-tile';
            tile.onclick = () => openAccountDetails(item.id); 
            tile.innerHTML = `
                <div class="top-info"><div class="name">${item.name}</div><div class="sub">${subText}</div></div>
                <div class="bottom-info"><div class="item-amount ${isNegative ? 'text-red' : ''}">${balanceDisplay}</div>${extraInfoHtml}</div>
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
        if (cards.length === 0) { content.innerHTML = "<p class='placeholder-text'>No credit cards added.</p>"; return; }
        
        const grid = document.createElement('div'); grid.className = 'tiles-grid';
        cards.forEach(item => {
            const isNegative = item.balance < 0;
            const sign = isNegative ? '-' : '';
            const balanceDisplay = `${sign}£${Math.abs(item.balance).toFixed(2)}`;
            
            const tile = document.createElement('div'); 
            tile.className = 'square-tile';
            tile.onclick = () => openAccountDetails(item.id); 

            tile.innerHTML = `
                <div class="top-info"><div class="name">${item.name}</div><div class="sub">Due: ${item.dueDate ? 'Day ' + item.dueDate : 'N/A'}</div></div>
                <div class="bottom-info"><div class="item-amount ${isNegative ? 'text-red' : ''}">${balanceDisplay}</div><div class="available-balance">${item.creditLimit ? `Limit: £${item.creditLimit.toFixed(2)}` : ''}</div></div>
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
            const isNegative = item.balance < 0;
            const sign = isNegative ? '-' : '';
            const balanceDisplay = `${sign}£${Math.abs(item.balance).toFixed(2)}`;
            const tile = document.createElement('div'); tile.className = 'square-tile';
            tile.innerHTML = `
                <div class="top-info"><div class="name">${item.name}</div><div class="sub">Due: ${item.dueDate ? 'Day ' + item.dueDate : 'N/A'}</div></div>
                <div class="bottom-info"><div class="item-amount ${isNegative ? 'text-red' : ''}">${balanceDisplay}</div><div class="available-balance">${item.monthlyPayment ? `£${item.monthlyPayment.toFixed(2)} / mo` : ''}</div></div>
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
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const scheduleItems = financialItems.filter(i => i.type === 'bill' || i.type === 'salary');
        if (scheduleItems.length === 0) { billsContent.innerHTML = "<p class='placeholder-text'>No items scheduled.</p>"; return; }

        const scheduledList = scheduleItems.map(item => {
            let actualDate;
            if (item.type === 'bill') actualDate = getAdjustedPaymentDate(currentYear, currentMonth, parseInt(item.dueDate));
            if (item.type === 'salary') actualDate = getAdjustedIncomeDate(currentYear, currentMonth, item.dueDate);
            return { ...item, actualDate };
        });

        scheduledList.sort((a, b) => a.actualDate - b.actualDate);
        const upcoming = scheduledList.filter(b => b.actualDate >= today);
        const past = scheduledList.filter(b => b.actualDate < today);

        const listContainer = document.createElement('div'); listContainer.className = 'settings-group';

        upcoming.forEach(item => {
            const dateStr = item.actualDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', weekday: 'short' });
            const targetAcc = financialItems.find(a => a.id === (item.debitAccount || item.creditAccount));
            const accName = targetAcc ? targetAcc.name : 'Unknown Account';
            
            const isIncome = item.type === 'salary';
            const labelText = isIncome ? 'INCOME' : 'UPCOMING';
            const fromToText = isIncome ? `To: ${accName}` : `From: ${accName}`;
            const amountClass = isIncome ? 'text-green' : '';
            const sign = isIncome ? '+' : '';

            const row = document.createElement('div'); row.className = 'item-tile';
            row.innerHTML = `
                <div class="item-info">
                    <div class="name">${item.name}</div>
                    <div class="sub" style="color: ${isIncome ? '#34C759' : 'var(--accent)'}; font-weight: 600;">${labelText}: ${dateStr}</div>
                    <div class="sub" style="font-size: 10px; margin-top: 2px;">${fromToText}</div>
                </div>
                <div class="amount-container"><div class="item-amount ${amountClass}">${sign}£${Math.abs(item.balance).toFixed(2)}</div></div>
            `;
            listContainer.appendChild(row);
        });

        if (upcoming.length > 0 && past.length > 0) {
            const divider = document.createElement('div'); divider.className = 'bill-divider'; listContainer.appendChild(divider);
        }

        past.forEach(item => {
            const dateStr = item.actualDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', weekday: 'short' });
            const isIncome = item.type === 'salary';
            const badgeText = isIncome ? 'Received' : 'Paid';

            const row = document.createElement('div'); row.className = 'item-tile is-paid';
            row.innerHTML = `
                <div class="item-info"><div class="name">${item.name}</div><div class="sub">${badgeText.toUpperCase()}: ${dateStr}</div></div>
                <div class="amount-container">
                    <div class="item-amount">
                        <span class="status-badge paid" style="color: ${isIncome ? '#34C759' : '#8E8E93'}">${badgeText}</span>
                        £${Math.abs(item.balance).toFixed(2)}
                    </div>
                </div>
            `;
            listContainer.appendChild(row);
        });
        billsContent.appendChild(listContainer);
    }

    // Account & Card Details View
    window.openAccountDetails = (itemId) => {
        currentActiveAccountId = itemId;
        const item = financialItems.find(i => i.id === itemId);
        if(!item) return;

        document.getElementById('detail-account-name').innerText = item.name;
        const isNeg = item.balance < 0;
        const balEl = document.getElementById('detail-account-balance');
        balEl.innerText = `${isNeg ? '-' : ''}£${Math.abs(item.balance).toFixed(2)}`;
        balEl.className = `detail-balance-large ${isNeg ? 'text-red' : ''}`;

        const odEl = document.getElementById('detail-account-od');
        
        // Handle OD for Accounts, Limit for Cards
        if (item.type === 'account' && item.hasOverdraft) {
            odEl.innerText = item.balance >= 0 ? `Limit: £${item.odLimit.toFixed(2)}` : `Available: £${(item.balance + item.odLimit).toFixed(2)}`;
        } else if (item.type === 'card' && item.creditLimit) {
            odEl.innerText = `Credit Limit: £${item.creditLimit.toFixed(2)}`;
        } else { 
            odEl.innerText = ""; 
        }

        const listEl = document.getElementById('transaction-list');
        listEl.innerHTML = "";
        const txs = item.transactions || [];

        if (txs.length === 0) {
            listEl.innerHTML = "<p class='placeholder-text' style='padding-bottom: 20px;'>No recent transactions.</p>";
        } else {
            const recentTxs = txs.slice(0, 20);
            recentTxs.forEach(tx => {
                const isOut = tx.amount < 0;
                const sign = isOut ? '-' : '+';
                const colorClass = isOut ? 'text-red' : 'text-green';
                const isRollNeg = tx.rollingBalance < 0;
                const rollSign = isRollNeg ? '-' : '';

                const row = document.createElement('div');
                row.className = 'settings-row tx-row';
                row.innerHTML = `
                    <div style="flex: 1;">
                        <div class="tx-flex">
                            <span class="tx-desc">${tx.description}</span>
                            <span class="tx-val ${colorClass}">${sign}£${Math.abs(tx.amount).toFixed(2)}</span>
                        </div>
                        <div class="tx-flex" style="margin-bottom:0;">
                            <span class="tx-date">${tx.date}</span>
                            <span class="tx-rolling">Bal: ${rollSign}£${Math.abs(tx.rollingBalance).toFixed(2)}</span>
                        </div>
                    </div>
                `;
                listEl.appendChild(row);
            });
        }
        switchView('account-details');
    };

    // Modals Logic
    const overlay = document.getElementById('modal-overlay');
    const txModal = document.getElementById('transaction-modal');
    const editModal = document.getElementById('edit-modal');

    window.openTransactionModal = () => { overlay.classList.add('active'); setTimeout(() => txModal.classList.add('open'), 10); };
    
    window.openEditModal = () => {
        if(!currentActiveAccountId) return;
        const item = financialItems.find(i => i.id === currentActiveAccountId);
        
        document.getElementById('editBalance').value = item.balance;
        
        const odWrapper = document.getElementById('edit-od-wrapper');
        const cardWrapper = document.getElementById('edit-card-wrapper');
        
        // Reset visibility
        odWrapper.style.display = 'none';
        cardWrapper.style.display = 'none';
        document.getElementById('editOdLimit').required = false;
        document.getElementById('editCardLimit').required = false;

        // Show appropriate edit fields
        if(item.type === 'account' && item.hasOverdraft) {
            odWrapper.style.display = 'block'; 
            document.getElementById('editOdLimit').value = item.odLimit; 
        } else if (item.type === 'card') {
            cardWrapper.style.display = 'block';
            document.getElementById('editCardLimit').value = item.creditLimit;
        }
        
        overlay.classList.add('active'); setTimeout(() => editModal.classList.add('open'), 10);
    };

    window.closeAllModals = () => { txModal.classList.remove('open'); editModal.classList.remove('open'); setTimeout(() => overlay.classList.remove('active'), 300); };

    // Transaction & Transfer Submission
    document.getElementById('transaction-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const fromAccId = document.getElementById('txAccount').value;
        const type = document.querySelector('input[name="txType"]:checked').value;
        const amountInput = parseFloat(document.getElementById('txAmount').value);
        let desc = document.getElementById('txDesc').value;
        const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
        
        if (type === 'transfer') {
            const toAccId = document.getElementById('txToAccount').value;
            if (fromAccId === toAccId) { alert("You cannot transfer money to the exact same account!"); return; }
            
            const fromIndex = financialItems.findIndex(i => i.id === fromAccId);
            const toIndex = financialItems.findIndex(i => i.id === toAccId);
            
            if (fromIndex !== -1 && toIndex !== -1) {
                if(!financialItems[fromIndex].transactions) financialItems[fromIndex].transactions = [];
                if(!financialItems[toIndex].transactions) financialItems[toIndex].transactions = [];

                financialItems[fromIndex].balance -= amountInput;
                financialItems[fromIndex].transactions.unshift({
                    id: Date.now().toString() + '-out',
                    date: dateStr, description: `Transfer to ${financialItems[toIndex].name}`,
                    amount: -amountInput, rollingBalance: financialItems[fromIndex].balance
                });

                financialItems[toIndex].balance += amountInput;
                financialItems[toIndex].transactions.unshift({
                    id: Date.now().toString() + '-in',
                    date: dateStr, description: `Transfer from ${financialItems[fromIndex].name}`,
                    amount: amountInput, rollingBalance: financialItems[toIndex].balance
                });
            }
        } else {
            // Out, In, or Bonus logic
            const isNegative = type === 'out';
            const actualAmount = isNegative ? -Math.abs(amountInput) : Math.abs(amountInput);
            
            // Add [Bonus] tag if it's a bonus
            if (type === 'bonus') desc = `[Bonus] ${desc}`;

            const accountIndex = financialItems.findIndex(i => i.id === fromAccId);
            
            if (accountIndex !== -1) {
                if(!financialItems[accountIndex].transactions) financialItems[accountIndex].transactions = [];
                financialItems[accountIndex].balance += actualAmount;
                financialItems[accountIndex].transactions.unshift({
                    id: Date.now().toString(),
                    date: dateStr, description: desc,
                    amount: actualAmount, rollingBalance: financialItems[accountIndex].balance
                });
            }
        }

        localStorage.setItem("financialItems", JSON.stringify(financialItems));
        document.getElementById('transaction-form').reset();
        transferContainer.style.display = 'none';
        txToAccount.required = false;
        document.getElementById('tx-out').checked = true;
        document.getElementById('txAccount').options[0].text = "Select Account/Card";

        closeAllModals(); 
        if (currentActiveAccountId) openAccountDetails(currentActiveAccountId);
        renderAll();
    });

    // Edit Submission
    document.getElementById('edit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const itemIndex = financialItems.findIndex(i => i.id === currentActiveAccountId);
        if(itemIndex !== -1) {
            financialItems[itemIndex].balance = parseFloat(document.getElementById('editBalance').value);
            
            if(financialItems[itemIndex].type === 'account' && financialItems[itemIndex].hasOverdraft) {
                financialItems[itemIndex].odLimit = parseFloat(document.getElementById('editOdLimit').value) || 0;
            } else if (financialItems[itemIndex].type === 'card') {
                financialItems[itemIndex].creditLimit = parseFloat(document.getElementById('editCardLimit').value) || 0;
            }
            
            localStorage.setItem("financialItems", JSON.stringify(financialItems));
            closeAllModals(); openAccountDetails(currentActiveAccountId); renderAll();
        }
    });

    // Form Submission (Adding new items)
    const addItemForm = document.getElementById("add-item-form");
    if (addItemForm) {
        addItemForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const type = document.querySelector('input[name="itemType"]:checked').value;
            let newItem = {
                id: Date.now().toString(), type: type,
                name: document.getElementById("itemName").value,
                balance: parseFloat(document.getElementById("itemAmount").value),
                transactions: []
            };

            if (type === 'account') {
                newItem.accountType = document.getElementById("accountType").value;
                newItem.hasOverdraft = document.getElementById("hasOverdraft").checked;
                newItem.odLimit = parseFloat(document.getElementById("odLimit").value) || 0;
            } else if (type === 'card') {
                newItem.creditLimit = parseFloat(document.getElementById("cardLimit").value) || 0; newItem.dueDate = document.getElementById("cardDay").value;
            } else if (type === 'loan') {
                newItem.originalAmount = parseFloat(document.getElementById("loanOriginal").value) || 0; newItem.monthlyPayment = parseFloat(document.getElementById("loanMonthly").value) || 0; newItem.dueDate = document.getElementById("loanDay").value;
            } else if (type === 'bill') {
                newItem.dueDate = document.getElementById("billDay").value; newItem.debitAccount = document.getElementById("billAccount").value;
            } else if (type === 'salary') {
                newItem.dueDate = document.getElementById("salaryDay").value; newItem.creditAccount = document.getElementById("salaryAccount").value;
            }

            financialItems.push(newItem);
            localStorage.setItem("financialItems", JSON.stringify(financialItems));
            addItemForm.reset(); document.getElementById('type-account').checked = true; updateFormFields('account');
            renderAll(); switchView('home');
        });
    }

    updateFormFields('account');
    renderAll();
});
