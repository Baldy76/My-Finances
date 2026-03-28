// Connect to our HTML elements
const balance = document.getElementById('total-balance');
const money_plus = document.getElementById('total-income');
const money_minus = document.getElementById('total-expense');
const list = document.getElementById('transaction-list');
const form = document.getElementById('transaction-form');
const typeInput = document.getElementById('type');
const textInput = document.getElementById('text');
const amountInput = document.getElementById('amount');
const clearBtn = document.getElementById('clear-all');

// Pull saved transactions from Local Storage (Browser Memory)
// It saves as a JSON string, so we parse it back into a JavaScript array
const localStorageTransactions = JSON.parse(localStorage.getItem('transactions'));

// If there's data, use it. If not, start with an empty array.
let transactions = localStorage.getItem('transactions') !== null ? localStorageTransactions : [];

// Add a new transaction
function addTransaction(e) {
    e.preventDefault();

    const type = typeInput.value;
    let amount = parseFloat(amountInput.value);

    // If it's an expense, make the number negative for the math
    if (type === 'expense') {
        amount = -Math.abs(amount);
    }

    const transaction = {
        id: generateID(),
        text: textInput.value,
        amount: amount,
        date: new Date().toLocaleDateString()
    };

    transactions.push(transaction);

    addTransactionDOM(transaction);
    updateValues();
    updateLocalStorage();

    // Clear the form inputs
    textInput.value = '';
    amountInput.value = '';
}

// Generate random ID for each transaction
function generateID() {
    return Math.floor(Math.random() * 100000000);
}

// Add transactions to DOM list
function addTransactionDOM(transaction) {
    // Determine if it's income or expense to assign the correct CSS class
    const sign = transaction.amount < 0 ? '-' : '+';
    const itemClass = transaction.amount < 0 ? 'minus' : 'plus';

    const li = document.createElement('li');
    li.classList.add(itemClass);

    li.innerHTML = `
        <div>
            <strong>${transaction.text}</strong> <br>
            <small style="color: #777; font-size: 11px;">${transaction.date}</small>
        </div>
        <div>
            <span>${sign}£${Math.abs(transaction.amount).toFixed(2)}</span>
            <button class="delete-btn" onclick="removeTransaction(${transaction.id})">X</button>
        </div>
    `;

    // Add to the top of the list
    list.prepend(li);
}

// Update the balance, income, and expense numbers
function updateValues() {
    const amounts = transactions.map(transaction => transaction.amount);

    const total = amounts.reduce((acc, item) => (acc += item), 0).toFixed(2);

    const income = amounts
        .filter(item => item > 0)
        .reduce((acc, item) => (acc += item), 0)
        .toFixed(2);

    const expense = (
        amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) * -1
    ).toFixed(2);

    balance.innerText = `£${total}`;
    money_plus.innerText = `+£${income}`;
    money_minus.innerText = `-£${expense}`;
}

// Remove transaction by ID
window.removeTransaction = function(id) {
    transactions = transactions.filter(transaction => transaction.id !== id);
    updateLocalStorage();
    init();
}

// Clear all transactions
clearBtn.addEventListener('click', () => {
    if(confirm("Are you sure you want to delete all history?")) {
        transactions = [];
        updateLocalStorage();
        init();
    }
});

// Save data to Local Storage as JSON
function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Start the app
function init() {
    list.innerHTML = '';
    transactions.forEach(addTransactionDOM);
    updateValues();
}

// Listen for form submit
form.addEventListener('submit', addTransaction);

// Run the app when the page loads
init();
