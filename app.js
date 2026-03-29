// 1. Theme Engine Functions
function applyTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    const meta = document.getElementById('theme-meta'); 
    if(meta) meta.content = isDark ? "#000000" : "#f2f2f7";
    const bL = document.getElementById('btnLight'), bD = document.getElementById('btnDark');
    if (bL && bD) {
        bL.classList.toggle('active', !isDark);
        bD.classList.toggle('active', isDark);
    }
}
window.setThemeMode = (isDark) => { applyTheme(isDark); localStorage.setItem('MyApp_Theme', isDark); };

// 2. Logic Helpers
const ukHolidays2026 = ["2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-28"];
function isOff(d) { return d.getDay() === 0 || d.getDay() === 6 || ukHolidays2026.includes(d.toISOString().split('T')[0]); }
function adjPay(y, m, d) { let dt = new Date(y, m, d); while (isOff(dt)) dt.setDate(dt.getDate() + 1); return dt; }
function adjInc(y, m, d) { let dt = d === 'last' ? new Date(y, m + 1, 0) : new Date(y, m, parseInt(d)); while (isOff(dt)) dt.setDate(dt.getDate() - 1); return dt; }

// 3. Main App Logic
document.addEventListener("DOMContentLoaded", () => {
    applyTheme(localStorage.getItem('MyApp_Theme') === 'true');
    let financialItems = JSON.parse(localStorage.getItem("financialItems")) || [];
    let curId = null; 

    // Date Selects
    ['cardDay', 'loanDay', 'billDay', 'salaryDay', 'editDay'].forEach(id => {
        const sel = document.getElementById(id);
        if (sel && sel.options.length <= 1) { 
            for(let i=1; i<=31; i++) sel.insertAdjacentHTML('beforeend', `<option value="${i}">${i}${([,'st','nd','rd'][i%100>>10!=1&&i%10]||'th')}</option>`);
        }
    });

    // View Management
    const switchView = (v) => {
        document.querySelectorAll('.view').forEach(el => el.classList.toggle('active-view', el.id === `view-${v}`));
        document.querySelectorAll('.tab-item').forEach(el => el.classList.toggle('active', el.id === `nav-${v}`));
        if (['home','cards','loans','bills'].includes(v)) renderAll();
        if (v === 'admin') popDrops();
    };
    document.querySelectorAll('.tab-item').forEach(btn => btn.onclick = () => switchView(btn.id.split('-')[1]));
    window.switchBackToHome = () => { 
        let itm = financialItems.find(i => i.id === curId); curId = null;
        switchView(itm?.type === 'card' ? 'cards' : itm?.type === 'loan' ? 'loans' : 'home');
    };

    // Form Handling
    const groups = { account: 'account-fields', card: 'card-fields', loan: 'loan-fields', bill: 'bill-fields', salary: 'salary-fields' };
    document.querySelectorAll('input[name="itemType"]').forEach(r => r.onchange = (e) => {
        Object.values(groups).forEach(id => document.getElementById(id).style.display = 'none');
        document.getElementById(groups[e.target.value]).style.display = 'block';
    });

    const popDrops = () => {
        const bS = document.getElementById('billAccount'), sS = document.getElementById('salaryAccount'), tF = document.getElementById('txAccount'), tT = document.getElementById('txToAccount');
        const accs = financialItems.filter(i => i.type === 'account'), all = financialItems.filter(i => ['account','card','loan'].includes(i.type));
        [bS, sS, tF, tT].forEach(s => { if(s) s.innerHTML = '<option value="" disabled selected>Select Item</option>'; });
        accs.forEach(a => { bS?.insertAdjacentHTML('beforeend', `<option value="${a.id}">${a.name}</option>`); sS?.insertAdjacentHTML('beforeend', `<option value="${a.id}">${a.name}</option>`); });
        all.forEach(a => { tF?.insertAdjacentHTML('beforeend', `<option value="${a.id}">${a.name}</option>`); tT?.insertAdjacentHTML('beforeend', `<option value="${a.id}">${a.name}</option>`); });
    };

    // Rendering
    const renderAll = () => { renderH(); renderC(); renderL(); renderB(); };
    const renderH = () => {
        const cnt = document.getElementById('home-content'); cnt.innerHTML = "";
        financialItems.filter(i => i.type === 'account').forEach(i => {
            let div = document.createElement('div'); div.className = 'square-tile'; div.onclick = () => openDetails(i.id);
            div.innerHTML = `<div class="top-info"><div class="name">${i.name}</div><div class="sub">${i.accountType || 'Current'}</div></div><div class="item-amount ${i.balance < 0 ? 'text-red' : ''}">£${Math.abs(i.balance).toFixed(2)}</div>`;
            cnt.appendChild(div);
        });
    };
    const renderC = () => {
        const cnt = document.getElementById('cards-content'); cnt.innerHTML = "";
        financialItems.filter(i => i.type === 'card').forEach(i => {
            let div = document.createElement('div'); div.className = 'square-tile'; div.onclick = () => openDetails(i.id);
            div.innerHTML = `<div class="top-info"><div class="name">${i.name}</div><div class="sub">Due: Day ${i.dueDate}</div></div><div class="item-amount ${i.balance < 0 ? 'text-red' : ''}">£${Math.abs(i.balance).toFixed(2)}</div>`;
            cnt.appendChild(div);
        });
    };
    const renderL = () => {
        const cnt = document.getElementById('loans-content'); cnt.innerHTML = "";
        financialItems.filter(i => i.type === 'loan').forEach(i => {
            let div = document.createElement('div'); div.className = 'square-tile'; div.onclick = () => openDetails(i.id);
            div.innerHTML = `<div class="top-info"><div class="name">${i.name}</div><div class="sub">Due: Day ${i.dueDate}</div></div><div class="item-amount ${i.balance < 0 ? 'text-red' : ''}">£${Math.abs(i.balance).toFixed(2)}</div>`;
            cnt.appendChild(div);
        });
    };
    const renderB = () => {
        const cnt = document.getElementById('bills-content'); cnt.innerHTML = "";
        let list = financialItems.filter(i => ['bill','salary'].includes(i.type)).map(i => {
            let dt = i.type === 'bill' ? adjPay(2026, 2, i.dueDate) : adjInc(2026, 2, i.dueDate);
            return { ...i, dt };
        }).sort((a,b) => a.dt - b.dt);
        let grp = document.createElement('div'); grp.className = 'settings-group';
        list.forEach(i => {
            let row = document.createElement('div'); row.className = 'item-tile'; row.onclick = () => openEditModal(i.id);
            row.innerHTML = `<div class="item-info"><div class="name">${i.name}</div><div class="sub">${i.dt.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</div></div><div class="item-amount ${i.type === 'salary' ? 'text-green' : ''}">£${Math.abs(i.balance).toFixed(2)}</div>`;
            grp.appendChild(row);
        });
        cnt.appendChild(grp);
    };

    const openDetails = (id) => {
        curId = id; let i = financialItems.find(x => x.id === id); if(!i) return;
        document.getElementById('detail-account-name').innerText = i.name;
        let bal = document.getElementById('detail-account-balance'); bal.innerText = `£${Math.abs(i.balance).toFixed(2)}`; bal.className = `detail-balance-large ${i.balance < 0 ? 'text-red' : ''}`;
        document.getElementById('transaction-list').innerHTML = (i.transactions || []).slice(0,10).map(t => `<div class="settings-row"><div style="flex:1"><div class="tx-flex"><span>${t.description}</span><span class="${t.amount < 0 ? 'text-red' : 'text-green'}">£${Math.abs(t.amount).toFixed(2)}</span></div><div class="tx-date">${t.date}</div></div></div>`).join('');
        switchView('account-details');
    };

    window.openTransactionModal = () => { document.getElementById('modal-overlay').classList.add('active'); document.getElementById('transaction-modal').classList.add('open'); };
    window.closeAllModals = () => { document.querySelectorAll('.bottom-sheet').forEach(m => m.classList.remove('open')); document.getElementById('modal-overlay').classList.remove('active'); };
    window.openEditModal = (id) => {
        curId = id || curId; let i = financialItems.find(x => x.id === curId); if(!i) return;
        document.getElementById('editName').value = i.name; document.getElementById('editBalance').value = Math.abs(i.balance);
        document.getElementById('edit-date-wrapper').style.display = ['card','loan','bill','salary'].includes(i.type) ? 'block' : 'none';
        if(i.dueDate) document.getElementById('editDay').value = i.dueDate;
        document.getElementById('modal-overlay').classList.add('active'); document.getElementById('edit-modal').classList.add('open');
    };

    // Forms Logic
    document.getElementById('add-item-form').onsubmit = (e) => {
        e.preventDefault(); let t = document.querySelector('input[name="itemType"]:checked').value;
        const emojis = { account: "🏦", card: "💳", loan: "💰", bill: "📑", salary: "💸" };
        let newItem = { id: Date.now().toString(), type: t, name: document.getElementById('itemName').value, balance: parseFloat(document.getElementById('itemAmount').value), emoji: emojis[t], transactions: [] };
        if(t === 'account') { newItem.accountType = document.getElementById('accountType').value; newItem.hasOverdraft = document.getElementById('hasOverdraft').checked; newItem.odLimit = parseFloat(document.getElementById('odLimit').value) || 0; }
        else if(t === 'card') { newItem.creditLimit = parseFloat(document.getElementById('cardLimit').value); newItem.dueDate = document.getElementById('cardDay').value; newItem.balance = -Math.abs(newItem.balance); }
        else if(t === 'loan') { newItem.dueDate = document.getElementById('loanDay').value; newItem.balance = -Math.abs(newItem.balance); }
        else if(t === 'bill') { newItem.dueDate = document.getElementById('billDay').value; newItem.balance = Math.abs(newItem.balance); }
        else if(t === 'salary') { newItem.dueDate = document.getElementById('salaryDay').value; newItem.balance = Math.abs(newItem.balance); }
        financialItems.push(newItem); localStorage.setItem('financialItems', JSON.stringify(financialItems)); e.target.reset(); switchView('home');
    };

    document.getElementById('edit-form').onsubmit = (e) => {
        e.preventDefault(); let idx = financialItems.findIndex(x => x.id === curId);
        if(idx > -1) {
            financialItems[idx].name = document.getElementById('editName').value;
            let nb = parseFloat(document.getElementById('editBalance').value);
            financialItems[idx].balance = ['card','loan'].includes(financialItems[idx].type) ? -Math.abs(nb) : nb;
            if(financialItems[idx].dueDate) financialItems[idx].dueDate = document.getElementById('editDay').value;
            localStorage.setItem('financialItems', JSON.stringify(financialItems)); closeAllModals(); renderAll();
        }
    };

    document.getElementById('delete-btn').onclick = () => { if(confirm("Delete item?")) { financialItems = financialItems.filter(x => x.id !== curId); localStorage.setItem('financialItems', JSON.stringify(financialItems)); closeAllModals(); switchView('home'); } };

    document.getElementById('transaction-form').onsubmit = (e) => {
        e.preventDefault(); let fId = document.getElementById('txAccount').value, type = document.querySelector('input[name="txType"]:checked').value, amt = parseFloat(document.getElementById('txAmount').value), desc = document.getElementById('txDesc').value;
        let fIdx = financialItems.findIndex(x => x.id === fId); if(fIdx === -1) return;
        let realAmt = type === 'in' || type === 'bonus' ? Math.abs(amt) : -Math.abs(amt);
        financialItems[fIdx].balance += realAmt;
        financialItems[fIdx].transactions.unshift({ date: new Date().toLocaleDateString('en-GB'), description: desc, amount: realAmt });
        localStorage.setItem('financialItems', JSON.stringify(financialItems)); closeAllModals(); renderAll();
    };

    renderAll();
});
