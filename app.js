// 1. Theme Engine Functions
function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    const meta = document.getElementById('theme-meta'); 
    if(meta) meta.content = isDark ? "#000000" : "#f2f2f7";
    
    const btnLight = document.getElementById('btnLight'); 
    const btnDark = document.getElementById('btnDark');
    if (btnLight && btnDark) {
        if (isDark) { 
            btnLight.classList.remove('active'); 
            btnDark.classList.add('active'); 
        } else { 
            btnLight.classList.add('active'); 
            btnDark.classList.remove('active'); 
        }
    }
}

window.setThemeMode = (isDark) => { 
    applyTheme(isDark); 
    localStorage.setItem('MyApp_Theme', isDark); 
};

// 2. UK Banking Logic
const ukHolidays2026 = [
    "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", 
    "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-28"
];

function getAdjustedPaymentDate(year, month, day) {
    let date = new Date(year, month, day);
    const isNonWorkingDay = (d) => {
        const dayOfWeek = d.getDay(); 
        const offsetDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
        const dateString = offsetDate.toISOString().split('T')[0];
        return dayOfWeek === 0 || dayOfWeek === 6 || ukHolidays2026.includes(dateString);
    };
    while (isNonWorkingDay(date)) {
        date.setDate(date.getDate() + 1);
    }
    return date;
}

