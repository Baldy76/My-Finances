document.addEventListener("DOMContentLoaded", () => {
    // --- 1. State Management (Local Storage) ---
    let accounts = JSON.parse(localStorage.getItem("bankingAccounts")) || [];

    // --- 2. DOM Elements ---
    const accountsContainer = document.getElementById("accounts-container");
    const addAccountForm = document.getElementById("add-account-form");
    
    // Array of our 5 view names
    const views = ['cards', 'bills', 'home', 'loans', 'admin'];

    // --- 3. Navigation Logic ---
    // Attach click listeners to all 5 bottom nav buttons
    views.forEach(view => {
        document.getElementById(`nav-${view}`).addEventListener("click", () => switchView(view));
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

        // Re-render accounts if we are navigating back to the Home screen
        if (targetView === 'home') {
            renderAccounts();
        }
    }

    // --- 4. Render Home Screen ---
    function renderAccounts() {
        accountsContainer.innerHTML = ""; 

        if (accounts.length === 0) {
            accountsContainer.innerHTML = "<p style='text-align:center; color:#666; margin-top:20px;'>No accounts found. Go to Admin to add your first bank account.</p>";
            return;
        }

        accounts.forEach(account => {
            const isOverdrawn = account.balance < 0;
            const displayBalance = Math.abs(account.balance).toFixed(2);
            
            const balanceText = isOverdrawn ? `-£${displayBalance}` : `£${displayBalance}`;
            const balanceColorClass = isOverdrawn ? "text-red" : "text-black";

            // Overdraft Math Logic
            let overdraftHTML = "";
            const odLimit = parseFloat(account.overdraftLimit) || 0;

            if (odLimit > 0) {
                if (isOverdrawn) {
                    const remainingOD = (odLimit + account.balance).toFixed(2);
                    overdraftHTML = `
                        <div class="overdraft-container">
                            <span class="od-info">Remaining OD: £${remainingOD}</span>
                            <span class="od-info">Full OD Limit: £${odLimit.toFixed(2)}</span>
                        </div>
                    `;
                } else {
                    overdraftHTML = `
                        <div class="overdraft-container">
                            <span class="od-info">OD Limit: £${odLimit.toFixed(2)}</span>
                        </div>
                    `;
                }
            }

            // Build Tile
            const tile = document.createElement("div");
            tile.className = "account-tile";
            tile.innerHTML = `
                <div class="tile-header">
                    <div class="account-name">${account.name}</div>
                </div>
                <div class="account-balance ${balanceColorClass}">${balanceText}</div>
                ${overdraftHTML}
            `;

            // Click Handler for simulated transaction
            tile.addEventListener("click", () => {
                const deduction = prompt(`Simulate a transaction on ${account.name}.\nEnter amount to deduct (e.g. 200):`);
                if (deduction && !isNaN(deduction)) {
                    account.balance -= parseFloat(deduction);
                    saveAccounts();
                    renderAccounts(); // Update UI immediately
                }
            });

            accountsContainer.appendChild(tile);
        });
    }

    // --- 5. Add Account Logic (Admin Page) ---
    addAccountForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const newAccount = {
            id: Date.now().toString(),
            name: document.getElementById("bankName").value.trim(),
            balance: parseFloat(document.getElementById("initialBalance").value),
            overdraftLimit: parseFloat(document.getElementById("odLimit").value) || 0
        };

        accounts.push(newAccount);
        saveAccounts();
        
        addAccountForm.reset();
        switchView('home'); // Automatically take the user back to Home to see their new account
    });

    // Save to browser
    function saveAccounts() {
        localStorage.setItem("bankingAccounts", JSON.stringify(accounts));
    }

    // Initial load
    renderAccounts();
});
