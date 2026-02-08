// ==========================================
// Dniprowska Parfumerka — AI Consultant
// Version 2.5 — Claude API via Cloudflare Worker
// ==========================================

// ========================================
// CONFIGURATION
// ========================================
var WORKER_URL = 'https://kristina-scent-api.sashko1391.workers.dev';

var GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1T_JIYKlQR54PWPCH028P2TdVLiQOrdacdGY3kH3edjE/export?format=csv&gid=0';

var FALLBACK_JSON_URL = 'products-fallback.json';

// ========================================
// STATE
// ========================================
var conversationHistory = [];
var productsData = [];
var currentOrder = [];

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

        var controller = new AbortController();
        var timeoutId = setTimeout(function() { controller.abort(); }, 5000);

        try {
            var response = await fetch(GOOGLE_SHEET_URL, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error('Google Sheets not available');

            var csvText = await response.text();
            console.log('CSV loaded successfully, length:', csvText.length);
            productsData = parseCSV(csvText);
            console.log('Products parsed from Google Sheets:', productsData.length);

        } catch (sheetsError) {
            console.warn('Google Sheets failed, trying fallback JSON:', sheetsError.message);

            var fallbackResponse = await fetch(FALLBACK_JSON_URL);
            if (!fallbackResponse.ok) throw new Error('Both sources failed');

            var fallbackData = await fallbackResponse.json();
            productsData = fallbackData.products;
            console.log('Products loaded from fallback JSON:', productsData.length);
        }

    } catch (error) {
        console.error('Critical error loading products:', error);
        productsData = [];
    }
}

