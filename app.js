// 1. DATA ENGINE (With Goals)
let data = JSON.parse(localStorage.getItem('financeApp')) || {
    account: [],
    debt: [],
    savings: []
};

let currentMode = '';

// 2. EMOJI ENGINE
const emojis = {
    bank: "🏦", savings: "💰", card: "💳", car: "🚗", 
    holiday: "✈️", house: "🏠", food: "🍔", klarna: "🛍️",
    paypal: "🅿️", loan: "📉", gift: "🎁", default: "✨"
};

function getEmoji(name) {
    name = name.toLowerCase();
    for (let key in emojis) {
        if (name.includes(key)) return emojis[key];
    }
    return emojis.default;
}

// 3. TAB SWITCHING
function switchTab(pageId, btn) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-btn'));
    document.getElementById(pageId).style.display = 'block';
    btn.classList.add('active-btn');
}

// 4. MODAL LOGIC
function openModal(mode) {
    currentMode = mode;
    document.getElementById('modal-title').innerText = "New " + mode;
    // Show/Hide Goal input based on if it's Savings
    document.getElementById('item-goal').style.display = (mode === 'savings') ? 'block' : 'none';
    document.getElementById('input-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('input-modal').style.display = 'none';
    document.querySelectorAll('input').forEach(i => i.value = '');
}

// 5. SAVE & CELEBRATE
function saveItem() {
    const name = document.getElementById('item-name').value;
    const amount = parseFloat(document.getElementById('item-amount').value) || 0;
    const goal = parseFloat(document.getElementById('item-goal').value) || 0;

    if (name) {
        data[currentMode].push({ name, amount, goal });
        localStorage.setItem('financeApp', JSON.stringify(data));
        
        if (currentMode === 'savings') triggerConfetti();
        
        render();
        closeModal();
    }
}

// 6. RENDER EVERYTHING
function render() {
    const lists = {
        account: document.getElementById('accounts-list'),
        debt: document.getElementById('debts-list'),
        savings: document.getElementById('savings-list')
    };

    // Reset lists
    Object.values(lists).forEach(l => l.innerHTML = '');

    let totalAcc = 0, totalDebt = 0, totalSave = 0;

    // Accounts
    data.account.forEach(item => {
        totalAcc += item.amount;
        lists.account.innerHTML += `
            <div class="tile animate-pop">
                <span class="tile-emoji">${getEmoji(item.name)}</span>
                <h4>${item.name}</h4>
                <p>£${item.amount.toLocaleString()}</p>
            </div>`;
    });

    // Debts
    data.debt.forEach(item => {
        totalDebt += item.amount;
        lists.debt.innerHTML += `
            <div class="debt-item animate-pop">
                <div>
                    <span style="font-size:1.2rem">${getEmoji(item.name)}</span>
                    <strong>${item.name}</strong>
                </div>
                <p>£${item.amount.toLocaleString()}</p>
            </div>`;
    });

    // Savings (with Progress Bars)
    data.savings.forEach(item => {
        totalSave += item.amount;
        let percent = item.goal > 0 ? Math.min((item.amount / item.goal) * 100, 100) : 0;
        lists.savings.innerHTML += `
            <div class="tile animate-pop" style="grid-column: span 2;">
                <div style="display:flex; justify-content:space-between">
                    <span>${getEmoji(item.name)} <strong>${item.name}</strong></span>
                    <span>£${item.amount} / £${item.goal}</span>
                </div>
                <div class="progress-container">
                    <div class="progress-fill" style="width: ${percent}%"></div>
                </div>
            </div>`;
    });

    // Totals
    document.getElementById('net-worth-val').innerText = `£${(totalAcc + totalSave - totalDebt).toLocaleString()}`;
}

// 7. FUN STUFF: CONFETTI
function triggerConfetti() {
    const end = Date.now() + 2 * 1000;
    (function frame() {
        console.log("🎉 CONFETTI! 🎉"); // Placeholder for actual effect
        if (Date.now() < end) requestAnimationFrame(frame);
    }());
}

render();
