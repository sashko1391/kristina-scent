// Dniprowska Parfumerka â€” Catalog JavaScript
// Google Sheets integration, Cart, Orders

// ========================================
// CONFIGURATION
// ========================================

// Google Sheets Published CSV URL
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1T_JIYKlQR54PWPCH028P2TdVLiQOrdacdGY3kH3edjE/export?format=csv&gid=0';

// Cloudflare Worker URL
const WORKER_URL = 'https://kristina-scent-api.sashko1391.workers.dev';

// ========================================
// STATE
// ========================================
let allProducts = [];
let cart = [];

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    loadCart();
    updateCartUI();
    loadProducts();
    initializeEventListeners();
    
    // Handle URL parameters for category filtering
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam) {
        // Wait for products to load, then filter
        setTimeout(() => {
            const filterBtn = document.querySelector(`[data-category="${categoryParam}"]`);
            if (filterBtn) {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                filterBtn.classList.add('active');
                filterProducts(categoryParam);
            }
        }, 500);
    }
});

// ========================================
// GOOGLE SHEETS DATA LOADING
// ========================================
async function loadProducts() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const catalogGrid = document.getElementById('catalogGrid');
    
    try {
        loading.style.display = 'block';
        error.style.display = 'none';
        
        console.log('Loading products from:', GOOGLE_SHEET_URL);
        const response = await fetch(GOOGLE_SHEET_URL);
        const csvText = await response.text();
        
        console.log('CSV loaded, length:', csvText.length);
        allProducts = parseCSV(csvText);
        
        console.log('Products parsed:', allProducts.length);
        console.log('First product example:', allProducts[0]);
        
        loading.style.display = 'none';
        displayProducts(allProducts);
        
    } catch (err) {
        console.error('Error loading products:', err);
        loading.style.display = 'none';
        error.style.display = 'block';
    }
}

function parseCSV(csv) {
    const lines = csv.split('\n');
    const products = [];
    
    // Skip header row (index 0)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Parse CSV line (handle commas in quotes)
        const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
        if (!values || values.length < 5) continue;
        
        const id = values[0]?.replace(/"/g, '').trim();
        const name = values[1]?.replace(/"/g, '').trim();
        const category = values[2]?.replace(/"/g, '').trim().toLowerCase();
        const price = parseInt(values[3]?.replace(/"/g, '').trim()) || 0;
        const imageUrl = values[4]?.replace(/"/g, '').trim();
        const directLink = values[5]?.replace(/"/g, '').trim();
        const badge = values[6]?.replace(/"/g, '').trim();
        
        if (id && name && price) {
            const finalImageUrl = directLink || imageUrl;
            
            products.push({
                id,
                name,
                category,
                price,
                imageUrl: finalImageUrl,
                badge
            });
        }
    }
    
    return products;
}

// ========================================
// PRODUCT DISPLAY
// ========================================
function displayProducts(products) {
    const catalogGrid = document.getElementById('catalogGrid');
    
    if (products.length === 0) {
        catalogGrid.innerHTML = '<p class="error-state">Ð¢Ð¾Ð²Ð°Ñ€Ð¸ Ð½Ðµ Ð·Ð½Ð°Ð¹Ð´ÐµÐ½Ð¾</p>';
        return;
    }
    
    catalogGrid.innerHTML = products.map(product => `
        <div class="product-card-catalog" data-id="${product.id}">
            ${product.badge ? `<div class="product-badge">${product.badge}</div>` : ''}
            <div class="product-image-wrapper">
                <img src="${product.imageUrl}" 
                     alt="${product.name}" 
                     onerror="this.style.display='none'; this.parentElement.style.background='var(--color-pink-light)'; this.parentElement.innerHTML='<div style=\'display:flex;align-items:center;justify-content:center;height:100%;color:var(--color-text-light);font-size:3rem;\'>ðŸ“¦</div>';"
                     onload="this.style.opacity='1';"
                     style="opacity:0; transition: opacity 0.3s;">
                <div class="product-hover-info">
                    <p class="product-info-text">${product.name}</p>
                    <p class="product-info-text"><strong>${product.price} Ð³Ñ€Ð½</strong></p>
                    <button class="add-to-cart-btn" onclick="addToCart('${product.id}')">
                        ðŸ›’ Ð”Ð¾Ð´Ð°Ñ‚Ð¸ Ð² ÐºÐ¾ÑˆÐ¸Ðº
                    </button>
                </div>
            </div>
            <div class="product-card-info">
                <h3 class="product-card-name">${product.name}</h3>
                <p class="product-card-price">${product.price} Ð³Ñ€Ð½</p>
            </div>
        </div>
    `).join('');
}

// ========================================
// FILTERS
// ========================================
function initializeEventListeners() {
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const category = this.dataset.category;
            filterProducts(category);
        });
    });
    
    // Cart button
    const cartButton = document.getElementById('cartButton');
    const cartModal = document.getElementById('cartModal');
    const cartClose = document.getElementById('cartClose');
    
    cartButton.addEventListener('click', () => {
        cartModal.classList.add('active');
        renderCart();
    });
    
    cartClose.addEventListener('click', () => {
        cartModal.classList.remove('active');
    });
    
    cartModal.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            cartModal.classList.remove('active');
        }
    });
    
    // Checkout button
    const checkoutButton = document.getElementById('checkoutButton');
    checkoutButton.addEventListener('click', openOrderModal);
    
    // Order modal
    const orderModal = document.getElementById('orderModal');
    const orderClose = document.getElementById('orderClose');
    const orderForm = document.getElementById('orderForm');
    
    orderClose.addEventListener('click', () => {
        orderModal.classList.remove('active');
    });
    
    orderModal.addEventListener('click', (e) => {
        if (e.target === orderModal) {
            orderModal.classList.remove('active');
        }
    });
    
    orderForm.addEventListener('submit', handleOrderSubmit);
}

