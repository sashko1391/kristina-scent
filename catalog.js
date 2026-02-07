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
            console.log('Products from Sheets:', allProducts.length);
            
        } catch (sheetsError) {
            console.warn('Google Sheets failed, using fallback:', sheetsError.message);
            
            const fallbackResponse = await fetch(FALLBACK_JSON_URL);
            if (!fallbackResponse.ok) throw new Error('Both sources failed');
            
            const fallbackData = await fallbackResponse.json();
            allProducts = fallbackData.products;
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
        const aiDescRaw = values[7] ? values[7].replace(/"/g, '').trim() : '';
        
        if (!id || !name || !price) continue;
        
        let aiDescription = null;
        if (aiDescRaw) {
            try {
                aiDescription = JSON.parse(aiDescRaw);
            } catch (e) {
                console.warn('Failed to parse AI description for:', name);
            }
        }
        
        products.push({
            id: id,
            name: name,
            category: category,
            price: price,
            imageUrl: directLink || imageUrl,
            badge: badge,
            aiDescription: aiDescription
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
        hoverHTML += '<h3 style="margin:0 0 15px 0;color:#2C2C2C;font-size:18px;">' + p.name + '</h3>';
        
        // Try to show AI description if available
        if (p.aiDescription && p.aiDescription.description) {
            hoverHTML += '<p style="font-size:14px;color:#666;line-height:1.6;margin-bottom:15px;">' + p.aiDescription.description + '</p>';
            
            if (p.aiDescription.top && p.aiDescription.top.length > 0) {
                hoverHTML += '<div style="font-size:13px;margin-bottom:8px;">';
                hoverHTML += '<strong style="color:#D4AF37;">⬆️ Верх:</strong> ';
                hoverHTML += '<span style="color:#666;">' + p.aiDescription.top.join(', ') + '</span>';
                hoverHTML += '</div>';
            }
            
            if (p.aiDescription.heart && p.aiDescription.heart.length > 0) {
                hoverHTML += '<div style="font-size:13px;margin-bottom:8px;">';
                hoverHTML += '<strong style="color:#D4AF37;">💖 Серце:</strong> ';
                hoverHTML += '<span style="color:#666;">' + p.aiDescription.heart.join(', ') + '</span>';
                hoverHTML += '</div>';
            }
            
            if (p.aiDescription.base && p.aiDescription.base.length > 0) {
                hoverHTML += '<div style="font-size:13px;margin-bottom:15px;">';
                hoverHTML += '<strong style="color:#D4AF37;">⬇️ База:</strong> ';
                hoverHTML += '<span style="color:#666;">' + p.aiDescription.base.join(', ') + '</span>';
                hoverHTML += '</div>';
            }
        }
        
        hoverHTML += '<p style="font-size:16px;font-weight:bold;color:#2C2C2C;margin:15px 0;"><strong>' + p.price + ' грн</strong></p>';
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
    
    if (cartBtn) {
        cartBtn.addEventListener('click', function() {
            updateCartModal();
            cartModal.style.display = 'flex';
        });
    }
    
    if (closeCart) {
        closeCart.addEventListener('click', function() {
            cartModal.style.display = 'none';
        });
    }
    
    window.addEventListener('click', function(e) {
        if (e.target === cartModal) {
            cartModal.style.display = 'none';
        }
    });
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
    window.location.href = 'order.html';
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
