// KRISTINA | SCENT — AI Consultant
// Claude API integration через Cloudflare Worker

// ========================================
// CONFIGURATION
// ========================================

// Cloudflare Worker URL
const WORKER_URL = 'https://kristina-scent-api.sashko1391.workers.dev';

// Google Sheets URL
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1T_JIYKlQR54PWPCH028P2TdVLiQOrdacdGY3kH3edjE/export?format=csv&gid=0';

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
        const response = await fetch(GOOGLE_SHEET_URL);
        const csvText = await response.text();
        productsData = parseCSV(csvText);
        console.log('Products loaded:', productsData.length);
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function parseCSV(csv) {
    const lines = csv.split('\n');
    const products = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
        if (!values || values.length < 5) continue;
        
        const id = values[0]?.replace(/"/g, '').trim();
        const name = values[1]?.replace(/"/g, '').trim();
        const category = values[2]?.replace(/"/g, '').trim();
        const price = parseInt(values[3]?.replace(/"/g, '').trim()) || 0;
        const badge = values[6]?.replace(/"/g, '').trim();
        
        if (id && name && price) {
            products.push({
                id,
                name,
                category,
                price,
                badge
            });
        }
    }
    
    return products;
}

// ========================================
// CHAT INITIALIZATION
// ========================================
function initializeChat() {
    const welcomeMessage = `Вітаю! 👋 Я — ваш віртуальний консультант у KRISTINA | SCENT.

Я знаю всі ${productsData.length} ароматів нашого магазину та можу допомогти вам:
• Підібрати парфум за вашими уподобаннями
• Розповісти про характеристики ароматів
• Порекомендувати щось особливе
• Оформити замовлення

Що вас цікавить? 🌸`;

    addMessage('assistant', welcomeMessage);
}

// ========================================
// EVENT LISTENERS
// ========================================
function initializeEventListeners() {
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    
    chatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (!message) return;
        
        chatInput.value = '';
        await handleUserMessage(message);
    });
    
    // Quick questions
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const question = this.dataset.question;
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
        const response = await callClaudeAPI(message);
        
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
            const extractedProducts = extractProductsFromConversation();
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
    const systemPrompt = buildSystemPrompt();
    
    const response = await fetch(WORKER_URL, {
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.content[0].text;
}

function buildSystemPrompt() {
    const productsInfo = productsData.map(p => 
        `- ${p.name} (${getCategoryName(p.category)}, ${p.price} грн)${p.badge ? ' [' + p.badge + ']' : ''}`
    ).join('\n');
    
    return `Ти — віртуальний консультант парфумерного магазину KRISTINA | SCENT.

ТВОЯ РОЛЬ:
- Допомагаєш клієнтам підібрати парфум
- Консультуєш щодо ароматів, нот, стійкості
- Рекомендуєш товари з нашого асортименту
- Оформлюєш замовлення

НАШІ ТОВАРИ:
${productsInfo}

КАТЕГОРІЇ:
- Розпив — можливість спробувати аромат у меншому об'ємі
- Жіноча парфумерія
- Чоловіча парфумерія  
- Унісекс
- Нішева парфумерія
- Аромадифузори

ПРАВИЛА:
1. Завжди відповідай українською мовою
2. Будь дружнім, теплим та професійним
3. Рекомендуй тільки товари з нашого списку
4. Якщо не знаєш характеристик конкретного аромату — чесно скажи це
5. Коли клієнт хоче замовити — підтверди список і запропонуй оформити
6. Використовуй емодзі для теплоти (але помірно)
7. Пропонуй розпив як спосіб спробувати аромат перед покупкою

ІНФОРМАЦІЯ ПРО АРОМАТИ:
Якщо клієнт запитує про конкретні характеристики аромату (ноти, стійкість, сезонність) — використовуй своє знання про парфумерію, але зазначай що це загальна інформація і краще спробувати розпив.

ОФОРМЛЕННЯ ЗАМОВЛЕННЯ:
Коли клієнт готовий замовити, запитай:
- Ім'я
- Телефон  
- Місто

Формат відповіді про замовлення:
"Чудово! Ось ваше замовлення:
[список товарів]
Загальна сума: [сума] грн

Для оформлення напишіть, будь ласка:
- Ваше ім'я
- Телефон
- Місто доставки"`;
}

function getCategoryName(category) {
    const names = {
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
    const orderKeywords = ['замовити', 'замовлення', 'купити', 'хочу', 'візьму', 'оформити'];
    return orderKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

function extractProductsFromConversation() {
    const mentioned = [];
    const lastMessages = conversationHistory.slice(-4);
    
    lastMessages.forEach(msg => {
        productsData.forEach(product => {
            if (msg.content.toLowerCase().includes(product.name.toLowerCase())) {
                if (!mentioned.find(p => p.id === product.id)) {
                    mentioned.push(product);
                }
            }
        });
    });
    
    return mentioned;
}

function addOrderButton() {
    const chatMessages = document.getElementById('chatMessages');
    const buttonHtml = `
        <div class="message assistant">
            <div class="message-avatar">🤖</div>
            <div class="message-bubble">
                <button class="order-button" onclick="confirmOrder()">
                    📦 Оформити замовлення
                </button>
            </div>
        </div>
    `;
    chatMessages.insertAdjacentHTML('beforeend', buttonHtml);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function confirmOrder() {
    if (currentOrder.length === 0) {
        addMessage('assistant', 'Схоже, я не зміг визначити які товари ви хочете замовити. Уточніть, будь ласка!');
        return;
    }
    
    const orderSummary = currentOrder.map(p => `• ${p.name} — ${p.price} грн`).join('\n');
    const total = currentOrder.reduce((sum, p) => sum + p.price, 0);
    
    const message = `Відмінно! Ваше замовлення:\n\n${orderSummary}\n\n💰 Загальна сума: ${total} грн\n\nДля оформлення напишіть:\n1. Ваше ім'я\n2. Телефон\n3. Місто`;
    
    addMessage('assistant', message);
}

// ========================================
// UI FUNCTIONS
// ========================================
function addMessage(role, content) {
    const chatMessages = document.getElementById('chatMessages');
    const time = new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    
    const messageHtml = `
        <div class="message ${role}">
            <div class="message-avatar">${role === 'assistant' ? '🤖' : '👤'}</div>
            <div class="message-bubble">
                ${content.replace(/\n/g, '<br>')}
                <div class="message-time">${time}</div>
            </div>
        </div>
    `;
    
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
