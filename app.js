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

    // --- 2. PWA Sync Logic ---
    const syncBtn = document.getElementById('sync-updates-btn');
    if (syncBtn) {
        syncBtn.addEventListener('click', () => {
            syncBtn.innerText = "Checking...";
            
            // 1. Clear Service Worker cache if available
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    for (let registration of registrations) {
                        registration.update(); // Checks for new version on server
                    }
                });
            }

            // 2. Force hard reload from server
            setTimeout(() => {
                window.location.reload(true);
            }, 1000);
        });
    }

    // --- 3. State & Elements ---
    let financialItems = JSON.parse(localStorage.getItem("financialItems")) || [];
    const homeContent = document.getElementById("home-content");
    const addItemForm = document.getElementById("add-item-form");
    const typeRadios = document.querySelectorAll('input[name="itemType"]');
    const views = ['cards', 'bills', 'home', 'loans', 'admin'];

    // Form Toggle Logic
    typeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const val = e.target.value;
            document.getElementById('account-only-fields').style.display = (val === 'account') ? 'block' : 'none';
            document.getElementById('bill-only-fields').style.display = (val === 'bill') ? 'block' : 'none';
            document.getElementById('itemAmount').placeholder = (val === 'bill') ? "Bill Amount (£)" : "Balance (£)";
        });
    });

    // Navigation
    views.forEach(view => {
        const navBtn = document.getElementById(`nav-${view}`);
        if (navBtn) navBtn.addEventListener("click", () => switchView(view));
    });

    function switchView(targetView) {
        views.forEach(view => {
            document.getElementById(`view-${view}`).classList.toggle("active-view", view === targetView);
            document.getElementById(`nav-${view}`).classList.toggle("active", view === targetView);
        });
        if (targetView === 'home') renderHome();
    }

    // Render Home
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
                const balanceDisplay = `£${Math.abs(item.balance).toFixed(2)}`;
                const tile = document.createElement('div');
                tile.className = 'item-tile';
                tile.innerHTML = `
                    <div class="item-info">
                        <div class="name">${item.name}</div>
                        <div class="sub">${item.type === 'bill' ? 'Due Day ' + item.dueDate : 'Balance Today'}</div>
                    </div>
                    <div class="item-amount ${item.balance < 0 ? 'text-red' : ''}">${item.balance < 0 ? '-' : ''}${balanceDisplay}</div>
                `;
                section.appendChild(tile);
            });
            homeContent.appendChild(section);
        });
    }

    // Form Submit
    if (addItemForm) {
        addItemForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const type = document.querySelector('input[name="itemType"]:checked').value;
            financialItems.push({
                id: Date.now().toString(),
                type: type,
                name: document.getElementById("itemName").value,
                balance: parseFloat(document.getElementById("itemAmount").value),
                odLimit: type === 'account' ? (parseFloat(document.getElementById("odLimit").value) || 0) : null,
                dueDate: type === 'bill' ? document.getElementById("billDay").value : null
            });
            localStorage.setItem("financialItems", JSON.stringify(financialItems));
            addItemForm.reset();
            switchView('home');
        });
    }

    renderHome();
});
