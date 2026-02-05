// Dniprowska Parfumerka â€” AI Consultant
// Claude API integration Ñ‡ÐµÑ€ÐµÐ· Cloudflare Worker

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
    const welcomeMessage = `Ð’Ñ–Ñ‚Ð°ÑŽ! ðŸ‘‹ Ð¯ â€” Ð²Ð°Ñˆ Ð²Ñ–Ñ€Ñ‚ÑƒÐ°Ð»ÑŒÐ½Ð¸Ð¹ ÐºÐ¾Ð½ÑÑƒÐ»ÑŒÑ‚Ð°Ð½Ñ‚ Ñƒ Dniprowska Parfumerka.

Ð¯ Ð·Ð½Ð°ÑŽ Ð²ÑÑ– ${productsData.length} Ð°Ñ€Ð¾Ð¼Ð°Ñ‚Ñ–Ð² Ð½Ð°ÑˆÐ¾Ð³Ð¾ Ð¼Ð°Ð³Ð°Ð·Ð¸Ð½Ñƒ Ñ‚Ð° Ð¼Ð¾Ð¶Ñƒ Ð´Ð¾Ð¿Ð¾Ð¼Ð¾Ð³Ñ‚Ð¸ Ð²Ð°Ð¼:
â€¢ ÐŸÑ–Ð´Ñ–Ð±Ñ€Ð°Ñ‚Ð¸ Ð¿Ð°Ñ€Ñ„ÑƒÐ¼ Ð·Ð° Ð²Ð°ÑˆÐ¸Ð¼Ð¸ ÑƒÐ¿Ð¾Ð´Ð¾Ð±Ð°Ð½Ð½ÑÐ¼Ð¸
â€¢ Ð Ð¾Ð·Ð¿Ð¾Ð²Ñ–ÑÑ‚Ð¸ Ð¿Ñ€Ð¾ Ñ…Ð°Ñ€Ð°ÐºÑ‚ÐµÑ€Ð¸ÑÑ‚Ð¸ÐºÐ¸ Ð°Ñ€Ð¾Ð¼Ð°Ñ‚Ñ–Ð²
â€¢ ÐŸÐ¾Ñ€ÐµÐºÐ¾Ð¼ÐµÐ½Ð´ÑƒÐ²Ð°Ñ‚Ð¸ Ñ‰Ð¾ÑÑŒ Ð¾ÑÐ¾Ð±Ð»Ð¸Ð²Ðµ
â€¢ ÐžÑ„Ð¾Ñ€Ð¼Ð¸Ñ‚Ð¸ Ð·Ð°Ð¼Ð¾Ð²Ð»ÐµÐ½Ð½Ñ

Ð©Ð¾ Ð²Ð°Ñ Ñ†Ñ–ÐºÐ°Ð²Ð¸Ñ‚ÑŒ? ðŸŒ¸`;

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
        // Call Claude API Ñ‡ÐµÑ€ÐµÐ· Worker
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
        addMessage('assistant', 'Ð’Ð¸Ð±Ð°Ñ‡Ñ‚Ðµ, Ð²Ð¸Ð½Ð¸ÐºÐ»Ð° Ð¿Ð¾Ð¼Ð¸Ð»ÐºÐ°. Ð¡Ð¿Ñ€Ð¾Ð±ÑƒÐ¹Ñ‚Ðµ Ñ‰Ðµ Ñ€Ð°Ð· Ð°Ð±Ð¾ Ð·Ð²\'ÑÐ¶Ñ–Ñ‚ÑŒÑÑ Ð· Ð½Ð°Ð¼Ð¸ Ñ‡ÐµÑ€ÐµÐ· Telegram: @dniprovska_parfumerka');
        console.error('Error:', error);
    }
}

