# Дніпровська Парфумерка

Масмаркет онлайн-магазин парфумерії для українського ринку.

## 🌸 Про проєкт

**Дніпровська Парфумерка** — MVP landing page для інтернет-магазину парфумерії з фокусом на:
- Жіночість та естетику
- Доступність для широкої аудиторії
- Простоту та зрозумілість
- Довіру до бренду

## 🎨 Дизайн

**Кольорова палітра:**
- Soft Pink — основний фон (#FFF5F7)
- Warm Gold — акценти (#D4AF37)
- White — картки та блоки
- Темний текст для читабельності

**Стиль:**
- Мінімалізм
- Soft luxury aesthetic
- Mobile-first підхід
- Чистий UI без зайвого шуму

## 📱 Технології

- HTML5
- CSS3 (адаптивний дизайн)
- Vanilla JavaScript
- GitHub Pages hosting

## 🚀 Запуск локально

1. Клонуйте репозиторій:
```bash
git clone https://github.com/your-username/kristina-scent.git
cd kristina-scent
```

2. Відкрийте `index.html` у браузері або запустіть локальний сервер:
```bash
# За допомогою Python 3
python -m http.server 8000

# За допомогою Node.js (npx)
npx serve

# За допомогою VS Code Live Server
# Встановіть розширення Live Server та клікніть "Go Live"
```

3. Відкрийте в браузері: `http://localhost:8000`

## 📦 Деплой на GitHub Pages

### Автоматичний деплой

1. Створіть репозиторій на GitHub
2. Завантажте файли:
```bash
git init
git add .
git commit -m "Initial commit: Дніпровська Парфумерка MVP"
git branch -M main
git remote add origin https://github.com/your-username/kristina-scent.git
git push -u origin main
```

3. Налаштуйте GitHub Pages:
   - Перейдіть в Settings → Pages
   - Source: Deploy from a branch
   - Branch: main / (root)
   - Save

4. Сайт буде доступний за адресою:
   `https://your-username.github.io/kristina-scent/`

### Кастомний домен (опціонально)

1. Додайте файл `CNAME` з вашим доменом:
```bash
echo "dniprowska-parfumerka.shop" > CNAME
git add CNAME
git commit -m "Add custom domain"
git push
```

2. Налаштуйте DNS у вашого реєстратора:
   - Тип: A Record
   - Host: @
   - Value: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153

## 📁 Структура проєкту

```
kristina-scent/
├── index.html          # Головна сторінка
├── style.css           # Стилі (mobile-first)
├── script.js           # JavaScript функціонал
├── README.md           # Документація
└── CNAME              # (опціонально) Кастомний домен
```

## 🎯 MVP Функції

✅ Адаптивний дизайн (mobile/tablet/desktop)  
✅ Навігаційне меню з мобільною версією  
✅ Hero секція з CTA  
✅ Категорії парфумерії  
✅ Блок переваг  
✅ Про нас  
✅ Контакти  
✅ Плавна анімація та скрол  

## 🔮 Майбутні фічі

- [ ] Каталог продуктів з карточками
- [ ] JSON-база товарів
- [ ] Фільтрація та пошук
- [ ] Інтеграція з Instagram
- [ ] Форма замовлення
- [ ] Інтеграція доставки
- [ ] SEO оптимізація
- [ ] Analytics

## 🛠 Розробка

**Додати нову категорію:**
1. Відкрийте `index.html`
2. Додайте новий `.category-card` у секції `.categories-grid`
3. Оберіть відповідний emoji-іконку

**Змінити кольори:**
1. Відкрийте `style.css`
2. Змініть CSS змінні в `:root`

**Додати анімацію:**
1. Відкрийте `script.js`
2. Додайте клас до `animatedElements`

## 📧 Контакти

- **Email:** info@dniprowska-parfumerka.shop
- **Instagram:** @kristina.scent
- **Telegram:** @kristina_scent

## 📄 Ліцензія

© 2024 Дніпровська Парфумерка. Всі права захищені.

---

**Зроблено з ❤️ для української аудиторії**
