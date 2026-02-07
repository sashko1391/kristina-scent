// Dniprowska Parfumerka — AI Consultant
// Claude API integration через Cloudflare Worker

// ========================================
// CONFIGURATION
// ========================================

// Cloudflare Worker URL
const WORKER_URL = 'https://kristina-scent-api.sashko1391.workers.dev';

// Google Sheets URL
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1T_JIYKlQR54PWPCH028P2TdVLiQOrdacdGY3kH3edjE/export?format=csv&gid=0';

// Fallback JSON (якщо Google Sheets недоступний)
const FALLBACK_JSON_URL = 'products-fallback.json';

// ========================================
// STATE
// ========================================
let conversationHistory = [];
let productsData = [];
let currentOrder = [];

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', async function() {
    await loadProducts();
    initializeChat();
    initializeEventListeners();
});

// ========================================
// LOAD PRODUCTS FROM GOOGLE SHEETS
// ========================================
async function loadProducts() {
    try {
        console.log('Loading products from Google Sheets...');
        
        // Try Google Sheets with timeout
        var controller = new AbortController();
        var timeoutId = setTimeout(function() { controller.abort(); }, 5000);
        
        try {
            var response = await fetch(GOOGLE_SHEET_URL, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error('Google Sheets not available');
            
            var csvText = await response.text();
            productsData = parseCSV(csvText);
            console.log('Products loaded from Google Sheets:', productsData.length);
            
        } catch (sheetsError) {
            console.warn('Google Sheets failed, using fallback:', sheetsError.message);
            
            // Fallback to local JSON
            var fallbackResponse = await fetch(FALLBACK_JSON_URL);
            if (!fallbackResponse.ok) throw new Error('Both sources failed');
            
            var fallbackData = await fallbackResponse.json();
            productsData = fallbackData.products;
            console.log('Products loaded from fallback:', productsData.length);
        }
        
    } catch (error) {
        console.error('Critical error loading products:', error);
        productsData = []; // Empty array as last resort
    }
}

function parseCSV(csv) {
    var lines = csv.split('\n');
    var products = [];
    
    for (var i = 1; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        
        var values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
        if (!values || values.length < 5) continue;
        
        var id = values[0] ? values[0].replace(/"/g, '').trim() : '';
        var name = values[1] ? values[1].replace(/"/g, '').trim() : '';
        var category = values[2] ? values[2].replace(/"/g, '').trim() : '';
        var price = parseInt(values[3] ? values[3].replace(/"/g, '').trim() : '0') || 0;
        var badge = values[6] ? values[6].replace(/"/g, '').trim() : '';
        
        if (id && name && price) {
            products.push({
                id: id,
                name: name,
                category: category,
                price: price,
                badge: badge
            });
        }
    }
    
    return products;
}

// ========================================
// CHAT INITIALIZATION
// ========================================
function initializeChat() {
    var welcomeMessage = 'Вітаю! \uD83D\uDC4B Я — ваш віртуальний консультант у Dniprowska Parfumerka.\n\n' +
        'Я знаю всі ' + productsData.length + ' ароматів нашого магазину та можу допомогти вам:\n' +
        '\u2022 Підібрати парфум за вашими уподобаннями\n' +
        '\u2022 Розповісти про характеристики ароматів\n' +
        '\u2022 Порекомендувати щось особливе\n' +
        '\u2022 Оформити замовлення\n\n' +
        'Що вас цікавить? \uD83C\uDF38';

    addMessage('assistant', welcomeMessage);
}

// ========================================
// EVENT LISTENERS
// ========================================
function initializeEventListeners() {
    var chatForm = document.getElementById('chatForm');
    var chatInput = document.getElementById('chatInput');
    
    chatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var message = chatInput.value.trim();
        if (!message) return;
        
        chatInput.value = '';
        await handleUserMessage(message);
    });
    
    // Quick questions
    document.querySelectorAll('.quick-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
            var question = this.dataset.question;
            await handleUserMessage(question);
        });
    });
}

// ========================================
// MESSAGE HANDLING
// ========================================
async function handleUserMessage(message) {
    // Add user message
    addMessage('user', message);
    
    // Show typing indicator
    showTyping();
    
    // Add to conversation history
    conversationHistory.push({
        role: 'user',
        content: message
    });
    
    try {
        // Call Claude API через Worker
        var response = await callClaudeAPI(message);
        
        // Hide typing indicator
        hideTyping();
        
        // Add assistant response
        addMessage('assistant', response);
        
        // Add to conversation history
        conversationHistory.push({
            role: 'assistant',
            content: response
        });
        
        // Check if user wants to order
        if (detectOrderIntent(message)) {
            var extractedProducts = extractProductsFromConversation();
            if (extractedProducts.length > 0) {
                currentOrder = extractedProducts;
                addOrderButton();
            }
        }
        
    } catch (error) {
        hideTyping();
        addMessage('assistant', 'Вибачте, виникла помилка. Спробуйте ще раз або зв\'яжіться з нами через Telegram: @dniprovska_parfumerka');
        console.error('Error:', error);
    }
}

// ========================================
// CLAUDE API CALL (через Cloudflare Worker)
// ========================================
async function callClaudeAPI(userMessage) {
    var systemPrompt = buildSystemPrompt();
    
    var response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'chat',
            system: systemPrompt,
            messages: conversationHistory
        })
    });
    
    if (!response.ok) {
        var errorData = await response.json().catch(function() { return {}; });
        throw new Error(errorData.error || 'API error: ' + response.status);
    }
    
    var data = await response.json();
    return data.content[0].text;
}