// ========================================
// CLAUDE API CALL (Ñ‡ÐµÑ€ÐµÐ· Cloudflare Worker)
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
        `- ${p.name} (${getCategoryName(p.category)}, ${p.price} Ð³Ñ€Ð½)${p.badge ? ' [' + p.badge + ']' : ''}`
    ).join('\n');
    
    return `Ð¢Ð¸ â€” Ð²Ñ–Ñ€Ñ‚ÑƒÐ°Ð»ÑŒÐ½Ð¸Ð¹ ÐºÐ¾Ð½ÑÑƒÐ»ÑŒÑ‚Ð°Ð½Ñ‚ Ð¿Ð°Ñ€Ñ„ÑƒÐ¼ÐµÑ€Ð½Ð¾Ð³Ð¾ Ð¼Ð°Ð³Ð°Ð·Ð¸Ð½Ñƒ Dniprowska Parfumerka.

Ð¢Ð’ÐžÐ¯ Ð ÐžÐ›Ð¬:
- Ð”Ð¾Ð¿Ð¾Ð¼Ð°Ð³Ð°Ñ”Ñˆ ÐºÐ»Ñ–Ñ”Ð½Ñ‚Ð°Ð¼ Ð¿Ñ–Ð´Ñ–Ð±Ñ€Ð°Ñ‚Ð¸ Ð¿Ð°Ñ€Ñ„ÑƒÐ¼
- ÐšÐ¾Ð½ÑÑƒÐ»ÑŒÑ‚ÑƒÑ”Ñˆ Ñ‰Ð¾Ð´Ð¾ Ð°Ñ€Ð¾Ð¼Ð°Ñ‚Ñ–Ð², Ð½Ð¾Ñ‚, ÑÑ‚Ñ–Ð¹ÐºÐ¾ÑÑ‚Ñ–
- Ð ÐµÐºÐ¾Ð¼ÐµÐ½Ð´ÑƒÑ”Ñˆ Ñ‚Ð¾Ð²Ð°Ñ€Ð¸ Ð· Ð½Ð°ÑˆÐ¾Ð³Ð¾ Ð°ÑÐ¾Ñ€Ñ‚Ð¸Ð¼ÐµÐ½Ñ‚Ñƒ
- ÐžÑ„Ð¾Ñ€Ð¼Ð»ÑŽÑ”Ñˆ Ð·Ð°Ð¼Ð¾Ð²Ð»ÐµÐ½Ð½Ñ

ÐÐÐ¨Ð† Ð¢ÐžÐ’ÐÐ Ð˜:
${productsInfo}

ÐšÐÐ¢Ð•Ð“ÐžÐ Ð†Ð‡:
- Ð Ð¾Ð·Ð¿Ð¸Ð² â€” Ð¼Ð¾Ð¶Ð»Ð¸Ð²Ñ–ÑÑ‚ÑŒ ÑÐ¿Ñ€Ð¾Ð±ÑƒÐ²Ð°Ñ‚Ð¸ Ð°Ñ€Ð¾Ð¼Ð°Ñ‚ Ñƒ Ð¼ÐµÐ½ÑˆÐ¾Ð¼Ñƒ Ð¾Ð±'Ñ”Ð¼Ñ–
- Ð–Ñ–Ð½Ð¾Ñ‡Ð° Ð¿Ð°Ñ€Ñ„ÑƒÐ¼ÐµÑ€Ñ–Ñ
- Ð§Ð¾Ð»Ð¾Ð²Ñ–Ñ‡Ð° Ð¿Ð°Ñ€Ñ„ÑƒÐ¼ÐµÑ€Ñ–Ñ  
- Ð£Ð½Ñ–ÑÐµÐºÑ
- ÐÑ–ÑˆÐµÐ²Ð° Ð¿Ð°Ñ€Ñ„ÑƒÐ¼ÐµÑ€Ñ–Ñ
- ÐÑ€Ð¾Ð¼Ð°Ð´Ð¸Ñ„ÑƒÐ·Ð¾Ñ€Ð¸

ÐŸÐ ÐÐ’Ð˜Ð›Ð:
1. Ð—Ð°Ð²Ð¶Ð´Ð¸ Ð²Ñ–Ð´Ð¿Ð¾Ð²Ñ–Ð´Ð°Ð¹ ÑƒÐºÑ€Ð°Ñ—Ð½ÑÑŒÐºÐ¾ÑŽ Ð¼Ð¾Ð²Ð¾ÑŽ
2. Ð‘ÑƒÐ´ÑŒ Ð´Ñ€ÑƒÐ¶Ð½Ñ–Ð¼, Ñ‚ÐµÐ¿Ð»Ð¸Ð¼ Ñ‚Ð° Ð¿Ñ€Ð¾Ñ„ÐµÑÑ–Ð¹Ð½Ð¸Ð¼
3. Ð ÐµÐºÐ¾Ð¼ÐµÐ½Ð´ÑƒÐ¹ Ñ‚Ñ–Ð»ÑŒÐºÐ¸ Ñ‚Ð¾Ð²Ð°Ñ€Ð¸ Ð· Ð½Ð°ÑˆÐ¾Ð³Ð¾ ÑÐ¿Ð¸ÑÐºÑƒ
4. Ð¯ÐºÑ‰Ð¾ Ð½Ðµ Ð·Ð½Ð°Ñ”Ñˆ Ñ…Ð°Ñ€Ð°ÐºÑ‚ÐµÑ€Ð¸ÑÑ‚Ð¸Ðº ÐºÐ¾Ð½ÐºÑ€ÐµÑ‚Ð½Ð¾Ð³Ð¾ Ð°Ñ€Ð¾Ð¼Ð°Ñ‚Ñƒ â€” Ñ‡ÐµÑÐ½Ð¾ ÑÐºÐ°Ð¶Ð¸ Ñ†Ðµ
5. ÐšÐ¾Ð»Ð¸ ÐºÐ»Ñ–Ñ”Ð½Ñ‚ Ñ…Ð¾Ñ‡Ðµ Ð·Ð°Ð¼Ð¾Ð²Ð¸Ñ‚Ð¸ â€” Ð¿Ñ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¸ ÑÐ¿Ð¸ÑÐ¾Ðº Ñ– Ð·Ð°Ð¿Ñ€Ð¾Ð¿Ð¾Ð½ÑƒÐ¹ Ð¾Ñ„Ð¾Ñ€Ð¼Ð¸Ñ‚Ð¸
6. Ð’Ð¸ÐºÐ¾Ñ€Ð¸ÑÑ‚Ð¾Ð²ÑƒÐ¹ ÐµÐ¼Ð¾Ð´Ð·Ñ– Ð´Ð»Ñ Ñ‚ÐµÐ¿Ð»Ð¾Ñ‚Ð¸ (Ð°Ð»Ðµ Ð¿Ð¾Ð¼Ñ–Ñ€Ð½Ð¾)
7. ÐŸÑ€Ð¾Ð¿Ð¾Ð½ÑƒÐ¹ Ñ€Ð¾Ð·Ð¿Ð¸Ð² ÑÐº ÑÐ¿Ð¾ÑÑ–Ð± ÑÐ¿Ñ€Ð¾Ð±ÑƒÐ²Ð°Ñ‚Ð¸ Ð°Ñ€Ð¾Ð¼Ð°Ñ‚ Ð¿ÐµÑ€ÐµÐ´ Ð¿Ð¾ÐºÑƒÐ¿ÐºÐ¾ÑŽ

Ð†ÐÐ¤ÐžÐ ÐœÐÐ¦Ð†Ð¯ ÐŸÐ Ðž ÐÐ ÐžÐœÐÐ¢Ð˜:
Ð¯ÐºÑ‰Ð¾ ÐºÐ»Ñ–Ñ”Ð½Ñ‚ Ð·Ð°Ð¿Ð¸Ñ‚ÑƒÑ” Ð¿Ñ€Ð¾ ÐºÐ¾Ð½ÐºÑ€ÐµÑ‚Ð½Ñ– Ñ…Ð°Ñ€Ð°ÐºÑ‚ÐµÑ€Ð¸ÑÑ‚Ð¸ÐºÐ¸ Ð°Ñ€Ð¾Ð¼Ð°Ñ‚Ñƒ (Ð½Ð¾Ñ‚Ð¸, ÑÑ‚Ñ–Ð¹ÐºÑ–ÑÑ‚ÑŒ, ÑÐµÐ·Ð¾Ð½Ð½Ñ–ÑÑ‚ÑŒ) â€” Ð²Ð¸ÐºÐ¾Ñ€Ð¸ÑÑ‚Ð¾Ð²ÑƒÐ¹ ÑÐ²Ð¾Ñ” Ð·Ð½Ð°Ð½Ð½Ñ Ð¿Ñ€Ð¾ Ð¿Ð°Ñ€Ñ„ÑƒÐ¼ÐµÑ€Ñ–ÑŽ, Ð°Ð»Ðµ Ð·Ð°Ð·Ð½Ð°Ñ‡Ð°Ð¹ Ñ‰Ð¾ Ñ†Ðµ Ð·Ð°Ð³Ð°Ð»ÑŒÐ½Ð° Ñ–Ð½Ñ„Ð¾Ñ€Ð¼Ð°Ñ†Ñ–Ñ Ñ– ÐºÑ€Ð°Ñ‰Ðµ ÑÐ¿Ñ€Ð¾Ð±ÑƒÐ²Ð°Ñ‚Ð¸ Ñ€Ð¾Ð·Ð¿Ð¸Ð².

ÐžÐ¤ÐžÐ ÐœÐ›Ð•ÐÐÐ¯ Ð—ÐÐœÐžÐ’Ð›Ð•ÐÐÐ¯:
ÐšÐ¾Ð»Ð¸ ÐºÐ»Ñ–Ñ”Ð½Ñ‚ Ð³Ð¾Ñ‚Ð¾Ð²Ð¸Ð¹ Ð·Ð°Ð¼Ð¾Ð²Ð¸Ñ‚Ð¸, Ð·Ð°Ð¿Ð¸Ñ‚Ð°Ð¹:
- Ð†Ð¼'Ñ
- Ð¢ÐµÐ»ÐµÑ„Ð¾Ð½  
- ÐœÑ–ÑÑ‚Ð¾

Ð¤Ð¾Ñ€Ð¼Ð°Ñ‚ Ð²Ñ–Ð´Ð¿Ð¾Ð²Ñ–Ð´Ñ– Ð¿Ñ€Ð¾ Ð·Ð°Ð¼Ð¾Ð²Ð»ÐµÐ½Ð½Ñ:
"Ð§ÑƒÐ´Ð¾Ð²Ð¾! ÐžÑÑŒ Ð²Ð°ÑˆÐµ Ð·Ð°Ð¼Ð¾Ð²Ð»ÐµÐ½Ð½Ñ:
[ÑÐ¿Ð¸ÑÐ¾Ðº Ñ‚Ð¾Ð²Ð°Ñ€Ñ–Ð²]
Ð—Ð°Ð³Ð°Ð»ÑŒÐ½Ð° ÑÑƒÐ¼Ð°: [ÑÑƒÐ¼Ð°] Ð³Ñ€Ð½

Ð”Ð»Ñ Ð¾Ñ„Ð¾Ñ€Ð¼Ð»ÐµÐ½Ð½Ñ Ð½Ð°Ð¿Ð¸ÑˆÑ–Ñ‚ÑŒ, Ð±ÑƒÐ´ÑŒ Ð»Ð°ÑÐºÐ°:
- Ð’Ð°ÑˆÐµ Ñ–Ð¼'Ñ
- Ð¢ÐµÐ»ÐµÑ„Ð¾Ð½
- ÐœÑ–ÑÑ‚Ð¾ Ð´Ð¾ÑÑ‚Ð°Ð²ÐºÐ¸"`;
}

