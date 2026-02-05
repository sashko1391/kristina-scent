/* KRISTINA | SCENT — AI Consultant
   Підключення до вашого Cloudflare Worker’а:
   - POST {API_BASE}/api/chat       → відповідь Claude
   - POST {API_BASE}/api/telegram   → відправка замовлення

   Жодних ключів у фронтенді.
*/

const API_BASE = 'https://api.your-domain.com'; // ← ЗАМІНИ на свій Worker домен або workers.dev URL
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1T_JIYKlQR54PWPCH028P2TdVLiQOrdacdGY3kH3edjE/export?format=csv&gid=0';

let conversationHistory = [];
let productsData = [];
let currentOrder = [];

document.addEventListener('DOMContentLoaded', async function () {
  await loadProducts();
  initializeChat();
  initializeEventListeners();
});

// ---------- Завантаження товарів із Google Sheets ----------
async function loadProducts() {
  try {
    const response = await fetch(GOOGLE_SHEET_URL, { cache: 'no-store' });
    const csvText = await response.text();
    const rows = parseCSVtoObjects(csvText);
    productsData = rows
      .map(row => normalizeProduct(row))
      .filter(Boolean);
    console.log('Products loaded:', productsData.length);
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

function parseCSVtoObjects(csv) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const header = splitCSVLine(lines[0]).map(s => s.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i]);
    if (cells.length === 1 && cells[0].trim() === '') continue;
    const obj = {};
    for (let j = 0; j < header.length; j++) {
      obj[header[j]] = (cells[j] ?? '').replace(/^"(.*)"$/, '$1').trim();
    }
    rows.push(obj);
  }
  return rows;
}
function splitCSVLine(line) {
  const res = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && (i === 0 || line[i - 1] !== '\\')) { q = !q; continue; }
    if (ch === ',' && !q) { res.push(cur); cur = ''; } else { cur += ch; }
  }
  res.push(cur);
  return res;
}

function normalizeProduct(row) {
  // Гнучке зчитування полів
  const id = row.id || row.ID || row.sku || '';
  const name = row.name || row['Назва'] || row['Product Name'] || '';
  const rawCategory = (row.category || row['Категорія'] || row['Category'] || '').toLowerCase().trim();
  const priceStr = row.price || row['Ціна'] || row['Price'] || '0';
  const badge = row.badge || row['Badge'] || row['Мітка'] || '';

  if (!id || !name) return null;

  const price = parseInt(String(priceStr).replace(/[^\d]/g, ''), 10) || 0;
  const category = normalizeCategoryKey(rawCategory);

  return { id, name, category, price, badge };
}

function normalizeCategoryKey(key) {
  if (!key) return 'unisex';
  if (key.includes('розлив')) return 'rozlyv';
  if (key.includes('жіно')) return 'female';
  if (key.includes('чоло') || key.includes('man') || key.includes('men')) return 'male';
  if (key.includes('уніс') || key.includes('uni')) return 'unisex';
  if (key.includes('ніш')) return 'niche';
  if (key.includes('аромад') || key.includes('diffus')) return 'aroma';
  // Якщо вже валідний ключ
  const valid = ['rozlyv', 'female', 'male', 'unisex', 'niche', 'aroma'];
  if (valid.includes(key)) return key;
  return 'unisex';
}

// ---------- Ініціалізація чату ----------
function initializeChat() {
  const welcomeMessage = `Вітаю! 👋 Я — ваш віртуальний консультант у KRISTINA | SCENT.

Я знаю ${productsData.length} товарів з нашого каталогу та можу допомогти:
• Підібрати аромат за вподобаннями
• Розповісти про характеристики
• Порекомендувати щось особливе
• Оформити замовлення

Що вас цікавить? 🌸`;
  addMessage('assistant', welcomeMessage);
}

function initializeEventListeners() {
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');

  if (chatForm && chatInput) {
    chatForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const message = chatInput.value.trim();
      if (!message) return;

      chatInput.value = '';
      await handleUserMessage(message);
    });
  }

  // Швидкі питання
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', async function () {
      const question = this.dataset.question;
      await handleUserMessage(question);
    });
  });
}

