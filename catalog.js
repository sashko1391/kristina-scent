// ==========================================
// Dniprowska Parfumerka - Catalog
// Version 2.5 - Worker Proxy for Google Sheets
// ==========================================

// CONFIG
var WORKER_URL = 'https://kristina-scent-api.sashko1391.workers.dev';
var FALLBACK_JSON_URL = 'products-fallback.json';

// STATE
var allProducts = [];
var cart = [];

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    loadCart();
    updateCartUI();
    loadProducts();
    initializeEventListeners();
    
    var urlParams = new URLSearchParams(window.location.search);
    var categoryParam = urlParams.get('category');
    if (categoryParam) {
        setTimeout(function() {
            var filterBtn = document.querySelector('[data-category="' + categoryParam + '"]');
            if (filterBtn) {
                document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
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
    var loading = document.getElementById('loading');
    var error = document.getElementById('error');
    
    try {
        loading.style.display = 'block';
        error.style.display = 'none';
        
        console.log('Loading products via Worker proxy...');
        
        var controller = new AbortController();
        var timeoutId = setTimeout(function() { controller.abort(); }, 8000);
        
        try {
            // Method 1: Try Worker Proxy
            var response = await fetch(WORKER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'get-products' }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error('Worker proxy failed: ' + response.status);
            
            var data = await response.json();
            
            if (!data.csv) throw new Error('No CSV data from worker');
            
            console.log('✅ CSV loaded via Worker proxy, length:', data.csv.length);
            
            allProducts = parseCSV(data.csv);
            console.log('✅ Products from Worker proxy:', allProducts.length);
            
        } catch (workerError) {
            console.warn('❌ Worker proxy failed, using fallback:', workerError.message);
            
            // Method 2: Fallback to JSON
            var fallbackResponse = await fetch(FALLBACK_JSON_URL);
            if (!fallbackResponse.ok) throw new Error('Both sources failed');
            
            var fallbackData = await fallbackResponse.json();
            allProducts = fallbackData.products;
            
            console.log('⚠️ Products from fallback:', allProducts.length);
            
            showToast('⚠️ Завантажено з резервної копії');
        }
        
        if (allProducts.length === 0) {
            throw new Error('No products found');
        }
        
        loading.style.display = 'none';
        displayProducts(allProducts);
        
    } catch (err) {
        console.error('❌ Error loading products:', err);
        loading.style.display = 'none';
        error.style.display = 'block';
    }
}

// ==========================================
// PARSE CSV - handles empty cells & quoted values
// ==========================================
function parseCSV(csv) {
    var lines = csv.split('\n');
    var products = [];
    
    for (var i = 1; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        
        var values = splitCSVLine(line);
        if (values.length < 5) continue;
        
        var id = (values[0] || '').trim();
        var name = (values[1] || '').trim();
        var category = (values[2] || '').trim().toLowerCase();
        var price = parseInt((values[3] || '0').trim()) || 0;
        var imageUrl = (values[4] || '').trim();
        var directLink = (values[5] || '').trim();
        var badge = (values[6] || '').trim();
        
        // AI Description columns (H=7, I=8, J=9, K=10)
        var aiDesc = (values[7] || '').trim();
        var aiTop = (values[8] || '').trim();
        var aiHeart = (values[9] || '').trim();
        var aiBase = (values[10] || '').trim();
        
        if (!id || !name || !price) continue;
        
        var product = {
            id: id,
            name: name,
            category: category,
            price: price,
            imageUrl: directLink || imageUrl,
            badge: badge,
            aiDescription: null
        };
        
        // Build aiDescription if any AI data exists
        if (aiDesc || aiTop || aiHeart || aiBase) {
            product.aiDescription = {
                description: aiDesc,
                top: aiTop ? aiTop.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [],
                heart: aiHeart ? aiHeart.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [],
                base: aiBase ? aiBase.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : []
            };
        }
        
        products.push(product);
    }
    
    return products;
}

// Proper CSV line splitter: handles empty cells (,,) and quoted values ("a, b")
function splitCSVLine(line) {
    var result = [];
    var current = '';
    var inQuotes = false;
    
    for (var j = 0; j < line.length; j++) {
        var ch = line[j];
        if (ch === '"') {
            if (inQuotes && line[j + 1] === '"') {
                current += '"';
                j++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current);
    return result;
}

// ==========================================
// DISPLAY PRODUCTS
// ==========================================
function displayProducts(products) {
    var catalogGrid = document.getElementById('catalogGrid');
    
    if (products.length === 0) {
        catalogGrid.innerHTML = '<p class="error-state">Товари не знайдено</p>';
        return;
    }
    
    var html = [];
    
    for (var i = 0; i < products.length; i++) {
        var p = products[i];
        
        var hoverHTML = '<div class="hover-simple-content">';
        hoverHTML += '<h3 style="margin:0 0 10px 0;color:#2C2C2C;font-size:16px;font-weight:600;">' + p.name + '</h3>';
        
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
        
        hoverHTML += '<p style="font-size:18px;font-weight:bold;color:#2C2C2C;margin:12px 0 8px 0;"><strong>' + p.price + ' грн</strong></p>';
        hoverHTML += '<button class="add-to-cart-btn" onclick="event.stopPropagation(); addToCart(\'' + p.id + '\')">🛒 Додати в кошик</button>';
        hoverHTML += '</div>';
        
        var card = '<div class="product-card-catalog" data-id="' + p.id + '">';
        
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
        var activeFilter = document.querySelector('.filter-btn.active');
        var category = activeFilter ? activeFilter.dataset.category : 'all';
        filterProducts(category);
        return;
    }
    
    var lowerQuery = query.toLowerCase();
    var filtered = allProducts.filter(function(p) {
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
        var filtered = allProducts.filter(function(p) {
            return p.category === category;
        });
        displayProducts(filtered);
    }
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function initializeEventListeners() {
    var searchInput = document.getElementById('searchInput');
    var searchClear = document.getElementById('searchClear');
    
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            var query = e.target.value.trim();
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
    
    var filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            filterButtons.forEach(function(b) {
                b.classList.remove('active');
            });
            this.classList.add('active');
            filterProducts(this.dataset.category);
        });
    });
    
    var cartBtn = document.querySelector('.cart-button');
    var cartModal = document.getElementById('cartModal');
    var closeCart = document.getElementById('closeCart');
    
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
    try {
        var saved = localStorage.getItem('cart');
        cart = saved ? JSON.parse(saved) : [];
    } catch (e) {
        cart = [];
    }
}

function saveCart() {
    try {
        localStorage.setItem('cart', JSON.stringify(cart));
    } catch (e) {
        console.warn('Could not save cart');
    }
}

function addToCart(productId) {
    var product = allProducts.find(function(p) {
        return p.id === productId;
    });
    
    if (!product) return;
    
    var existingItem = cart.find(function(item) {
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
    var item = cart.find(function(i) {
        return i.id === productId;
    });
    
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
            updateCartUI();
            updateCartModal();
        }
    }
}

function updateCartUI() {
    var cartCount = document.querySelector('.cart-count');
    var totalItems = cart.reduce(function(sum, item) {
        return sum + item.quantity;
    }, 0);
    
    if (cartCount) {
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

function updateCartModal() {
    var cartBody = document.getElementById('cartItems');
    var cartTotal = document.getElementById('cartTotal');
    var checkoutBtn = document.getElementById('checkoutBtn');
    var cartFooter = document.querySelector('.cart-footer');
    
    if (!cartBody || !cartTotal) {
        console.warn('Cart modal elements not found');
        return;
    }
    
    // Show footer again (in case it was hidden by checkout)
    if (cartFooter) cartFooter.style.display = 'block';
    
    if (cart.length === 0) {
        cartBody.innerHTML = '<p class="empty-cart">Кошик порожній</p>';
        cartTotal.textContent = '0 грн';
        if (checkoutBtn) checkoutBtn.style.display = 'none';
        return;
    }
    
    if (checkoutBtn) checkoutBtn.style.display = 'block';
    
    var total = cart.reduce(function(sum, item) {
        return sum + (item.price * item.quantity);
    }, 0);
    
    var itemsHTML = [];
    for (var i = 0; i < cart.length; i++) {
        var item = cart[i];
        
        var html = '<div class="cart-item">';
        html += '<img src="' + item.imageUrl + '" alt="' + item.name + '" class="cart-item-image" onerror="this.style.display=\'none\'">';
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

// ==========================================
// CHECKOUT - Fixed: no form submission, direct JS handling
// ==========================================
function checkout() {
    if (cart.length === 0) {
        showToast('⚠️ Кошик порожній');
        return;
    }
    
    var cartModal = document.getElementById('cartModal');
    var cartItems = document.getElementById('cartItems');
    var cartFooter = document.querySelector('.cart-footer');
    
    if (!cartModal || !cartItems) return;
    
    // Calculate total
    var total = cart.reduce(function(sum, item) {
        return sum + (item.price * item.quantity);
    }, 0);
    
    // Build order summary
    var orderList = '';
    for (var i = 0; i < cart.length; i++) {
        var item = cart[i];
        orderList += '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #FFF0F3;">';
        orderList += '<span>' + item.name + ' x' + item.quantity + '</span>';
        orderList += '<span style="color:#D4AF37;font-weight:600;">' + (item.price * item.quantity) + ' грн</span>';
        orderList += '</div>';
    }
    
    // Show order form — NO <form> tag, using div + onclick instead to avoid 404
    cartItems.innerHTML = '<div style="padding:10px;">' +
        '<h3 style="margin:0 0 15px 0;">Оформлення замовлення</h3>' +
        '<div id="orderFormFields" style="display:flex;flex-direction:column;gap:12px;">' +
        '<div>' +
        '<label style="display:block;margin-bottom:5px;font-weight:600;color:#2C2C2C;">Ім\'я *</label>' +
        '<input type="text" id="orderName" placeholder="Ваше ім\'я" style="width:100%;padding:10px;border:2px solid #FFF0F3;border-radius:8px;font-size:14px;box-sizing:border-box;">' +
        '</div>' +
        '<div>' +
        '<label style="display:block;margin-bottom:5px;font-weight:600;color:#2C2C2C;">Телефон *</label>' +
        '<input type="tel" id="orderPhone" placeholder="099-123-45-67" style="width:100%;padding:10px;border:2px solid #FFF0F3;border-radius:8px;font-size:14px;box-sizing:border-box;">' +
        '</div>' +
        '<div>' +
        '<label style="display:block;margin-bottom:5px;font-weight:600;color:#2C2C2C;">Місто/Адреса *</label>' +
        '<input type="text" id="orderAddress" placeholder="Місто, відділення Нової Пошти" style="width:100%;padding:10px;border:2px solid #FFF0F3;border-radius:8px;font-size:14px;box-sizing:border-box;">' +
        '</div>' +
        '<div>' +
        '<label style="display:block;margin-bottom:5px;font-weight:600;color:#2C2C2C;">Коментар</label>' +
        '<textarea id="orderComment" rows="2" placeholder="Додаткова інформація (опціонально)" style="width:100%;padding:10px;border:2px solid #FFF0F3;border-radius:8px;font-size:14px;resize:vertical;box-sizing:border-box;"></textarea>' +
        '</div>' +
        '<div style="background:#FFF0F3;padding:15px;border-radius:8px;margin-top:10px;">' +
        '<h4 style="margin:0 0 10px 0;color:#2C2C2C;">Ваше замовлення:</h4>' +
        orderList +
        '<div style="display:flex;justify-content:space-between;padding:15px 0 0 0;font-size:18px;font-weight:700;color:#2C2C2C;">' +
        '<span>Всього:</span>' +
        '<span style="color:#D4AF37;">' + total + ' грн</span>' +
        '</div>' +
        '</div>' +
        '<button type="button" id="submitOrderBtn" onclick="submitOrderDirect()" style="width:100%;background:#D4AF37;color:white;border:none;padding:15px;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;margin-top:10px;">📦 Відправити замовлення</button>' +
        '<button type="button" onclick="backToCart()" style="width:100%;background:#f5f5f5;color:#666;border:none;padding:12px;border-radius:8px;font-size:14px;cursor:pointer;">← Назад до кошика</button>' +
        '</div>' +
        '</div>';
    
    // Hide footer
    if (cartFooter) cartFooter.style.display = 'none';
}

function backToCart() {
    updateCartModal();
}

async function submitOrderDirect() {
    var name = document.getElementById('orderName').value.trim();
    var phone = document.getElementById('orderPhone').value.trim();
    var address = document.getElementById('orderAddress').value.trim();
    var comment = document.getElementById('orderComment').value.trim();
    
    // Validate required fields
    if (!name) {
        showToast('⚠️ Введіть ваше ім\'я');
        document.getElementById('orderName').focus();
        return;
    }
    if (!phone) {
        showToast('⚠️ Введіть номер телефону');
        document.getElementById('orderPhone').focus();
        return;
    }
    if (!address) {
        showToast('⚠️ Введіть адресу доставки');
        document.getElementById('orderAddress').focus();
        return;
    }
    
    // Disable submit button
    var submitBtn = document.getElementById('submitOrderBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Відправляємо...';
    }
    
    // Build order message
    var orderText = '🛒 Нове замовлення!\n\n';
    orderText += '👤 Ім\'я: ' + escapeMarkdown(name) + '\n';
    orderText += '📱 Телефон: ' + escapeMarkdown(phone) + '\n';
    orderText += '📍 Адреса: ' + escapeMarkdown(address) + '\n';
    if (comment) {
        orderText += '💬 Коментар: ' + escapeMarkdown(comment) + '\n';
    }
    orderText += '\n📦 Товари:\n';
    
    var total = 0;
    for (var i = 0; i < cart.length; i++) {
        var item = cart[i];
        var itemTotal = item.price * item.quantity;
        total += itemTotal;
        orderText += '• ' + escapeMarkdown(item.name) + ' x' + item.quantity + ' = ' + itemTotal + ' грн\n';
    }
    
    orderText += '\n💰 Всього: ' + total + ' грн';
    
    // Escape Markdown special chars for Telegram
    function escapeMarkdown(text) {
        return text.replace(/([_*`\[\]])/g, '\\$1');
    }
    
    var workerSuccess = false;
    
    try {
        var response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'telegram',
                message: orderText
            })
        });
        
        if (response.ok) {
            var data = await response.json().catch(function() { return {}; });
            // Check if worker actually succeeded (some workers return 200 with error in body)
            if (!data.error) {
                workerSuccess = true;
            }
        }
    } catch (error) {
        console.warn('Worker order failed:', error);
    }
    
    if (workerSuccess) {
        // Worker sent to Telegram successfully
        cart = [];
        saveCart();
        updateCartUI();
        
        var cartModal = document.getElementById('cartModal');
        if (cartModal) cartModal.style.display = 'none';
        
        showToast('✅ Замовлення відправлено! Ми зв\'яжемося з вами найближчим часом.');
    } else {
        // Fallback: open Telegram directly with pre-filled message
        console.log('Worker failed, using Telegram deep link fallback');
        
        var telegramText = '🛒 Замовлення з сайту\n\n';
        telegramText += 'Ім\'я: ' + name + '\n';
        telegramText += 'Телефон: ' + phone + '\n';
        telegramText += 'Адреса: ' + address + '\n';
        if (comment) {
            telegramText += 'Коментар: ' + comment + '\n';
        }
        telegramText += '\nТовари:\n';
        
        for (var j = 0; j < cart.length; j++) {
            var cartItem = cart[j];
            telegramText += '• ' + cartItem.name + ' x' + cartItem.quantity + ' = ' + (cartItem.price * cartItem.quantity) + ' грн\n';
        }
        telegramText += '\nВсього: ' + total + ' грн';
        
        var encodedText = encodeURIComponent(telegramText);
        var telegramUrl = 'https://t.me/dniprovska_parfumerka?text=' + encodedText;
        
        // Clear cart
        cart = [];
        saveCart();
        updateCartUI();
        
        var cartModal = document.getElementById('cartModal');
        if (cartModal) cartModal.style.display = 'none';
        
        // Open Telegram
        window.open(telegramUrl, '_blank');
        
        showToast('✅ Замовлення готове! Відправте повідомлення в Telegram.');
    }
}

// ==========================================
// TOAST
// ==========================================
function showToast(message) {
    var toast = document.getElementById('toast');
    
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#2C2C2C;color:white;padding:12px 24px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10000;opacity:0;transition:opacity 0.3s;max-width:90%;text-align:center;';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.style.opacity = '1';
    
    setTimeout(function() {
        toast.style.opacity = '0';
    }, 3000);
}

console.log('✅ Catalog.js v2.5 loaded - Worker Proxy');