// ========================================
// CSV PARSER (handles empty cells & quotes)
// ========================================
function splitCSVLine(line) {
    var result = [];
    var current = '';
    var inQuotes = false;

    for (var i = 0; i < line.length; i++) {
        var ch = line[i];

        if (inQuotes) {
            if (ch === '"') {
                if (i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                result.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
    }
    result.push(current.trim());
    return result;
}

function parseCSV(csv) {
    var lines = csv.split('\n');
    var products = [];

    for (var i = 1; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;

        var values = splitCSVLine(line);
        if (values.length < 5) continue;

        var id = values[0] || '';
        var name = values[1] || '';
        var category = values[2] || '';
        var price = parseInt(values[3] || '0') || 0;
        var badge = values[6] || '';

        // AI descriptions from columns H-K (indices 7-10)
        var description = values[7] || '';
        var topNotes = values[8] || '';
        var heartNotes = values[9] || '';
        var baseNotes = values[10] || '';

        if (id && name && price) {
            products.push({
                id: id,
                name: name,
                category: category,
                price: price,
                badge: badge,
                description: description,
                topNotes: topNotes,
                heartNotes: heartNotes,
                baseNotes: baseNotes
            });
        }
    }

    return products;
}

// ========================================
// CHAT INITIALIZATION
// ========================================
function initializeChat() {
    var welcomeMessage = '\u0412\u0456\u0442\u0430\u044e! \uD83D\uDC4B \u042f \u2014 \u0432\u0430\u0448 \u0432\u0456\u0440\u0442\u0443\u0430\u043b\u044c\u043d\u0438\u0439 \u043a\u043e\u043d\u0441\u0443\u043b\u044c\u0442\u0430\u043d\u0442 \u0443 Dniprowska Parfumerka.\n\n' +
        '\u042f \u0437\u043d\u0430\u044e \u0432\u0441\u0456 ' + productsData.length + ' \u0430\u0440\u043e\u043c\u0430\u0442\u0456\u0432 \u043d\u0430\u0448\u043e\u0433\u043e \u043c\u0430\u0433\u0430\u0437\u0438\u043d\u0443 \u0442\u0430 \u043c\u043e\u0436\u0443 \u0434\u043e\u043f\u043e\u043c\u043e\u0433\u0442\u0438 \u0432\u0430\u043c:\n' +
        '\u2022 \u041f\u0456\u0434\u0456\u0431\u0440\u0430\u0442\u0438 \u043f\u0430\u0440\u0444\u0443\u043c \u0437\u0430 \u0432\u0430\u0448\u0438\u043c\u0438 \u0443\u043f\u043e\u0434\u043e\u0431\u0430\u043d\u043d\u044f\u043c\u0438\n' +
        '\u2022 \u0420\u043e\u0437\u043f\u043e\u0432\u0456\u0441\u0442\u0438 \u043f\u0440\u043e \u0445\u0430\u0440\u0430\u043a\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043a\u0438 \u0430\u0440\u043e\u043c\u0430\u0442\u0456\u0432\n' +
        '\u2022 \u041f\u043e\u0440\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0443\u0432\u0430\u0442\u0438 \u0449\u043e\u0441\u044c \u043e\u0441\u043e\u0431\u043b\u0438\u0432\u0435\n' +
        '\u2022 \u041e\u0444\u043e\u0440\u043c\u0438\u0442\u0438 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f\n\n' +
        '\u0429\u043e \u0432\u0430\u0441 \u0446\u0456\u043a\u0430\u0432\u0438\u0442\u044c? \uD83C\uDF38';

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
    addMessage('user', message);
    showTyping();

    conversationHistory.push({
        role: 'user',
        content: message
    });

    try {
        var response = await callClaudeAPI(message);
        hideTyping();
        addMessage('assistant', response);

        conversationHistory.push({
            role: 'assistant',
            content: response
        });

        if (detectOrderIntent(message)) {
            var extractedProducts = extractProductsFromConversation();
            if (extractedProducts.length > 0) {
                currentOrder = extractedProducts;
                addOrderButton();
            }
        }

    } catch (error) {
        hideTyping();
        addMessage('assistant', '\u0412\u0438\u0431\u0430\u0447\u0442\u0435, \u0432\u0438\u043d\u0438\u043a\u043b\u0430 \u043f\u043e\u043c\u0438\u043b\u043a\u0430. \u0421\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437 \u0430\u0431\u043e \u0437\u0432\'\u044f\u0436\u0456\u0442\u044c\u0441\u044f \u0437 \u043d\u0430\u043c\u0438 \u0447\u0435\u0440\u0435\u0437 Telegram: @dniprovska_parfumerka');
        console.error('Error:', error);
    }
}

// ========================================
// CLAUDE API CALL (via Cloudflare Worker)
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
        var line = '- ' + p.name + ' (' + getCategoryName(p.category) + ', ' + p.price + ' \u0433\u0440\u043d)';
        if (p.badge) line += ' [' + p.badge + ']';
        if (p.description) line += '\n  \u041e\u043f\u0438\u0441: ' + p.description;
        if (p.topNotes) line += '\n  \u0412\u0435\u0440\u0445\u043d\u0456 \u043d\u043e\u0442\u0438: ' + p.topNotes;
        if (p.heartNotes) line += '\n  \u0421\u0435\u0440\u0446\u0435\u0432\u0456 \u043d\u043e\u0442\u0438: ' + p.heartNotes;
        if (p.baseNotes) line += '\n  \u0411\u0430\u0437\u043e\u0432\u0456 \u043d\u043e\u0442\u0438: ' + p.baseNotes;
        return line;
    }).join('\n');

    return '\u0422\u0438 \u2014 \u0432\u0456\u0440\u0442\u0443\u0430\u043b\u044c\u043d\u0438\u0439 \u043a\u043e\u043d\u0441\u0443\u043b\u044c\u0442\u0430\u043d\u0442 \u043f\u0430\u0440\u0444\u0443\u043c\u0435\u0440\u043d\u043e\u0433\u043e \u043c\u0430\u0433\u0430\u0437\u0438\u043d\u0443 Dniprowska Parfumerka.\n\n' +
        '\u0422\u0412\u041e\u042f \u0420\u041e\u041b\u042c:\n' +
        '- \u0414\u043e\u043f\u043e\u043c\u0430\u0433\u0430\u0454\u0448 \u043a\u043b\u0456\u0454\u043d\u0442\u0430\u043c \u043f\u0456\u0434\u0456\u0431\u0440\u0430\u0442\u0438 \u043f\u0430\u0440\u0444\u0443\u043c\n' +
        '- \u041a\u043e\u043d\u0441\u0443\u043b\u044c\u0442\u0443\u0454\u0448 \u0449\u043e\u0434\u043e \u0430\u0440\u043e\u043c\u0430\u0442\u0456\u0432, \u043d\u043e\u0442, \u0441\u0442\u0456\u0439\u043a\u043e\u0441\u0442\u0456\n' +
        '- \u0420\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0443\u0454\u0448 \u0442\u043e\u0432\u0430\u0440\u0438 \u0437 \u043d\u0430\u0448\u043e\u0433\u043e \u0430\u0441\u043e\u0440\u0442\u0438\u043c\u0435\u043d\u0442\u0443\n' +
        '- \u041e\u0444\u043e\u0440\u043c\u043b\u044e\u0454\u0448 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f\n\n' +
        '\u041d\u0410\u0428\u0406 \u0422\u041e\u0412\u0410\u0420\u0418:\n' + productsInfo + '\n\n' +
        '\u041a\u0410\u0422\u0415\u0413\u041e\u0420\u0406\u0407:\n' +
        '- \u0420\u043e\u0437\u043f\u0438\u0432 \u2014 \u043c\u043e\u0436\u043b\u0438\u0432\u0456\u0441\u0442\u044c \u0441\u043f\u0440\u043e\u0431\u0443\u0432\u0430\u0442\u0438 \u0430\u0440\u043e\u043c\u0430\u0442 \u0443 \u043c\u0435\u043d\u0448\u043e\u043c\u0443 \u043e\u0431\'\u0454\u043c\u0456\n' +
        '- \u0416\u0456\u043d\u043e\u0447\u0430 \u043f\u0430\u0440\u0444\u0443\u043c\u0435\u0440\u0456\u044f\n' +
        '- \u0427\u043e\u043b\u043e\u0432\u0456\u0447\u0430 \u043f\u0430\u0440\u0444\u0443\u043c\u0435\u0440\u0456\u044f\n' +
        '- \u0423\u043d\u0456\u0441\u0435\u043a\u0441\n' +
        '- \u041d\u0456\u0448\u0435\u0432\u0430 \u043f\u0430\u0440\u0444\u0443\u043c\u0435\u0440\u0456\u044f\n' +
        '- \u0410\u0440\u043e\u043c\u0430\u0434\u0438\u0444\u0443\u0437\u043e\u0440\u0438\n\n' +
        '\u041f\u0420\u0410\u0412\u0418\u041b\u0410:\n' +
        '1. \u0417\u0430\u0432\u0436\u0434\u0438 \u0432\u0456\u0434\u043f\u043e\u0432\u0456\u0434\u0430\u0439 \u0443\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u043e\u044e \u043c\u043e\u0432\u043e\u044e\n' +
        '2. \u0411\u0443\u0434\u044c \u0434\u0440\u0443\u0436\u043d\u0456\u043c, \u0442\u0435\u043f\u043b\u0438\u043c \u0442\u0430 \u043f\u0440\u043e\u0444\u0435\u0441\u0456\u0439\u043d\u0438\u043c\n' +
        '3. \u0420\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0443\u0439 \u0442\u0456\u043b\u044c\u043a\u0438 \u0442\u043e\u0432\u0430\u0440\u0438 \u0437 \u043d\u0430\u0448\u043e\u0433\u043e \u0441\u043f\u0438\u0441\u043a\u0443\n' +
        '4. \u042f\u043a\u0449\u043e \u043d\u0435 \u0437\u043d\u0430\u0454\u0448 \u0445\u0430\u0440\u0430\u043a\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043a \u043a\u043e\u043d\u043a\u0440\u0435\u0442\u043d\u043e\u0433\u043e \u0430\u0440\u043e\u043c\u0430\u0442\u0443 \u2014 \u0447\u0435\u0441\u043d\u043e \u0441\u043a\u0430\u0436\u0438 \u0446\u0435\n' +
        '5. \u041a\u043e\u043b\u0438 \u043a\u043b\u0456\u0454\u043d\u0442 \u0445\u043e\u0447\u0435 \u0437\u0430\u043c\u043e\u0432\u0438\u0442\u0438 \u2014 \u043f\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0438 \u0441\u043f\u0438\u0441\u043e\u043a \u0456 \u0437\u0430\u043f\u0440\u043e\u043f\u043e\u043d\u0443\u0439 \u043e\u0444\u043e\u0440\u043c\u0438\u0442\u0438\n' +
        '6. \u0412\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u043e\u0432\u0443\u0439 \u0435\u043c\u043e\u0434\u0436\u0456 \u0434\u043b\u044f \u0442\u0435\u043f\u043b\u043e\u0442\u0438 (\u0430\u043b\u0435 \u043f\u043e\u043c\u0456\u0440\u043d\u043e)\n' +
        '7. \u041f\u0440\u043e\u043f\u043e\u043d\u0443\u0439 \u0440\u043e\u0437\u043f\u0438\u0432 \u044f\u043a \u0441\u043f\u043e\u0441\u0456\u0431 \u0441\u043f\u0440\u043e\u0431\u0443\u0432\u0430\u0442\u0438 \u0430\u0440\u043e\u043c\u0430\u0442 \u043f\u0435\u0440\u0435\u0434 \u043f\u043e\u043a\u0443\u043f\u043a\u043e\u044e\n\n' +
        '\u0406\u041d\u0424\u041e\u0420\u041c\u0410\u0426\u0406\u042f \u041f\u0420\u041e \u0410\u0420\u041e\u041c\u0410\u0422\u0418:\n' +
        '\u042f\u043a\u0449\u043e \u043a\u043b\u0456\u0454\u043d\u0442 \u0437\u0430\u043f\u0438\u0442\u0443\u0454 \u043f\u0440\u043e \u043a\u043e\u043d\u043a\u0440\u0435\u0442\u043d\u0456 \u0445\u0430\u0440\u0430\u043a\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043a\u0438 \u0430\u0440\u043e\u043c\u0430\u0442\u0443 (\u043d\u043e\u0442\u0438, \u0441\u0442\u0456\u0439\u043a\u0456\u0441\u0442\u044c, \u0441\u0435\u0437\u043e\u043d\u043d\u0456\u0441\u0442\u044c) \u2014 \u0432\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u043e\u0432\u0443\u0439 \u0441\u0432\u043e\u0454 \u0437\u043d\u0430\u043d\u043d\u044f \u043f\u0440\u043e \u043f\u0430\u0440\u0444\u0443\u043c\u0435\u0440\u0456\u044e, \u0430\u043b\u0435 \u0437\u0430\u0437\u043d\u0430\u0447\u0430\u0439 \u0449\u043e \u0446\u0435 \u0437\u0430\u0433\u0430\u043b\u044c\u043d\u0430 \u0456\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0456\u044f \u0456 \u043a\u0440\u0430\u0449\u0435 \u0441\u043f\u0440\u043e\u0431\u0443\u0432\u0430\u0442\u0438 \u0440\u043e\u0437\u043f\u0438\u0432.\n\n' +
        '\u041e\u0424\u041e\u0420\u041c\u041b\u0415\u041d\u041d\u042f \u0417\u0410\u041c\u041e\u0412\u041b\u0415\u041d\u041d\u042f:\n' +
        '\u041a\u043e\u043b\u0438 \u043a\u043b\u0456\u0454\u043d\u0442 \u0433\u043e\u0442\u043e\u0432\u0438\u0439 \u0437\u0430\u043c\u043e\u0432\u0438\u0442\u0438, \u0437\u0430\u043f\u0438\u0442\u0430\u0439:\n' +
        '- \u0406\u043c\'\u044f\n' +
        '- \u0422\u0435\u043b\u0435\u0444\u043e\u043d\n' +
        '- \u041c\u0456\u0441\u0442\u043e\n\n' +
        '\u0424\u043e\u0440\u043c\u0430\u0442 \u0432\u0456\u0434\u043f\u043e\u0432\u0456\u0434\u0456 \u043f\u0440\u043e \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f:\n' +
        '"\u0427\u0443\u0434\u043e\u0432\u043e! \u041e\u0441\u044c \u0432\u0430\u0448\u0435 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f:\n' +
        '[\u0441\u043f\u0438\u0441\u043e\u043a \u0442\u043e\u0432\u0430\u0440\u0456\u0432]\n' +
        '\u0417\u0430\u0433\u0430\u043b\u044c\u043d\u0430 \u0441\u0443\u043c\u0430: [\u0441\u0443\u043c\u0430] \u0433\u0440\u043d\n\n' +
        '\u0414\u043b\u044f \u043e\u0444\u043e\u0440\u043c\u043b\u0435\u043d\u043d\u044f \u043d\u0430\u043f\u0438\u0448\u0456\u0442\u044c, \u0431\u0443\u0434\u044c \u043b\u0430\u0441\u043a\u0430:\n' +
        '- \u0412\u0430\u0448\u0435 \u0456\u043c\'\u044f\n' +
        '- \u0422\u0435\u043b\u0435\u0444\u043e\u043d\n' +
        '- \u041c\u0456\u0441\u0442\u043e \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438"';
}