// 3. Main App Logic
document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem('MyApp_Theme') === 'true';
    applyTheme(savedTheme);

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
    }

    let financialItems = JSON.parse(localStorage.getItem("financialItems")) || [];
    const views = ['cards', 'bills', 'home', 'loans', 'admin'];

    // --- Dynamic Form Handling ---
    const typeRadios = document.querySelectorAll('input[name="itemType"]');
    const formGroups = {
        account: document.getElementById('account-fields'),
        card: document.getElementById('card-fields'),
        loan: document.getElementById('loan-fields'),
        bill: document.getElementById('bill-fields')
    };
    const itemAmountInput = document.getElementById('itemAmount');

    function updateFormFields(selectedType) {
        Object.values(formGroups).forEach(group => {
            group.style.display = 'none';
            group.querySelectorAll('input, select').forEach(input => input.required = false);
        });

        if (formGroups[selectedType]) {
            formGroups[selectedType].style.display = 'block';
            
            if (selectedType === 'card') {
                document.getElementById('cardLimit').required = true;
            } else if (selectedType === 'loan') {
                document.getElementById('loanOriginal').required = true;
                document.getElementById('loanMonthly').required = true;
            } else if (selectedType === 'bill') {
                document.getElementById('billDay').required = true;
                document.getElementById('billAccount').required = true;
            }
        }

        itemAmountInput.placeholder = (selectedType === 'bill') ? "Bill Amount (£)" : "Current Balance (£)";
    }

    typeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => updateFormFields(e.target.value));
    });

    function populateBillAccounts() {
        const billSelect = document.getElementById('billAccount');
        if (!billSelect) return;
        
        billSelect.innerHTML = '<option value="" disabled selected>Select Account to Debit</option>';
        const accounts = financialItems.filter(i => i.type === 'account');
        
        accounts.forEach(acc => {
            const opt = document.createElement('option');
            opt.value = acc.id;
            opt.textContent = acc.name;
            billSelect.appendChild(opt);
        });
    }

    // --- Navigation Logic ---
    views.forEach(view => {
        const navBtn = document.getElementById(`nav-${view}`);
        if (navBtn) navBtn.addEventListener("click", () => switchView(view));
    });

    function switchView(targetView) {
        views.forEach(view => {
            const vEl = document.getElementById(`view-${view}`);
            const nEl = document.getElementById(`nav-${view}`);
            if(vEl) vEl.classList.toggle("active-view", view === targetView);
            if(nEl) nEl.classList.toggle("active", view === targetView);
        });
        
        if (targetView === 'home') renderHome();
        if (targetView === 'bills') renderBills();
        if (targetView === 'admin') populateBillAccounts(); 
    }

    // --- Rendering Views ---
    function renderHome() {
        const homeContent = document.getElementById("home-content");
        if (!homeContent) return;
        homeContent.innerHTML = ""; 
        const categories = [
            { id: 'account', title: 'Bank Accounts', icon: '🏦' },
            { id: 'card', title: 'Credit Cards', icon: '💳' },
            { id: 'loan', title: 'Loans', icon: '💰' },
            { id: 'bill', title: 'Upcoming Bills', icon: '📑' }
        ];

        categories.forEach(cat => {
            const items = financialItems.filter(i => i.type === cat.id);
            if (items.length === 0) return;
            const section = document.createElement('div');
            section.className = 'home-section';
            section.innerHTML = `<div class="section-title">${cat.icon} ${cat.title}</div>`;
            
            items.forEach(item => {
                const isNegative = item.balance < 0;
                const sign = isNegative ? '-' : '';
                const balanceDisplay = `${sign}£${Math.abs(item.balance).toFixed(2)}`;
                
                // OD Logic: Calculate Available Balance
                let extraInfoHtml = '';
                if (item.type === 'account' && item.hasOverdraft) {
                    const available = item.balance + (item.odLimit || 0);
                    extraInfoHtml = `<div class="available-balance">Available: £${available.toFixed(2)}</div>`;
                }

                const tile = document.createElement('div');
                tile.className = 'item-tile';
                tile.innerHTML = `
                    <div class="item-info">
                        <div class="name">${item.name}</div>
                        <div class="sub">${item.type === 'bill' ? 'Base Due Day ' + item.dueDate : 'Balance Today'}</div>
                    </div>
                    <div class="amount-container">
                        <div class="item-amount ${isNegative ? 'text-red' : ''}">${balanceDisplay}</div>
                        ${extraInfoHtml}
                    </div>
                `;
                section.appendChild(tile);
            });
            homeContent.appendChild(section);
        });
    }

    function renderBills() {
        const billsContent = document.getElementById("bills-content");
        if (!billsContent) return;
        billsContent.innerHTML = "";

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); 
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const bills = financialItems.filter(i => i.type === 'bill');

        if (bills.length === 0) {
            billsContent.innerHTML = "<p class='placeholder-text'>No bills added yet.</p>";
            return;
        }

        const billList = bills.map(bill => {
            const actualDate = getAdjustedPaymentDate(currentYear, currentMonth, parseInt(bill.dueDate));
            return { ...bill, actualDate };
        });

        billList.sort((a, b) => a.actualDate - b.actualDate);

        const unpaidBills = billList.filter(b => b.actualDate >= today);
        const paidBills = billList.filter(b => b.actualDate < today);

        const listContainer = document.createElement('div');
        listContainer.className = 'settings-group';

        unpaidBills.forEach(bill => {
            const dateStr = bill.actualDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', weekday: 'short' });
            const debitAcc = financialItems.find(a => a.id === bill.debitAccount);
            const debitName = debitAcc ? debitAcc.name : 'Unknown Account';

            const row = document.createElement('div');
            row.className = 'item-tile';
            row.innerHTML = `
                <div class="item-info">
                    <div class="name">${bill.name}</div>
                    <div class="sub" style="color: var(--accent); font-weight: 600;">UPCOMING: ${dateStr}</div>
                    <div class="sub" style="font-size: 10px; margin-top: 2px;">From: ${debitName}</div>
                </div>
                <div class="amount-container">
                    <div class="item-amount">£${Math.abs(bill.balance).toFixed(2)}</div>
                </div>
            `;
            listContainer.appendChild(row);
        });

        if (unpaidBills.length > 0 && paidBills.length > 0) {
            const divider = document.createElement('div');
            divider.className = 'bill-divider';
            listContainer.appendChild(divider);
        }

        paidBills.forEach(bill => {
            const dateStr = bill.actualDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', weekday: 'short' });
            const row = document.createElement('div');
            row.className = 'item-tile is-paid';
            row.innerHTML = `
                <div class="item-info">
                    <div class="name">${bill.name}</div>
                    <div class="sub">PAID: ${dateStr}</div>
                </div>
                <div class="amount-container">
                    <div class="item-amount">
                        <span class="status-badge paid">Paid</span>
                        £${Math.abs(bill.balance).toFixed(2)}
                    </div>
                </div>
            `;
            listContainer.appendChild(row);
        });

        billsContent.appendChild(listContainer);
    }

    // --- Form Submission ---
    const addItemForm = document.getElementById("add-item-form");
    if (addItemForm) {
        addItemForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const type = document.querySelector('input[name="itemType"]:checked').value;
            
            let newItem = {
                id: Date.now().toString(),
                type: type,
                name: document.getElementById("itemName").value,
                balance: parseFloat(document.getElementById("itemAmount").value)
            };

            if (type === 'account') {
                newItem.hasOverdraft = document.getElementById("hasOverdraft").checked;
                newItem.odLimit = parseFloat(document.getElementById("odLimit").value) || 0;
            } else if (type === 'card') {
                newItem.creditLimit = parseFloat(document.getElementById("cardLimit").value) || 0;
            } else if (type === 'loan') {
                newItem.originalAmount = parseFloat(document.getElementById("loanOriginal").value) || 0;
                newItem.monthlyPayment = parseFloat(document.getElementById("loanMonthly").value) || 0;
            } else if (type === 'bill') {
                newItem.dueDate = document.getElementById("billDay").value;
                newItem.debitAccount = document.getElementById("billAccount").value;
            }

            financialItems.push(newItem);
            localStorage.setItem("financialItems", JSON.stringify(financialItems));
            
            addItemForm.reset();
            document.getElementById('type-account').checked = true;
            updateFormFields('account');
            populateBillAccounts(); 
            
            switchView('home');
        });
    }

    updateFormFields('account');
    populateBillAccounts();
    renderHome();
});
