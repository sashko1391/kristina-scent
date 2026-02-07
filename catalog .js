// ==========================================
// Dniprowska Parfumerka - Catalog
// Version 2.3 - Clean & Working
// ==========================================

// CONFIG
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1T_JIYKlQR54PWPCH028P2TdVLiQOrdacdGY3kH3edjE/export?format=csv&gid=0';
const FALLBACK_JSON_URL = 'products-fallback.json';
const WORKER_URL = 'https://kristina-scent-api.sashko1391.workers.dev';

// STATE
let allProducts = [];
let cart = [];

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    loadCart();
    updateCartUI();
    loadProducts();
    initializeEventListeners();
    
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam) {
        setTimeout(() => {
            const filterBtn = document.querySelector('[data-category="' + categoryParam + '"]');
            if (filterBtn) {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                filterBtn.classList.add('active');
                filterProducts(categoryParam);
            }
        }, 500);
    }
});

// ==========================================
// LOAD PRODUCTS
// ==========================================
async function loadProducts() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    
    try {
        loading.style.display = 'block';
        error.style.display = 'none';
        
        console.log('Loading products...');
        
        // Load AI descriptions first
        let aiDescriptions = {};
        try {
            const descResponse = await fetch('ai-descriptions.json');
            if (descResponse.ok) {
                const descData = await descResponse.json();
                aiDescriptions = descData.descriptions;
                console.log('AI descriptions loaded:', Object.keys(aiDescriptions).length);
            }
        } catch (descError) {
            console.warn('Could not load AI descriptions:', descError.message);
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        try {
            const response = await fetch(GOOGLE_SHEET_URL, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error('Sheets not OK');
            
            const csvText = await response.text();
            console.log('CSV loaded, length:', csvText.length);
            
            allProducts = parseCSV(csvText);
            
            // Merge AI descriptions with products
            allProducts = allProducts.map(function(p) {
                if (aiDescriptions[p.id]) {
                    p.aiDescription = aiDescriptions[p.id];
                }
                return p;
            });
            
            console.log('Products from Sheets:', allProducts.length);
            
        } catch (sheetsError) {
            console.warn('Google Sheets failed, using fallback:', sheetsError.message);
            
            const fallbackResponse = await fetch(FALLBACK_JSON_URL);
            if (!fallbackResponse.ok) throw new Error('Both sources failed');
            
            const fallbackData = await fallbackResponse.json();
            allProducts = fallbackData.products;
            
            // Merge AI descriptions with fallback products too
            allProducts = allProducts.map(function(p) {
                if (aiDescriptions[p.id]) {
                    p.aiDescription = aiDescriptions[p.id];
                }
                return p;
            });
            
            console.log('Products from fallback:', allProducts.length);
            
            showToast('⚠️ Завантажено з резервної копії');
        }
        
        if (allProducts.length === 0) {
            throw new Error('No products found');
        }
        
        loading.style.display = 'none';
        displayProducts(allProducts);
        
    } catch (err) {
        console.error('Error loading products:', err);
        loading.style.display = 'none';
        error.style.display = 'block';
    }
}

// ==========================================
// PARSE CSV
// ==========================================
function parseCSV(csv) {
    const lines = csv.split('\n');
    const products = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
        if (!values || values.length < 5) continue;
        
        const id = values[0] ? values[0].replace(/"/g, '').trim() : '';
        const name = values[1] ? values[1].replace(/"/g, '').trim() : '';
        const category = values[2] ? values[2].replace(/"/g, '').trim().toLowerCase() : '';
        const price = parseInt(values[3] ? values[3].replace(/"/g, '').trim() : '0') || 0;
        const imageUrl = values[4] ? values[4].replace(/"/g, '').trim() : '';
        const directLink = values[5] ? values[5].replace(/"/g, '').trim() : '';
        const badge = values[6] ? values[6].replace(/"/g, '').trim() : '';
        // Column H (aiDescription) is now loaded from separate JSON file
        
        if (!id || !name || !price) continue;
        
        products.push({
            id: id,
            name: name,
            category: category,
            price: price,
            imageUrl: directLink || imageUrl,
            badge: badge,
            aiDescription: null // Will be merged from ai-descriptions.json
        });
    }
    
    return products;
}

// ==========================================
// DISPLAY PRODUCTS
// ==========================================
function displayProducts(products) {
    const catalogGrid = document.getElementById('catalogGrid');
    
    if (products.length === 0) {
        catalogGrid.innerHTML = '<p class="error-state">Товари не знайдено</p>';
        return;
    }
    
    const html = [];
    
    for (let i = 0; i < products.length; i++) {
        const p = products[i];
        
        // Simple hover content - always works
        let hoverHTML = '<div class="hover-simple-content">';
        hoverHTML += '<h3 style="margin:0 0 10px 0;color:#2C2C2C;font-size:16px;font-weight:600;">' + p.name + '</h3>';
        
        // Try to show AI description if available
        if (p.aiDescription && p.aiDescription.description) {
            hoverHTML += '<p style="font-size:14px;color:#666;line-height:1.5;margin-bottom:12px;">' + p.aiDescription.description + '</p>';
            
            if (p.aiDescription.top && p.aiDescription.top.length > 0) {
                hoverHTML += '<div style="font-size:13px;margin-bottom:6px;">';
                hoverHTML += '<strong style="color:#D4AF37;">⬆️ Верх:</strong> ';
                hoverHTML += '<span style="color:#666;">' + p.aiDescription.top.join(', ') + '</span>';
                hoverHTML += '</div>';
            }
            
            if (p.aiDescription.heart && p.aiDescription.heart.length > 0) {
                hoverHTML += '<div style="font-size:13px;margin-bottom:6px;">';
                hoverHTML += '<strong style="color:#D4AF37;">💖 Серце:</strong> ';
                hoverHTML += '<span style="color:#666;">' + p.aiDescription.heart.join(', ') + '</span>';
                hoverHTML += '</div>';
            }
            
            if (p.aiDescription.base && p.aiDescription.base.length > 0) {
                hoverHTML += '<div style="font-size:13px;margin-bottom:12px;">';
                hoverHTML += '<strong style="color:#D4AF37;">⬇️ База:</strong> ';
                hoverHTML += '<span style="color:#666;">' + p.aiDescription.base.join(', ') + '</span>';
                hoverHTML += '</div>';
            }
        }
        
        // Price and button always visible
        hoverHTML += '<p style="font-size:18px;font-weight:bold;color:#2C2C2C;margin:12px 0 8px 0;"><strong>' + p.price + ' грн</strong></p>';
        hoverHTML += '<button class="add-to-cart-btn" onclick="addToCart(\'' + p.id + '\')">🛒 Додати в кошик</button>';
        hoverHTML += '</div>';
        
        let card = '<div class="product-card-catalog" data-id="' + p.id + '">';
        
        if (p.badge) {
            card += '<div class="product-badge">' + p.badge + '</div>';
        }
        
        card += '<div class="product-image-wrapper">';
        card += '<img src="' + p.imageUrl + '" alt="' + p.name + '" onerror="this.style.display=\'none\'" onload="this.style.opacity=\'1\';" style="opacity:0; transition: opacity 0.3s;">';
        card += '<div class="product-hover-info">';
        card += hoverHTML;
        card += '</div></div>';
        
        card += '<div class="product-card-info">';
        card += '<h3 class="product-card-name">' + p.name + '</h3>';
        card += '<p class="product-card-price">' + p.price + ' грн</p>';
        card += '</div></div>';
        
        html.push(card);
    }
    
    catalogGrid.innerHTML = html.join('');
    
    console.log('✅ Displayed', products.length, 'products with hover');
}

// ==========================================
// SEARCH
// ==========================================
function searchProducts(query) {
    if (!query) {
        const activeFilter = document.querySelector('.filter-btn.active');
        const category = activeFilter ? activeFilter.dataset.category : 'all';
        filterProducts(category);
        return;
    }
    
    const lowerQuery = query.toLowerCase();
    const filtered = allProducts.filter(function(p) {
        return p.name.toLowerCase().indexOf(lowerQuery) !== -1;
    });
    
    displayProducts(filtered);
}

// ==========================================
// FILTERS
// ==========================================
function filterProducts(category) {
    if (category === 'all') {
        displayProducts(allProducts);
    } else {
        const filtered = allProducts.filter(function(p) {
            return p.category === category;
        });
        displayProducts(filtered);
    }
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function initializeEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const query = e.target.value.trim();
            if (searchClear) {
                searchClear.style.display = query ? 'block' : 'none';
            }
            searchProducts(query);
        });
    }
    
    if (searchClear) {
        searchClear.addEventListener('click', function() {
            searchInput.value = '';
            searchClear.style.display = 'none';
            searchProducts('');
        });
    }
    
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            filterButtons.forEach(function(b) {
                b.classList.remove('active');
            });
            this.classList.add('active');
            filterProducts(this.dataset.category);
        });
    });
    
    const cartBtn = document.querySelector('.cart-button');
    const cartModal = document.getElementById('cartModal');
    const closeCart = document.getElementById('closeCart');
    
    if (cartBtn && cartModal) {
        cartBtn.addEventListener('click', function() {
            updateCartModal();
            cartModal.style.display = 'flex';
        });
    }
    
    if (closeCart && cartModal) {
        closeCart.addEventListener('click', function() {
            cartModal.style.display = 'none';
        });
    }
    
    if (cartModal) {
        window.addEventListener('click', function(e) {
            if (e.target === cartModal) {
                cartModal.style.display = 'none';
            }
        });
    }
}

// ==========================================
// CART
// ==========================================
function loadCart() {
    const saved = localStorage.getItem('cart');
    cart = saved ? JSON.parse(saved) : [];
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function addToCart(productId) {
    const product = allProducts.find(function(p) {
        return p.id === productId;
    });
    
    if (!product) return;
    
    const existingItem = cart.find(function(item) {
        return item.id === productId;
    });
    
    if (existingItem) {
        existingItem.quantity++;
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
    updateCartUI();
    showToast('✅ ' + product.name + ' додано в кошик');
}

function removeFromCart(productId) {
    cart = cart.filter(function(item) {
        return item.id !== productId;
    });
    saveCart();
    updateCartUI();
    updateCartModal();
}

function updateQuantity(productId, change) {
    const item = cart.find(function(i) {
        return i.id === productId;
    });
    
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
            updateCartModal();
        }
    }
}

function updateCartUI() {
    const cartCount = document.querySelector('.cart-count');
    const totalItems = cart.reduce(function(sum, item) {
        return sum + item.quantity;
    }, 0);
    
    if (cartCount) {
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

function updateCartModal() {
    const cartBody = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    // If modal elements don't exist, skip update
    if (!cartBody || !cartTotal) {
        console.warn('Cart modal elements not found');
        return;
    }
    
    if (cart.length === 0) {
        cartBody.innerHTML = '<p class="empty-cart">Кошик порожній</p>';
        cartTotal.textContent = '0 грн';
        if (checkoutBtn) checkoutBtn.style.display = 'none';
        return;
    }
    
    if (checkoutBtn) checkoutBtn.style.display = 'block';
    
    const total = cart.reduce(function(sum, item) {
        return sum + (item.price * item.quantity);
    }, 0);
    
    const itemsHTML = [];
    for (let i = 0; i < cart.length; i++) {
        const item = cart[i];
        
        let html = '<div class="cart-item">';
        html += '<img src="' + item.imageUrl + '" alt="' + item.name + '" class="cart-item-image" onerror="this.src=\'images/products/placeholder.jpg\'">';
        html += '<div class="cart-item-details">';
        html += '<div class="cart-item-name">' + item.name + '</div>';
        html += '<div class="cart-item-price">' + item.price + ' грн</div>';
        html += '<div class="cart-item-controls">';
        html += '<button class="qty-btn" onclick="updateQuantity(\'' + item.id + '\', -1)">−</button>';
        html += '<span class="cart-item-qty">' + item.quantity + '</span>';
        html += '<button class="qty-btn" onclick="updateQuantity(\'' + item.id + '\', 1)">+</button>';
        html += '<button class="remove-item-btn" onclick="removeFromCart(\'' + item.id + '\')">Видалити</button>';
        html += '</div></div></div>';
        
        itemsHTML.push(html);
    }
    
    cartBody.innerHTML = itemsHTML.join('');
    cartTotal.textContent = total + ' грн';
}

function checkout() {
    if (cart.length === 0) {
        showToast('⚠️ Кошик порожній');
        return;
    }
    
    // Show order form in modal
    const cartModal = document.getElementById('cartModal');
    const cartItems = document.getElementById('cartItems');
    const cartFooter = document.querySelector('.cart-footer');
    
    if (!cartModal || !cartItems) return;
    
    // Calculate total
    const total = cart.reduce(function(sum, item) {
        return sum + (item.price * item.quantity);
    }, 0);
    
    // Build order summary
    let orderList = '';
    for (let i = 0; i < cart.length; i++) {
        const item = cart[i];
        orderList += '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #FFF0F3;">';
        orderList += '<span>' + item.name + ' x' + item.quantity + '</span>';
        orderList += '<span style="color:#D4AF37;font-weight:600;">' + (item.price * item.quantity) + ' грн</span>';
        orderList += '</div>';
    }
    
    // Show order form
    cartItems.innerHTML = '<div style="padding:10px;">' +
        '<h3 style="margin:0 0 15px 0;">Оформлення замовлення</h3>' +
        '<form id="orderFormQuick" style="display:flex;flex-direction:column;gap:12px;">' +
        '<div>' +
        '<label style="display:block;margin-bottom:5px;font-weight:600;color:#2C2C2C;">Ім\'я *</label>' +
        '<input type="text" id="orderName" required placeholder="Ваше ім\'я" style="width:100%;padding:10px;border:2px solid #FFF0F3;border-radius:8px;font-size:14px;">' +
        '</div>' +
        '<div>' +
        '<label style="display:block;margin-bottom:5px;font-weight:600;color:#2C2C2C;">Телефон *</label>' +
        '<input type="tel" id="orderPhone" required placeholder="099-123-45-67" style="width:100%;padding:10px;border:2px solid #FFF0F3;border-radius:8px;font-size:14px;">' +
        '</div>' +
        '<div>' +
        '<label style="display:block;margin-bottom:5px;font-weight:600;color:#2C2C2C;">Місто/Адреса *</label>' +
        '<input type="text" id="orderAddress" required placeholder="Місто, відділення Нової Пошти" style="width:100%;padding:10px;border:2px solid #FFF0F3;border-radius:8px;font-size:14px;">' +
        '</div>' +
        '<div>' +
        '<label style="display:block;margin-bottom:5px;font-weight:600;color:#2C2C2C;">Коментар</label>' +
        '<textarea id="orderComment" rows="2" placeholder="Додаткова інформація (опціонально)" style="width:100%;padding:10px;border:2px solid #FFF0F3;border-radius:8px;font-size:14px;resize:vertical;"></textarea>' +
        '</div>' +
        '<div style="background:#FFF0F3;padding:15px;border-radius:8px;margin-top:10px;">' +
        '<h4 style="margin:0 0 10px 0;color:#2C2C2C;">Ваше замовлення:</h4>' +
        orderList +
        '<div style="display:flex;justify-content:space-between;padding:15px 0 0 0;font-size:18px;font-weight:700;color:#2C2C2C;">' +
        '<span>Всього:</span>' +
        '<span style="color:#D4AF37;">' + total + ' грн</span>' +
        '</div>' +
        '</div>' +
        '<button type="submit" style="width:100%;background:#D4AF37;color:white;border:none;padding:15px;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;margin-top:10px;">📦 Відправити замовлення</button>' +
        '<button type="button" onclick="backToCart()" style="width:100%;background:#f5f5f5;color:#666;border:none;padding:12px;border-radius:8px;font-size:14px;cursor:pointer;">← Назад до кошика</button>' +
        '</form>' +
        '</div>';
    
    // Hide footer
    if (cartFooter) cartFooter.style.display = 'none';
    
    // Add form submit handler
    setTimeout(function() {
        const form = document.getElementById('orderFormQuick');
        if (form) {
            form.addEventListener('submit', submitOrderDirect);
        }
    }, 100);
}

function backToCart() {
    updateCartModal();
    const cartFooter = document.querySelector('.cart-footer');
    if (cartFooter) cartFooter.style.display = 'block';
}

async function submitOrderDirect(e) {
    e.preventDefault();
    
    const name = document.getElementById('orderName').value;
    const phone = document.getElementById('orderPhone').value;
    const address = document.getElementById('orderAddress').value;
    const comment = document.getElementById('orderComment').value;
    
    // Build order message
    let orderText = '🛒 Нове замовлення!\n\n';
    orderText += '👤 Ім\'я: ' + name + '\n';
    orderText += '📱 Телефон: ' + phone + '\n';
    orderText += '📍 Адреса: ' + address + '\n';
    if (comment) {
        orderText += '💬 Коментар: ' + comment + '\n';
    }
    orderText += '\n📦 Товари:\n';
    
    let total = 0;
    for (let i = 0; i < cart.length; i++) {
        const item = cart[i];
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        orderText += '• ' + item.name + ' x' + item.quantity + ' = ' + itemTotal + ' грн\n';
    }
    
    orderText += '\n💰 Всього: ' + total + ' грн';
    
    try {
        // Send to Telegram via Worker
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'order',
                message: orderText
            })
        });
        
        if (response.ok) {
            // Success!
            cart = [];
            saveCart();
            updateCartUI();
            
            // Close modal
            const cartModal = document.getElementById('cartModal');
            if (cartModal) cartModal.style.display = 'none';
            
            // Show success message
            showToast('✅ Замовлення відправлено! Ми зв\'яжемось з вами найближчим часом.');
            
        } else {
            throw new Error('Server error');
        }
        
    } catch (error) {
        console.error('Order error:', error);
        showToast('❌ Помилка відправки. Спробуйте ще раз або зателефонуйте нам.');
    }
}

// ==========================================
// TOAST
// ==========================================
function showToast(message) {
    let toast = document.getElementById('toast');
    
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#2C2C2C;color:white;padding:12px 24px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10000;opacity:0;transition:opacity 0.3s;';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.style.opacity = '1';
    
    setTimeout(function() {
        toast.style.opacity = '0';
    }, 3000);
}

console.log('✅ Catalog.js v2.3 loaded');