// ---------- Потік повідомлень ----------
async function handleUserMessage(message) {
  addMessage('user', message);
  showTyping();

  conversationHistory.push({ role: 'user', content: message });

  try {
    const response = await callClaudeAPI();
    hideTyping();
    addMessage('assistant', response);

    conversationHistory.push({ role: 'assistant', content: response });

    if (detectOrderIntent(message)) {
      const extractedProducts = extractProductsFromConversation();
      if (extractedProducts.length > 0) {
        currentOrder = extractedProducts;
        addOrderButton();
      }
    }
  } catch (error) {
    hideTyping();
    console.error('Error:', error);
    addMessage('assistant', 'Вибачте, сталася помилка. Спробуйте ще раз або напишіть нам у Telegram: @dniprovska_parfumerka');
  }
}

// ---------- Виклик Claude через Worker ----------
async function callClaudeAPI() {
  const systemPrompt = buildSystemPrompt();
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system: systemPrompt,
      messages: conversationHistory,
      max_tokens: 1024
    })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.text || '';
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
- Розлив — можливість спробувати аромат у меншому об'ємі
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
6. Використовуй емодзі доречно, помірно
7. Пропонуй розлив як спосіб спробувати аромат перед покупкою

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
    rozlyv: 'Розлив',
    female: 'Жіноча',
    male: 'Чоловіча',
    unisex: 'Унісекс',
    niche: 'Нішева',
    aroma: 'Аромадифузор'
  };
  return names[category] || category;
}

// ---------- Замовлення ----------
function detectOrderIntent(message) {
  const orderKeywords = ['замовити', 'замовлення', 'купити', 'хочу', 'візьму', 'оформити'];
  const text = message.toLowerCase();
  return orderKeywords.some(k => text.includes(k));
}

function extractProductsFromConversation() {
  const mentioned = [];
  const lastMessages = conversationHistory.slice(-6); // трохи глибше в історію

  lastMessages.forEach(msg => {
    const content = (msg.content || '').toLowerCase();
    productsData.forEach(product => {
      if (product.name && content.includes(product.name.toLowerCase())) {
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
  if (!chatMessages) return;
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
    addMessage('assistant', 'Схоже, я не зміг визначити, які товари ви хочете замовити. Уточніть, будь ласка!');
    return;
  }

  const orderSummary = currentOrder.map(p => `• ${p.name} — ${p.price} грн`).join('\n');
  const total = currentOrder.reduce((sum, p) => sum + p.price, 0);

  const message = `Відмінно! Ваше замовлення:\n\n${orderSummary}\n\n💰 Загальна сума: ${total} грн\n\nДля оформлення напишіть:\n1. Ваше ім'я\n2. Телефон\n3. Місто`;
  addMessage('assistant', message);
}

// При отриманні контактних даних (простий приклад):
// Виклич цю функцію, коли у вхідному повідомленні є ім’я/телефон/місто.
async function sendOrderToTelegram(customerInfo, orderItems) {
  try {
    const res = await fetch(`${API_BASE}/api/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerInfo, orderItems })
    });
    return res.ok;
  } catch (e) {
    console.error('Telegram error:', e);
    return false;
  }
}

// ---------- UI ----------
function addMessage(role, content) {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;

  const time = new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  const messageHtml = `
    <div class="message ${role}">
      <div class="message-avatar">${role === 'assistant' ? '🤖' : '👤'}</div>
      <div class="message-bubble">
        ${escapeHTML(content).replace(/\n/g, '<br>')}
        <div class="message-time">${time}</div>
      </div>
    </div>
  `;
  chatMessages.insertAdjacentHTML('beforeend', messageHtml);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping() {
  const el = document.getElementById('typingIndicator');
  const btn = document.getElementById('sendButton');
  if (el) el.style.display = 'flex';
  if (btn) btn.disabled = true;
}

function hideTyping() {
  const el = document.getElementById('typingIndicator');
  const btn = document.getElementById('sendButton');
  if (el) el.style.display = 'none';
  if (btn) btn.disabled = false;
}

function escapeHTML(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