function buildSystemPrompt() {
    var productsInfo = productsData.map(function(p) {
        return '- ' + p.name + ' (' + getCategoryName(p.category) + ', ' + p.price + ' грн)' + (p.badge ? ' [' + p.badge + ']' : '');
    }).join('\n');
    
    return 'Ти — віртуальний консультант парфумерного магазину Dniprowska Parfumerka.\n\n' +
        'ТВОЯ РОЛЬ:\n' +
        '- Допомагаєш клієнтам підібрати парфум\n' +
        '- Консультуєш щодо ароматів, нот, стійкості\n' +
        '- Рекомендуєш товари з нашого асортименту\n' +
        '- Оформлюєш замовлення\n\n' +
        'НАШІ ТОВАРИ:\n' + productsInfo + '\n\n' +
        'КАТЕГОРІЇ:\n' +
        '- Розпив — можливість спробувати аромат у меншому об\'ємі\n' +
        '- Жіноча парфумерія\n' +
        '- Чоловіча парфумерія\n' +
        '- Унісекс\n' +
        '- Нішева парфумерія\n' +
        '- Аромадифузори\n\n' +
        'ПРАВИЛА:\n' +
        '1. Завжди відповідай українською мовою\n' +
        '2. Будь дружнім, теплим та професійним\n' +
        '3. Рекомендуй тільки товари з нашого списку\n' +
        '4. Якщо не знаєш характеристик конкретного аромату — чесно скажи це\n' +
        '5. Коли клієнт хоче замовити — підтверди список і запропонуй оформити\n' +
        '6. Використовуй емоджі для теплоти (але помірно)\n' +
        '7. Пропонуй розпив як спосіб спробувати аромат перед покупкою\n\n' +
        'ІНФОРМАЦІЯ ПРО АРОМАТИ:\n' +
        'Якщо клієнт запитує про конкретні характеристики аромату (ноти, стійкість, сезонність) — використовуй своє знання про парфумерію, але зазначай що це загальна інформація і краще спробувати розпив.\n\n' +
        'ОФОРМЛЕННЯ ЗАМОВЛЕННЯ:\n' +
        'Коли клієнт готовий замовити, запитай:\n' +
        '- Ім\'я\n' +
        '- Телефон\n' +
        '- Місто\n\n' +
        'Формат відповіді про замовлення:\n' +
        '"Чудово! Ось ваше замовлення:\n' +
        '[список товарів]\n' +
        'Загальна сума: [сума] грн\n\n' +
        'Для оформлення напишіть, будь ласка:\n' +
        '- Ваше ім\'я\n' +
        '- Телефон\n' +
        '- Місто доставки"';
}

function getCategoryName(category) {
    var names = {
        'rozpyv': 'Розпив',
        'female': 'Жіноча',
        'male': 'Чоловіча',
        'unisex': 'Унісекс',
        'niche': 'Нішева',
        'aroma': 'Аромадифузор'
    };
    return names[category] || category;
}

// ========================================
// ORDER DETECTION & HANDLING
// ========================================
function detectOrderIntent(message) {
    var orderKeywords = ['замовити', 'замовлення', 'купити', 'хочу', 'візьму', 'оформити'];
    return orderKeywords.some(function(keyword) {
        return message.toLowerCase().indexOf(keyword) !== -1;
    });
}

function extractProductsFromConversation() {
    var mentioned = [];
    var lastMessages = conversationHistory.slice(-4);
    
    lastMessages.forEach(function(msg) {
        productsData.forEach(function(product) {
            if (msg.content.toLowerCase().indexOf(product.name.toLowerCase()) !== -1) {
                if (!mentioned.find(function(p) { return p.id === product.id; })) {
                    mentioned.push(product);
                }
            }
        });
    });
    
    return mentioned;
}

function addOrderButton() {
    var chatMessages = document.getElementById('chatMessages');
    var buttonHtml = '<div class="message assistant">' +
        '<div class="message-avatar">\uD83E\uDD16</div>' +
        '<div class="message-bubble">' +
        '<button class="order-button" onclick="confirmOrder()">' +
        '\uD83D\uDCE6 Оформити замовлення' +
        '</button>' +
        '</div>' +
        '</div>';
    chatMessages.insertAdjacentHTML('beforeend', buttonHtml);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function confirmOrder() {
    if (currentOrder.length === 0) {
        addMessage('assistant', 'Схоже, я не зміг визначити які товари ви хочете замовити. Уточніть, будь ласка!');
        return;
    }
    
    var orderSummary = currentOrder.map(function(p) {
        return '\u2022 ' + p.name + ' — ' + p.price + ' грн';
    }).join('\n');
    var total = currentOrder.reduce(function(sum, p) { return sum + p.price; }, 0);
    
    var message = 'Відмінно! Ваше замовлення:\n\n' + orderSummary + '\n\n\uD83D\uDCB0 Загальна сума: ' + total + ' грн\n\nДля оформлення напишіть:\n1. Ваше ім\'я\n2. Телефон\n3. Місто';
    
    addMessage('assistant', message);
}

// ========================================
// UI FUNCTIONS
// ========================================
function addMessage(role, content) {
    var chatMessages = document.getElementById('chatMessages');
    var time = new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    
    var messageHtml = '<div class="message ' + role + '">' +
        '<div class="message-avatar">' + (role === 'assistant' ? '\uD83E\uDD16' : '\uD83D\uDC64') + '</div>' +
        '<div class="message-bubble">' +
        content.replace(/\n/g, '<br>') +
        '<div class="message-time">' + time + '</div>' +
        '</div>' +
        '</div>';
    
    chatMessages.insertAdjacentHTML('beforeend', messageHtml);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping() {
    document.getElementById('typingIndicator').style.display = 'flex';
    document.getElementById('sendButton').disabled = true;
}

function hideTyping() {
    document.getElementById('typingIndicator').style.display = 'none';
    document.getElementById('sendButton').disabled = false;
}
