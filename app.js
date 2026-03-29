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
            
            if (selectedType === 'account') {
                document.getElementById('accountType').required = true;
            } else if (selectedType === 'card') {
                document.getElementById('cardLimit').required = true;
                document.getElementById('cardDay').required = true;
            } else if (selectedType === 'loan') {
                document.getElementById('loanOriginal').required = true;
                document.getElementById('loanMonthly').required = true;
                document.getElementById('loanDay').required = true;
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
    }

    // --- Centralized Rendering ---
    function renderAll() {
        renderHome();
        renderCards();
        renderLoans();
        renderBills();
        populateBillAccounts();
    }

    function renderHome() {
        const homeContent = document.getElementById("home-content");
        if (!homeContent) return;
        homeContent.innerHTML = ""; 
        
        const accounts = financialItems.filter(i => i.type === 'account');
        
        if (accounts.length === 0) {
            homeContent.innerHTML = "<p class='placeholder-text'>No accounts added yet.</p>";
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'tiles-grid';

        accounts.forEach(item => {
            const isNegative = item.balance < 0;
            const sign = isNegative ? '-' : '';
            const balanceDisplay = `${sign}£${Math.abs(item.balance).toFixed(2)}`;
            
            let extraInfoHtml = '';
            if (item.hasOverdraft) {
                const available = item.balance + (item.odLimit || 0);
                extraInfoHtml = `<div class="available-balance">Available: £${available.toFixed(2)}</div>`;
            }

            const subText = item.accountType === 'savings' ? 'Savings Account' : 'Current Account';

            const tile = document.createElement('div');
            tile.className = 'square-tile';
            tile.innerHTML = `
                <div class="top-info">
                    <div class="name">${item.name}</div>
                    <div class="sub">${subText}</div>
                </div>
                <div class="bottom-info">
                    <div class="item-amount ${isNegative ? 'text-red' : ''}">${balanceDisplay}</div>
                    ${extraInfoHtml}
                </div>
            `;
            grid.appendChild(tile);
