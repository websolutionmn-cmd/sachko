
# SAČKO BAUMARKET — v9 Pro (Light Mode)

## Стартување
```
npm install
npm start
# http://localhost:3000
# http://localhost:3000/admin  (логин: martin / 2468)
```
> Логинот е дефиниран во `public/admin.html` (frontend), без .env

## Производство (Production build)
```
npm run build
# Излез: ./dist/public (минифицирано CSS/JS + ажурирани линкови)
```

## Видеа
Ставете ги фајловите во:
- public/videos/sachko.mp4   (Home)
- public/videos/zanas.mp4     (За Нас)

## Функционалности
- Продавница со категории, статуси, сортирања
- Кошничка со 🗑️ и toast пораки
- Fullscreen преглед на слика со ✕ за затворање
- Админ панел (додај/измени/бриши/качување слика) — чува во `data/products.json`
- Е-пошта за нарачки преку SMTP (.env поставки)

## Напомена
Ако не стига е-пошта, пополнете SMTP полиња во `.env` (Gmail app password) и рестартирајте сервер.
