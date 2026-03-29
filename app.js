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

// 2. UK Banking Logic (Holidays & Weekends)
const ukHolidays2026 = [
    "2026-01-01", // New Year's Day
    "2026-04-03", // Good Friday
    "2026-04-06", // Easter Monday
    "2026-05-04", // Early May Bank Holiday
    "2026-05-25", // Spring Bank Holiday
    "2026-08-31", // Summer Bank Holiday
    "2026-12-25", // Christmas Day
    "2026-12-28"  // Boxing Day (Observed)
];

function getAdjustedPaymentDate(year, month, day) {
    let date = new Date(year, month, day);
    
    // Function to check if a date is a weekend or bank holiday
    const isNonWorkingDay = (d) => {
        const dayOfWeek = d.getDay(); // 0 is Sunday, 6 is Saturday
        
        // Adjust for timezone offset so ISO string matches local day
        const offsetDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
        const dateString = offsetDate.toISOString().split('T')[0];
        
        return dayOfWeek === 0 || dayOfWeek === 6 || ukHolidays2026.includes(dateString);
    };

    // Roll forward until we hit a working day. 
    // This automatically rolls into the next month if needed!
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
            if(nEl) nEl.classList.toggle("active", view === targetView);
        });
        
        if (targetView === 'home') renderHome();
        if (targetView === 'bills') renderBills();
    }

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
                const tile = document.createElement('div');
                tile.className = 'item-tile';
                tile.innerHTML = `
                    <div class="item-info">
                        <div class="name">${item.name}</div>
                        <div class="sub">${item.type === 'bill' ? 'Base Due Day ' + item.dueDate : 'Balance Today'}</div>
                    </div>
                    <div class="item-amount ${item.balance < 0 ? 'text-red' : ''}">£${Math.abs(item.balance).toFixed(2)}</div>
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
        // Create a precise "today" object at midnight for accurate comparison
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); 
        
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const bills = financialItems.filter(i => i.type === 'bill');

        if (bills.length === 0) {
            billsContent.innerHTML = "<p class='placeholder-text'>No bills added yet.</p>";
            return;
        }

        // 1. Calculate the actual payment date for each bill
        const billList = bills.map(bill => {
            const actualDate = getAdjustedPaymentDate(currentYear, currentMonth, parseInt(bill.dueDate));
            return { ...bill, actualDate };
        });

        // 2. Sort chronologically
        billList.sort((a, b) => a.actualDate - b.actualDate);

        // 3. Split into Unpaid (upcoming or today) and Paid (past dates)
        const unpaidBills = billList.filter(b => b.actualDate >= today);
        const paidBills = billList.filter(b => b.actualDate < today);

        const listContainer = document.createElement('div');
        listContainer.className = 'settings-group';

        // Render Unpaid Bills
        unpaidBills.forEach(bill => {
            const dateStr = bill.actualDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', weekday: 'short' });
            const row = document.createElement('div');
            row.className = 'item-tile';
            row.innerHTML = `
                <div class="item-info">
                    <div class="name">${bill.name}</div>
                    <div class="sub" style="color: var(--accent); font-weight: 600;">UPCOMING: ${dateStr}</div>
                </div>
                <div class="item-amount">£${Math.abs(bill.balance).toFixed(2)}</div>
            `;
            listContainer.appendChild(row);
        });

        // Add Divider if both unpaid and paid bills exist
        if (unpaidBills.length > 0 && paidBills.length > 0) {
            const divider = document.createElement('div');
            divider.className = 'bill-divider';
            listContainer.appendChild(divider);
        }

        // Render Paid Bills
        paidBills.forEach(bill => {
            const dateStr = bill.actualDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', weekday: 'short' });
            const row = document.createElement('div');
            row.className = 'item-tile is-paid';
            row.innerHTML = `
                <div class="item-info">
                    <div class="name">${bill.name}</div>
                    <div class="sub">PAID: ${dateStr}</div>
                </div>
                <div class="item-amount">
                    <span class="status-badge paid">Paid</span>
                    £${Math.abs(bill.balance).toFixed(2)}
                </div>
            `;
            listContainer.appendChild(row);
        });

        billsContent.appendChild(listContainer);
    }

    // Form Handling
    const addItemForm = document.getElementById("add-item-form");
    if (addItemForm) {
        addItemForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const type = document.querySelector('input[name="itemType"]:checked').value;
            financialItems.push({
                id: Date.now().toString(),
                type: type,
                name: document.getElementById("itemName").value,
                balance: parseFloat(document.getElementById("itemAmount").value),
                dueDate: type === 'bill' ? document.getElementById("billDay").value : null
            });
            localStorage.setItem("financialItems", JSON.stringify(financialItems));
            addItemForm.reset();
            switchView('home');
        });
    }
    renderHome();
});
