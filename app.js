/* General App Reset */
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

body {
    background-color: #f4f4f9;
    color: #333;
    /* Prevents the page from bouncing on mobile */
    overscroll-behavior-y: none; 
}

/* Page Setup */
.page {
    display: none; /* Hides all pages by default */
    padding: 20px;
    padding-bottom: 80px; /* Leaves room for the nav bar */
}

.page.active {
    display: block; /* Only shows the active page */
    animation: fadeIn 0.3s ease;
}

/* Simple Animation */
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Basic Card Style for Home */
.card {
    background: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    margin-bottom: 15px;
    text-align: center;
}

/* Bottom Navigation Bar */
.bottom-nav {
    position: fixed;
    bottom: 0;
    width: 100%;
    background-color: #ffffff;
    display: flex;
    justify-content: space-around;
    padding: 15px 0;
    box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
}

.nav-btn {
    background: none;
    border: none;
    color: #888;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    flex: 1;
}

.nav-btn.active-btn {
    color: #007bff; /* Blue for active tab */
}