function filterProducts(category) {
    if (category === 'all') {
        displayProducts(allProducts);
    } else {
        const filtered = allProducts.filter(p => p.category === category);
        displayProducts(filtered);
    }
}

// ========================================
// CART FUNCTIONALITY
// ========================================
function loadCart() {
    const saved = localStorage.getItem('kristina_cart');
    if (saved) {
        cart = JSON.parse(saved);
    }
}

function saveCart() {
    localStorage.setItem('kristina_cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
}

function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl,
            quantity: 1
        });
    }
    
    saveCart();
    showToast('âœ“ Ð”Ð¾Ð´Ð°Ð½Ð¾ Ð² ÐºÐ¾ÑˆÐ¸Ðº');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    renderCart();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;
    
    item.quantity += change;
    
    if (item.quantity <= 0) {
        removeFromCart(productId);
    } else {
        saveCart();
        renderCart();
    }
}

function renderCart() {
    const cartBody = document.getElementById('cartBody');
    const cartTotal = document.getElementById('cartTotal');
    
    if (cart.length === 0) {
        cartBody.innerHTML = '<div class="cart-empty">ÐšÐ¾ÑˆÐ¸Ðº Ð¿Ð¾Ñ€Ð¾Ð¶Ð½Ñ–Ð¹</div>';
        cartTotal.textContent = '0 Ð³Ñ€Ð½';
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    cartBody.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-image" onerror="this.src='images/products/placeholder.jpg'">
            <div class="cart-item-details">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${item.price} Ð³Ñ€Ð½</div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)">âˆ’</button>
                    <span class="cart-item-qty">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                    <button class="remove-item-btn" onclick="removeFromCart('${item.id}')">Ð’Ð¸Ð´Ð°Ð»Ð¸Ñ‚Ð¸</button>
                </div>
            </div>
        </div>
    `).join('');
    
    cartTotal.textContent = `${total} Ð³Ñ€Ð½`;
}

// ========================================
// ORDER PROCESSING
// ========================================
function openOrderModal() {
    if (cart.length === 0) {
        showToast('âš ï¸ ÐšÐ¾ÑˆÐ¸Ðº Ð¿Ð¾Ñ€Ð¾Ð¶Ð½Ñ–Ð¹');
        return;
    }
    
    const orderModal = document.getElementById('orderModal');
    const orderSummary = document.getElementById('orderSummary');
    const orderTotal = document.getElementById('orderTotal');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    orderSummary.innerHTML = cart.map(item => `
        <div class="order-item">
            <span>${item.name} Ã— ${item.quantity}</span>
            <span>${item.price * item.quantity} Ð³Ñ€Ð½</span>
        </div>
    `).join('');
    
    orderTotal.textContent = `${total} Ð³Ñ€Ð½`;
    
    // Close cart modal, open order modal
    document.getElementById('cartModal').classList.remove('active');
    orderModal.classList.add('active');
}

async function handleOrderSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const city = document.getElementById('customerCity').value.trim();
    const comment = document.getElementById('customerComment').value.trim();
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Build order message
    let message = `ðŸ› *ÐÐ¾Ð²Ðµ Ð·Ð°Ð¼Ð¾Ð²Ð»ÐµÐ½Ð½Ñ!*\n\n`;
    message += `ðŸ‘¤ *ÐšÐ»Ñ–Ñ”Ð½Ñ‚:* ${name}\n`;
    message += `ðŸ“ž *Ð¢ÐµÐ»ÐµÑ„Ð¾Ð½:* ${phone}\n`;
    message += `ðŸ™ *ÐœÑ–ÑÑ‚Ð¾:* ${city}\n\n`;
    message += `*Ð¢Ð¾Ð²Ð°Ñ€Ð¸:*\n`;
    
    cart.forEach(item => {
        message += `â€¢ ${item.name} Ã— ${item.quantity} = ${item.price * item.quantity} Ð³Ñ€Ð½\n`;
    });
    
    message += `\nðŸ’° *Ð—Ð°Ð³Ð°Ð»ÑŒÐ½Ð° ÑÑƒÐ¼Ð°:* ${total} Ð³Ñ€Ð½\n`;
    
    if (comment) {
        message += `\nðŸ’¬ *ÐšÐ¾Ð¼ÐµÐ½Ñ‚Ð°Ñ€:* ${comment}`;
    }
    
    // Send to Telegram Ñ‡ÐµÑ€ÐµÐ· Worker
    const success = await sendToTelegram(message);
    
    if (success) {
        showToast('âœ“ Ð—Ð°Ð¼Ð¾Ð²Ð»ÐµÐ½Ð½Ñ Ð²Ñ–Ð´Ð¿Ñ€Ð°Ð²Ð»ÐµÐ½Ð¾!');
        
        // Clear cart
        cart = [];
        saveCart();
        
        // Close modal
        document.getElementById('orderModal').classList.remove('active');
        
        // Reset form
        document.getElementById('orderForm').reset();
        
        // Show success message
        setTimeout(() => {
            alert('Ð”ÑÐºÑƒÑ”Ð¼Ð¾ Ð·Ð° Ð·Ð°Ð¼Ð¾Ð²Ð»ÐµÐ½Ð½Ñ! ÐœÐ¸ Ð·Ð²\'ÑÐ¶ÐµÐ¼Ð¾ÑÑ Ð· Ð²Ð°Ð¼Ð¸ Ð½Ð°Ð¹Ð±Ð»Ð¸Ð¶Ñ‡Ð¸Ð¼ Ñ‡Ð°ÑÐ¾Ð¼.');
        }, 300);
    } else {
        showToast('âš ï¸ ÐŸÐ¾Ð¼Ð¸Ð»ÐºÐ° Ð²Ñ–Ð´Ð¿Ñ€Ð°Ð²ÐºÐ¸. Ð¡Ð¿Ñ€Ð¾Ð±ÑƒÐ¹Ñ‚Ðµ Ñ‰Ðµ Ñ€Ð°Ð· Ð°Ð±Ð¾ Ð·Ð²\'ÑÐ¶Ñ–Ñ‚ÑŒÑÑ Ñ‡ÐµÑ€ÐµÐ· Telegram.');
    }
}

async function sendToTelegram(message) {
    try {
        console.log('Sending order to Telegram via Worker...');
        console.log('Worker URL:', WORKER_URL);
        console.log('Message length:', message.length);
        
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'telegram',
                message: message
            })
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Worker response error:', errorText);
            throw new Error(`Worker error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Telegram response:', data);
        
        if (data.ok === false) {
            console.error('Telegram API error:', data.error);
            throw new Error(data.error || 'Telegram API error');
        }
        
        return data.ok === true;
    } catch (error) {
        console.error('Telegram error:', error);
        alert(`ÐŸÐ¾Ð¼Ð¸Ð»ÐºÐ° Ð²Ñ–Ð´Ð¿Ñ€Ð°Ð²ÐºÐ¸: ${error.message}\n\nÐŸÐµÑ€ÐµÐ²Ñ–Ñ€Ñ‚Ðµ:\n1. Worker Ð·Ð°Ð´ÐµÐ¿Ð»Ð¾Ñ”Ð½Ð¸Ð¹?\n2. TELEGRAM_BOT_TOKEN Ð¿Ñ€Ð°Ð²Ð¸Ð»ÑŒÐ½Ð¸Ð¹?\n3. TELEGRAM_CHAT_ID Ð¿Ñ€Ð°Ð²Ð¸Ð»ÑŒÐ½Ð¸Ð¹?\n4. ÐÐ°Ð¿Ð¸ÑÐ°Ð»Ð¸ Ð±Ð¾Ñ‚Ñƒ Ñ…Ð¾Ñ‡ Ð¾Ð´Ð½Ðµ Ð¿Ð¾Ð²Ñ–Ð´Ð¾Ð¼Ð»ÐµÐ½Ð½Ñ?`);
        return false;
    }
}

// ========================================
// UI HELPERS
// ========================================
function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #2C2C2C;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        z-index: 100000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);