function getCategoryName(category) {
    var names = {
        'rozpyv': '\u0420\u043e\u0437\u043f\u0438\u0432',
        'female': '\u0416\u0456\u043d\u043e\u0447\u0430',
        'male': '\u0427\u043e\u043b\u043e\u0432\u0456\u0447\u0430',
        'unisex': '\u0423\u043d\u0456\u0441\u0435\u043a\u0441',
        'niche': '\u041d\u0456\u0448\u0435\u0432\u0430',
        'aroma': '\u0410\u0440\u043e\u043c\u0430\u0434\u0438\u0444\u0443\u0437\u043e\u0440'
    };
    return names[category] || category;
}

// ========================================
// ORDER DETECTION & HANDLING
// ========================================
function detectOrderIntent(message) {
    var orderKeywords = ['\u0437\u0430\u043c\u043e\u0432\u0438\u0442\u0438', '\u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f', '\u043a\u0443\u043f\u0438\u0442\u0438', '\u0445\u043e\u0447\u0443', '\u0432\u0456\u0437\u044c\u043c\u0443', '\u043e\u0444\u043e\u0440\u043c\u0438\u0442\u0438'];
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
        '\uD83D\uDCE6 \u041e\u0444\u043e\u0440\u043c\u0438\u0442\u0438 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f' +
        '</button>' +
        '</div>' +
        '</div>';
    chatMessages.insertAdjacentHTML('beforeend', buttonHtml);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function confirmOrder() {
    if (currentOrder.length === 0) {
        addMessage('assistant', '\u0421\u0445\u043e\u0436\u0435, \u044f \u043d\u0435 \u0437\u043c\u0456\u0433 \u0432\u0438\u0437\u043d\u0430\u0447\u0438\u0442\u0438 \u044f\u043a\u0456 \u0442\u043e\u0432\u0430\u0440\u0438 \u0432\u0438 \u0445\u043e\u0447\u0435\u0442\u0435 \u0437\u0430\u043c\u043e\u0432\u0438\u0442\u0438. \u0423\u0442\u043e\u0447\u043d\u0456\u0442\u044c, \u0431\u0443\u0434\u044c \u043b\u0430\u0441\u043a\u0430!');
        return;
    }

    var orderSummary = currentOrder.map(function(p) {
        return '\u2022 ' + p.name + ' \u2014 ' + p.price + ' \u0433\u0440\u043d';
    }).join('\n');
    var total = currentOrder.reduce(function(sum, p) { return sum + p.price; }, 0);

    var message = '\u0412\u0456\u0434\u043c\u0456\u043d\u043d\u043e! \u0412\u0430\u0448\u0435 \u0437\u0430\u043c\u043e\u0432\u043b\u0435\u043d\u043d\u044f:\n\n' + orderSummary + '\n\n\uD83D\uDCB0 \u0417\u0430\u0433\u0430\u043b\u044c\u043d\u0430 \u0441\u0443\u043c\u0430: ' + total + ' \u0433\u0440\u043d\n\n\u0414\u043b\u044f \u043e\u0444\u043e\u0440\u043c\u043b\u0435\u043d\u043d\u044f \u043d\u0430\u043f\u0438\u0448\u0456\u0442\u044c:\n1. \u0412\u0430\u0448\u0435 \u0456\u043c\'\u044f\n2. \u0422\u0435\u043b\u0435\u0444\u043e\u043d\n3. \u041c\u0456\u0441\u0442\u043e';

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
