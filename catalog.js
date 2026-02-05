/* KRISTINA | SCENT — Catalog
   Рендер каталогу з Google Sheets CSV + фільтри/пошук/сортування.
   Немає жодних секретів — лише публічні дані.
*/

const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1T_JIYKlQR54PWPCH028P2TdVLiQOrdacdGY3kH3edjE/export?format=csv&gid=0';

let products = [];
let filtered = [];

// Мапінг від ключів до людських назв (для бейджів/фільтрів)
const CATEGORY_NAMES = {
  rozlyv: 'Розлив',
  female: 'Жіноча',
  male: 'Чоловіча',
  unisex: 'Унісекс',
  niche: 'Нішева',
  aroma: 'Аромадифузор'
};

document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  initFilters();
  renderProducts(filtered);
  bindUI();
});

async function loadProducts() {
  try {
    const res = await fetch(GOOGLE_SHEET_URL, { cache: 'no-store' });
    const csvText = await res.text();
    const rows = parseCSVtoObjects(csvText);
    products = rows
      .map(row => normalizeProduct(row))
      .filter(Boolean);
    filtered = [...products];
  } catch (e) {
    console.error('Помилка завантаження каталогу:', e);
    showCatalogError('Не вдалося завантажити каталог. Спробуйте оновити сторінку.');
  }
}

function parseCSVtoObjects(csv) {
  // Парсер CSV із підтримкою лапок
  // Повертає масив об’єктів {header: value}
  const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = splitCSVLine(lines[0]).map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i]);
    if (cells.length === 1 && cells[0].trim() === '') continue;
    const obj = {};
    for (let j = 0; j < header.length; j++) {
      obj[header[j]] = (cells[j] ?? '').replace(/^"(.*)"$/, '$1').trim();
    }
    data.push(obj);
  }
  return data;
}

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && (i === 0 || line[i - 1] !== '\\')) {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function normalizeProduct(row) {
  // Підтримка різних назв колонок
  const id = row.id || row.ID || row.sku || '';
  const name = row.name || row['Назва'] || row['Product Name'] || '';
  const rawCategory = (row.category || row['Категорія'] || row['Category'] || '').toLowerCase().trim();
  const priceStr = row.price || row['Ціна'] || row['Price'] || '0';
  const badge = row.badge || row['Badge'] || row['Мітка'] || '';
  const image = row.image || row['Image'] || row['image_url'] || row['Зображення'] || '';

  if (!id || !name) return null;

  const price = parseInt(String(priceStr).replace(/[^\d]/g, ''), 10) || 0;
  const category = normalizeCategoryKey(rawCategory);

  return {
    id,
    name,
    category,
    price,
    badge: badge || '',
    image: image || '' // можна показати плейсхолдер при рендері
  };
}

function normalizeCategoryKey(key) {
  if (!key) return 'unisex';
  // Нормалізація
  if (key.includes('розлив')) return 'rozlyv';
  if (key.includes('жіно')) return 'female';
  if (key.includes('чоло') || key.includes('man') || key.includes('men')) return 'male';
  if (key.includes('уніс') || key.includes('uni')) return 'unisex';
  if (key.includes('ніш')) return 'niche';
  if (key.includes('аромад') || key.includes('diffus')) return 'aroma';
  // Якщо у CSV вже ключ у потрібному форматі
  if (CATEGORY_NAMES[key]) return key;
  return 'unisex';
}

function formatPrice(uah) {
  return `${uah} грн`;
}

function initFilters() {
  // Рендер фільтр-кнопок, якщо є контейнер
  const filtersEl = document.getElementById('categoryFilters');
  if (!filtersEl) return;

  const cats = ['all', ...Object.keys(CATEGORY_NAMES)];
  filtersEl.innerHTML = cats.map(key => {
    const label = key === 'all' ? 'Усі' : CATEGORY_NAMES[key];
    return `<button class="filter-btn" data-category="${key}">${label}</button>`;
  }).join('');

  filtersEl.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    const cat = btn.dataset.category;
    applyFilter({ category: cat });
  });
}

function applyFilter({ category = 'all', search = '', sort = 'relevance' } = {}) {
  let list = [...products];

  // Пошук
  const q = (search || '').toLowerCase();
  if (q) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      CATEGORY_NAMES[p.category]?.toLowerCase().includes(q) ||
      p.badge.toLowerCase().includes(q)
    );
  }

  // Фільтр за категорією
  if (category && category !== 'all') {
    list = list.filter(p => p.category === category);
  }

  // Сортування
  if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
  if (sort === 'name-asc') list.sort((a, b) => a.name.localeCompare(b.name, 'uk'));
  if (sort === 'name-desc') list.sort((a, b) => b.name.localeCompare(a.name, 'uk'));
  // relevance — залишаємо як є

  filtered = list;
  renderProducts(filtered);
}

function bindUI() {
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      applyFilter({
        search: searchInput.value,
        sort: sortSelect?.value || 'relevance',
        category: getActiveCategory()
      });
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      applyFilter({
        search: searchInput?.value || '',
        sort: sortSelect.value,
        category: getActiveCategory()
      });
    });
  }
}

function getActiveCategory() {
  const activeBtn = document.querySelector('#categoryFilters .filter-btn.active');
  return activeBtn ? activeBtn.dataset.category : 'all';
}

function renderProducts(list) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  if (list.length === 0) {
    grid.innerHTML = `<div class="empty-state">Нічого не знайдено.</div>`;
    return;
  }

  grid.innerHTML = list.map(p => {
    const image = p.image || 'images/placeholder.png';
    const badge = p.badge ? `<span class="badge">${escapeHTML(p.badge)}</span>` : '';
    const cat = CATEGORY_NAMES[p.category] || '';
    return `
      <div class="product-card" data-id="${escapeHTML(p.id)}">
        <div class="product-image">
          <img src="${escapeAttr(image)}" alt="${escapeAttr(p.name)}">
          ${badge}
        </div>
        <div class="product-info">
          <div class="product-name">${escapeHTML(p.name)}</div>
          <div class="product-meta">
            <span class="product-category">${escapeHTML(cat)}</span>
            <span class="product-price">${formatPrice(p.price)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function showCatalogError(msg) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;
  grid.innerHTML = `<div class="error-state">${escapeHTML(msg)}</div>`;
}

function escapeHTML(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function escapeAttr(s) {
  return escapeHTML(s).replace(/`/g, '&#096;');
}

