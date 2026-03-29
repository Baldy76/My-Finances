document.addEventListener("DOMContentLoaded", () => {
    // --- 1. Theme Management ---
    const toggle = document.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme') || 'light';

    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (toggle) toggle.checked = true;
    }

    if (toggle) {
        toggle.addEventListener('change', (e) => {
            const theme = e.target.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        });
    }

    // --- 2. State & Elements ---
    let financialItems = JSON.parse(localStorage.getItem("financialItems")) || [];
    const homeContent = document.getElementById("home-content");
    const addItemForm = document.getElementById("add-item-form");
    const typeRadios = document.querySelectorAll('input[name="itemType"]');
    const views = ['cards', 'bills', 'home', 'loans', 'admin'];

    // --- 3. UI Logic: Toggle Form Fields based on Type ---
    typeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const val = e.target.value;
            const accountFields = document.getElementById('account-only-fields');
            const billFields = document.getElementById('bill-only-fields');
            const amountInput = document.getElementById('itemAmount');

            // Reset visibility
            accountFields.style.display = (val === 'account') ? 'block' : 'none';
            billFields.style.display = (val === 'bill') ? 'block' : 'none';

            // Change placeholder for amount
            if (val === 'bill') amountInput.placeholder = "Bill Amount (£)";
            else amountInput.placeholder = "Balance as of today (£)";
        });
    });

    // --- 4. Navigation ---
    views.forEach(view => {
        const navBtn = document.getElementById(`nav-${view}`);
        if (navBtn) {
            navBtn.addEventListener("click", () => switchView(view));
        }
    });

    function switchView(targetView) {
        views.forEach(view => {
            const viewEl = document.getElementById(`view-${view}`);
            const navEl = document.getElementById(`nav-${view}`);
            if (view === targetView) {
                viewEl.classList.add("active-view");
                navEl.classList.add("active");
            } else {
                viewEl.classList.remove("active-view");
                navEl.classList.remove("active");
            }
        });
        if (targetView === 'home') renderHome();
    }

    // --- 5. Render Home Screen Categories ---
    function renderHome() {
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
                const isOverdrawn = item.type === 'account' && item.balance < 0;
                const balanceDisplay = `£${Math.abs(item.balance).toFixed(2)}`;
                
                let subtext = "";
                if (item.type === 'account' && item.odLimit > 0) subtext = `Limit: £${item.odLimit}`;
                if (item.type === 'bill') subtext = `Due Day ${item.dueDate} (${item.freq})`;
                if (item.type === 'loan') subtext = `Provider: ${item.name}`;

                const tile = document.createElement('div');
                tile.className = 'item-tile';
                tile.innerHTML = `
                    <div class="item-info">
                        <div class="name">${item.name}</div>
                        <div class="sub">${subtext}</div>
                    </div>
                    <div class="item-amount ${isOverdrawn ? 'text-red' : ''}">
                        ${item.balance < 0 ? '-' : ''}${balanceDisplay}
                    </div>
                `;
                section.appendChild(tile);
            });

            homeContent.appendChild(section);
        });

        if (financialItems.length === 0) {
            homeContent.innerHTML = "<p class='placeholder-text'>No data found. Go to Admin to add items.</p>";
        }
    }

    // --- 6. Form Submission ---
    if (addItemForm) {
        addItemForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const type = document.querySelector('input[name="itemType"]:checked').value;
            
            const newItem = {
                id: Date.now().toString(),
                type: type,
                name: document.getElementById("itemName").value,
                balance: parseFloat(document.getElementById("itemAmount").value),
                // Conditional fields
                odLimit: type === 'account' ? (parseFloat(document.getElementById("odLimit").value) || 0) : null,
                dueDate: type === 'bill' ? document.getElementById("billDay").value : null,
                freq: type === 'bill' ? document.getElementById("billFrequency").value : null
            };

            financialItems.push(newItem);
            localStorage.setItem("financialItems", JSON.stringify(financialItems));
            addItemForm.reset();
            switchView('home');
        });
    }

    renderHome();
});
