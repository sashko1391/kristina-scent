# KRISTINA | SCENT

## Overview
KRISTINA | SCENT — масмаркет онлайн-магазин парфумерії для українського ринку.
Фокус: жіночність, доступність, естетика, довіра.

Проєкт стартує як MVP на GitHub Pages з можливістю подальшого масштабування (каталог, оплати, доставка).

---

## Brand
**Name:** KRISTINA | SCENT  
**Market:** Масмаркет  
**Region:** Україна  
**Target audience:** Жінки 18–45, подарунки, щоденне використання

**Tone & Voice:**
- теплий
- жіночний
- простий і зрозумілий
- без пафосу та фальшивого "lux"

---

## Visual Style
**Color palette:**
- Soft pink (основний фон)
- Warm gold (акценти, логотип, заголовки)
- White (поверхні, блоки)
- Neutral dark text

**Visual inspiration:**
- Soft luxury
- Minimalism
- Aesthetic similar to modern dessert/restaurant branding
- Clean UI, no visual noise

---

## Categories
- Розлив
- Жіноча парфумерія
- Чоловіча парфумерія
- Унісекс
- Нішева парфумерія
- Про нас

---

## Tech Stack
- HTML5
- CSS3 (mobile-first, responsive)
- Vanilla JavaScript
- Hosting: GitHub Pages

**Constraints:**
- No backend at MVP stage
- No frameworks
- Fast load on mobile

---

## Contacts (Real)
- **Instagram:** https://www.instagram.com/dniprowska_parfumerka
- **Telegram:** https://t.me/dniprovska_parfumerka
- **Email:** info@kristinascent.com (placeholder)

---

## MVP Goals
- ✅ Responsive landing page (PC / tablet / mobile)
- ✅ Hero slider (21:9 cinematic, 3 slides, auto-play)
- ✅ Large category cards (clickable, with real images)
- ✅ Product showcase (6 items with badges)
- ✅ Trust factors section
- ✅ Decant banner (USP)
- ✅ Instagram integration
- ✅ Mobile menu
- ✅ Brand aesthetics
- ✅ All images integrated

---

## File Structure
```
kristina-scent/
├── index.html          # Main landing page
├── style.css           # Styles (mobile-first)
├── script.js           # Slider + menu functionality
├── README.md           # Setup guide
├── DEPLOYMENT-GUIDE.md # Deployment instructions
├── IMAGES-GUIDE.md     # Image specifications
└── images/
    ├── hero/           # 3 slider images (21:9)
    ├── categories/     # 5 category backgrounds
    ├── products/       # 6 product photos
    ├── instagram/      # 3 Instagram posts
    └── brand/          # Logo files
```

---

## Features Implemented

### Hero Slider
- 3 slides with different messaging
- Auto-play (5 sec intervals)
- Arrow navigation (← →)
- Dot navigation (bottom)
- Swipe support (mobile)
- Keyboard navigation
- 21:9 on desktop, 16:9 on mobile

### Categories
- Large clickable cards (2×3 grid on desktop)
- Real background images
- Hover effects
- Mobile: swipe carousel

### Products
- 6 product cards with images
- "Хіт" / "Популярне" badges
- Price display
- Hover animations

### Navigation
- Sticky header
- Mobile hamburger menu
- Smooth scroll to sections
- Active state indicators

---

## Changelog

### Version 1.1 (2026-02-04)
**Updates & Improvements**

**Added:**
- 6th category: Аромадифузори (aroma.jpg)
- Feedback slider section with 5 customer reviews from Instagram
- Owner photo background in "Why Us" section (me.jpg)
- Favicon integration (favicon.png)
- Horizontal feedback slider with swipe support and arrow navigation

**Fixed:**
- Category background images path (removed ../ for GitHub Pages compatibility)
- Mobile category display - images now show fully without cropping (background-size: 90%)
- Hero slider autoplay - now properly changes every 5 seconds
- Year in footer updated to 2026
- Why Us section overlay reduced to 65-75% for better photo visibility

**Optimized:**
- Mobile category cards: smaller height (160px), better spacing
- Category titles on mobile: improved readability with background overlay
- Tablet/Desktop: restored full cover mode for categories (220-280px)

**Images Integrated:**
- images/categories/aroma.jpg (6th category)
- images/brand/me.jpg (owner photo background)
- images/brand/favicon.png (browser icon)
- images/feedback/fbck-1.jpg through fbck-5.jpg (customer reviews)

---

### Version 1.0 (2024-02-04)
**Initial Release - MVP Complete**

**Added:**
- Hero slider with 3 slides (21:9 aspect ratio)
- Large category cards with real images
- Product showcase (6 items)
- Instagram integration with real posts
- Contact section with real links
- Mobile-responsive design
- Smooth animations and transitions

**Integrated Images:**
- ✅ hero/slide-1.jpg, slide-2.jpg, slide-3.jpg
- ✅ categories/rozlyv.jpg, female.jpg, male.jpg, unisex.jpg, niche.jpg
- ✅ products/chanel_5.jpg, dior_sauvage.jpg, lancome-vie.jpg, tom-ford-orchid.jpg, hermes-terre.jpg, versace-eros.jpg
- ✅ instagram/post-1.jpg, post-2.jpg, post-3.jpg

**Contacts Updated:**
- Instagram: @dniprowska_parfumerka
- Telegram: @dniprovska_parfumerka

**Fixed:**
- Category background images path (removed ../ for GitHub Pages compatibility)
- All social media links active
- Mobile menu functionality
- Slider autoplay and navigation

---

## Future Plans
- Product cards (image, price, volume)
- JSON-based product catalog
- Individual product pages
- Delivery & payment integration (Ukraine)
- SEO optimization
- Google Analytics
- Admin-friendly structure for scaling
- Shopping cart (localStorage)
- Order form
- WhatsApp/Viber integration

---

## Deployment Status
**Ready for production:** ✅ YES

**Deployment platform:** GitHub Pages  
**Domain:** TBD (waiting for custom domain)

**Before Launch:**
- [ ] Update email address (currently placeholder)
- [ ] Add Google Analytics
- [ ] Add Facebook Pixel
- [ ] Test on real mobile devices
- [ ] Speed optimization check

---

## Notes for Developers
- Keep everything simple and maintainable
- Prioritize mobile UX
- Brand consistency is more important than features
- Avoid overengineering
- CSS background paths use relative paths without ../
- All images optimized (<500KB for sliders, <200KB for categories, <150KB for products)

---

## Version History
- **v1.1** (2026-02-04): Added 6th category, feedback slider, owner photo background, mobile optimization fixes
- **v1.0** (2024-02-04): Initial MVP release with full image integration and real contacts

---

**Status:** 🟢 READY FOR DEPLOYMENT
