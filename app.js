document.addEventListener("DOMContentLoaded", () => {
    const accountsContainer = document.getElementById("accounts-container");

    // 1. Fetch the mock data
    fetch("data.json")
        .then(response => response.json())
        .then(data => {
            renderAccounts(data.accounts);
        })
        .catch(error => console.error("Error loading account data:", error));

    // 2. Render the tiles
    function renderAccounts(accounts) {
        accountsContainer.innerHTML = ""; // Clear out any loading text

        accounts.forEach(account => {
            const isOverdrawn = account.balance < 0;
            const displayBalance = Math.abs(account.balance);
            
            // Format the balance text and color
            const balanceText = isOverdrawn ? `-£${displayBalance}` : `£${displayBalance}`;
            const balanceColorClass = isOverdrawn ? "text-red" : "text-black";

            // Calculate Overdraft Text
            let overdraftHTML = "";
            if (account.overdraftLimit > 0) {
                if (isOverdrawn) {
                    const remainingOD = account.overdraftLimit + account.balance;
                    overdraftHTML = `<div class="od-info">Remaining OD: £${remainingOD}</div>`;
                } else {
                    overdraftHTML = `<div class="od-info">OD Limit: £${account.overdraftLimit}</div>`;
                }
            }

            // 3. Build the tile element
            const tile = document.createElement("div");
            tile.className = "account-tile";
            
            tile.innerHTML = `
                <div class="account-name">${account.name}</div>
                <div class="account-balance ${balanceColorClass}">${balanceText}</div>
                ${overdraftHTML}
            `;

            // 4. Make it clickable!
            tile.addEventListener("click", () => {
                handleTileClick(account.id, account.name);
            });

            accountsContainer.appendChild(tile);
        });
    }

    // 5. Click Handler
    function handleTileClick(accountId, accountName) {
        // For now, this just proves the click is working.
        // Later, we will change this to load the specific account page.
        alert(`Navigating to ${accountName} (ID: ${accountId}). This is where we will load the transaction history!`);
    }
});
