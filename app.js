document.addEventListener("DOMContentLoaded", () => {
    let accounts = JSON.parse(localStorage.getItem("bankingAccounts")) || [];
    const accountsContainer = document.getElementById("accounts-container");
    const addAccountForm = document.getElementById("add-account-form");
    const views = ['cards', 'bills', 'home', 'loans', 'admin'];

    views.forEach(view => {
        const navBtn = document.getElementById(`nav-${view}`);
        if(navBtn) {
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

        if (targetView === 'home') { renderAccounts(); }
    }

    function renderAccounts() {
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

    renderAccounts();
});
