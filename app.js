document.addEventListener("DOMContentLoaded", () => {
    // --- 1. Theme Management (Merged from script.js) ---
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

    // --- 2. Banking State & DOM Elements ---
    let accounts = JSON.parse(localStorage.getItem("bankingAccounts")) || [];
    const accountsContainer = document.getElementById("accounts-container");
    const addAccountForm = document.getElementById("add-account-form");
    const views = ['cards', 'bills', 'home', 'loans', 'admin'];

    // --- 3. Navigation Logic ---
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

        if (targetView === 'home') renderAccounts();
    }

    // --- 4. Render Home Screen ---
    function renderAccounts() {
        if (!accountsContainer) return;
        accountsContainer.innerHTML = ""; 

        if (accounts.length === 0) {
            accountsContainer.innerHTML = "<p style='text-align:center; color:#8e8e93; margin-top:40px;'>No accounts found.</p>";
            return;
        }

        accounts.forEach(account => {
            const isOverdrawn = account.balance < 0;
            const balanceText = (isOverdrawn ? "-" : "") + "£" + Math.abs(account.balance).toFixed(2);
            
            const tile = document.createElement("div");
            tile.className = "account-tile";
            tile.innerHTML = `
                <div class="account-name">${account.name}</div>
                <div class="account-balance ${isOverdrawn ? 'text-red' : ''}">${balanceText}</div>
            `;
            accountsContainer.appendChild(tile);
        });
    }

    // --- 5. Add Account Logic ---
    if (addAccountForm) {
        addAccountForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const newAccount = {
                id: Date.now().toString(),
                name: document.getElementById("bankName").value,
                balance: parseFloat(document.getElementById("initialBalance").value),
                overdraftLimit: parseFloat(document.getElementById("odLimit").value) || 0
            };
            accounts.push(newAccount);
            localStorage.setItem("bankingAccounts", JSON.stringify(accounts));
            addAccountForm.reset();
            switchView('home');
        });
    }

    // Initial render
    renderAccounts();
});
