// --- LOGO ENGINE ---
function getLogoUrl(account) {
    // 1. If user provided a manual domain (e.g. halifax.co.uk)
    if (account.domain) return `https://logo.clearbit.com/${account.domain}`;

    // 2. Automatic lookup based on common names
    const name = account.name.toLowerCase();
    if (name.includes('halifax')) return 'https://logo.clearbit.com/halifax.co.uk';
    if (name.includes('barclays')) return 'https://logo.clearbit.com/barclays.co.uk';
    if (name.includes('starling')) return 'https://logo.clearbit.com/starlingbank.com';
    if (name.includes('amex') || name.includes('american express')) return 'https://logo.clearbit.com/americanexpress.com';
    if (name.includes('monzo')) return 'https://logo.clearbit.com/monzo.com';
    if (name.includes('natwest')) return 'https://logo.clearbit.com/natwest.com';
    if (name.includes('amazon')) return 'https://logo.clearbit.com/amazon.co.uk';
    if (name.includes('sky')) return 'https://logo.clearbit.com/sky.com';

    // 3. Fallback: If no logo found, returning null lets us show initials instead
    return null;
}

// --- UPDATED RENDERING LOGIC ---
function renderAccounts() {
    const list = document.getElementById('accounts-list');
    list.innerHTML = '';
    
    accounts.forEach(acc => {
        const logoUrl = getLogoUrl(acc);
        const iconHtml = logoUrl 
            ? `<img src="${logoUrl}" class="w-10 h-10 rounded-xl shadow-sm object-contain bg-white p-1" onerror="this.style.display='none'">`
            : `<div class="w-10 h-10 rounded-xl flex justify-center items-center font-black text-xs text-white" style="background-color: ${acc.color}">${acc.name.substring(0,2).toUpperCase()}</div>`;

        list.innerHTML += `
            <div class="flex justify-between items-center bg-white dark:bg-cardbg p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-transparent">
                <div class="flex items-center gap-4">
                    ${iconHtml}
                    <div>
                        <p class="font-black text-slate-800 dark:text-white">${acc.name}</p>
                        ${acc.balance < 0 ? '<span class="text-[9px] text-red-500 font-bold uppercase">Overdrawn</span>' : ''}
                    </div>
                </div>
                <p class="font-black text-lg ${acc.balance < 0 ? 'text-red-500' : ''}">£${acc.balance.toFixed(2)}</p>
            </div>
        `;
    });
}