function getCategoryName(category) {
    const names = {
        'rozpyv': 'Ð Ð¾Ð·Ð¿Ð¸Ð²',
        'female': 'Ð–Ñ–Ð½Ð¾Ñ‡Ð°',
        'male': 'Ð§Ð¾Ð»Ð¾Ð²Ñ–Ñ‡Ð°',
        'unisex': 'Ð£Ð½Ñ–ÑÐµÐºÑ',
        'niche': 'ÐÑ–ÑˆÐµÐ²Ð°',
        'aroma': 'ÐÑ€Ð¾Ð¼Ð°Ð´Ð¸Ñ„ÑƒÐ·Ð¾Ñ€'
    };
    return names[category] || category;
}

// ========================================
// ORDER DETECTION & HANDLING
// ========================================
function detectOrderIntent(message) {
    const orderKeywords = ['Ð·Ð°Ð¼Ð¾Ð²Ð¸Ñ‚Ð¸', 'Ð·Ð°Ð¼Ð¾Ð²Ð»ÐµÐ½Ð½Ñ', 'ÐºÑƒÐ¿Ð¸Ñ‚Ð¸', 'Ñ…Ð¾Ñ‡Ñƒ', 'Ð²Ñ–Ð·ÑŒÐ¼Ñƒ', 'Ð¾Ñ„Ð¾Ñ€Ð¼Ð¸Ñ‚Ð¸'];
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
            <div class="message-avatar">ðŸ¤–</div>
            <div class="message-bubble">
                <button class="order-button" onclick="confirmOrder()">
                    ðŸ“¦ ÐžÑ„Ð¾Ñ€Ð¼Ð¸Ñ‚Ð¸ Ð·Ð°Ð¼Ð¾Ð²Ð»ÐµÐ½Ð½Ñ
                </button>
            </div>
        </div>
    `;
    chatMessages.insertAdjacentHTML('beforeend', buttonHtml);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function confirmOrder() {
    if (currentOrder.length === 0) {
        addMessage('assistant', 'Ð¡Ñ…Ð¾Ð¶Ðµ, Ñ Ð½Ðµ Ð·Ð¼Ñ–Ð³ Ð²Ð¸Ð·Ð½Ð°Ñ‡Ð¸Ñ‚Ð¸ ÑÐºÑ– Ñ‚Ð¾Ð²Ð°Ñ€Ð¸ Ð²Ð¸ Ñ…Ð¾Ñ‡ÐµÑ‚Ðµ Ð·Ð°Ð¼Ð¾Ð²Ð¸Ñ‚Ð¸. Ð£Ñ‚Ð¾Ñ‡Ð½Ñ–Ñ‚ÑŒ, Ð±ÑƒÐ´ÑŒ Ð»Ð°ÑÐºÐ°!');
        return;
    }
    
    const orderSummary = currentOrder.map(p => `â€¢ ${p.name} â€” ${p.price} Ð³Ñ€Ð½`).join('\n');
    const total = currentOrder.reduce((sum, p) => sum + p.price, 0);
    
    const message = `Ð’Ñ–Ð´Ð¼Ñ–Ð½Ð½Ð¾! Ð’Ð°ÑˆÐµ Ð·Ð°Ð¼Ð¾Ð²Ð»ÐµÐ½Ð½Ñ:\n\n${orderSummary}\n\nðŸ’° Ð—Ð°Ð³Ð°Ð»ÑŒÐ½Ð° ÑÑƒÐ¼Ð°: ${total} Ð³Ñ€Ð½\n\nÐ”Ð»Ñ Ð¾Ñ„Ð¾Ñ€Ð¼Ð»ÐµÐ½Ð½Ñ Ð½Ð°Ð¿Ð¸ÑˆÑ–Ñ‚ÑŒ:\n1. Ð’Ð°ÑˆÐµ Ñ–Ð¼'Ñ\n2. Ð¢ÐµÐ»ÐµÑ„Ð¾Ð½\n3. ÐœÑ–ÑÑ‚Ð¾`;
    
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
            <div class="message-avatar">${role === 'assistant' ? 'ðŸ¤–' : 'ðŸ‘¤'}</div>
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
