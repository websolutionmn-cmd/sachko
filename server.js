
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'data', 'products.json');
const CATEGORIES_FILE = path.join(__dirname, 'data', 'categories.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Hardcoded token (frontend will send 'x-auth: admintoken')
const ADMIN_TOKEN = 'admintoken';
const adminAuth = (req, res, next) => {
  const token = req.headers['x-auth'];
  if (token && token === ADMIN_TOKEN) return next();
  return res.status(401).json({error:'Неовластен пристап'});
};

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, UPLOAD_DIR); },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '.jpg');
    cb(null, unique + ext);
  }
});
const upload = multer({ storage });

// Helpers
const readJSON = (p, fallback=[]) => { try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch (e) { return fallback; } };
const writeJSON = (p, data) => fs.writeFileSync(p, JSON.stringify(data, null, 2));
const readProducts = () => readJSON(DATA_FILE, []);
const writeProducts = (arr) => writeJSON(DATA_FILE, arr);
const readCategories = () => readJSON(CATEGORIES_FILE, []);

// Public APIs
app.get('/api/categories', (req, res) => res.json(readCategories()));

app.get('/api/products', (req, res) => {
  const { q, category, status } = req.query;
  let items = readProducts();
  if (category) items = items.filter(p => (p.category||'').toLowerCase() === String(category).toLowerCase());
  if (status && status !== 'all') items = items.filter(p => (p.status||'available') === status);
  if (q) {
    const needle = String(q).toLowerCase();
    items = items.filter(p => (p.name||'').toLowerCase().includes(needle) || (p.description||'').toLowerCase().includes(needle));
  }
  res.json(items);
});

// Admin CRUD (protected with token header)
app.post('/api/admin/products', adminAuth, (req, res) => {
  const { name, price, description, imageUrl, category, status } = req.body;
  if (!name || price == null) return res.status(400).json({error: 'Недостасува назив или цена'});
  const items = readProducts();
  const id = Date.now().toString();
  items.push({ id, name, price: Number(price), description: description || '', imageUrl: imageUrl || '', category: category || '', status: status || 'available' });
  writeProducts(items);
  res.json({ ok: true, id });
});

app.put('/api/admin/products/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  const { name, price, description, imageUrl, category, status } = req.body;
  const items = readProducts();
  const idx = items.findIndex(p => p.id === id);
  if (idx < 0) return res.status(404).json({error: 'Не постои'});
  items[idx] = { ...items[idx],
    name: name ?? items[idx].name,
    price: price != null ? Number(price) : items[idx].price,
    description: description ?? items[idx].description,
    imageUrl: imageUrl ?? items[idx].imageUrl,
    category: category ?? items[idx].category,
    status: status ?? items[idx].status
  };
  writeProducts(items);
  res.json({ ok: true });
});

app.delete('/api/admin/products/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  let items = readProducts();
  const before = items.length;
  items = items.filter(p => p.id !== id);
  if (items.length === before) return res.status(404).json({error: 'Не постои'});
  writeProducts(items);
  res.json({ ok: true });
});

// Upload
app.post('/api/admin/upload', adminAuth, upload.single('image'), (req, res) => {
  const rel = '/uploads/' + path.basename(req.file.path);
  res.json({ ok: true, url: rel });
});

// Orders (email)
app.post('/api/order', async (req, res) => {
  const { items, total, name, phone, email } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({error:'Кошничката е празна'});
  if (!name || !phone || !email) return res.status(400).json({error:'Име, телефон и email се задолжителни'});

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
    });

    if(!process.env.ORDERS_TO){ return res.json({ ok:true, note: 'ORDERS_TO не е сетирано; нарачката не е праќана на е-пошта (dev режим).' }); }

    const lines = items.map(it => `• ${it.name} x${it.qty} = ${ (it.price * it.qty).toFixed(2) }`).join('\\n');
    const htmlLines = items.map(it => `<li>${it.name} x${it.qty} = <b>${(it.price * it.qty).toFixed(2)}</b> MKD</li>`).join('');

    const info = await transporter.sendMail({
      from: `"SACKO-BAUMARKET" <${process.env.SMTP_USER || 'no-reply@sacko.local'}>`,
      to: process.env.ORDERS_TO,
      subject: `Нова нарачка од ${name}`,
      text: `Купувач: ${name}\\nТелефон: ${phone}\\nEmail: ${email}\\n\\nНарачка:\\n${lines}\\n\\nВкупно: ${Number(total).toFixed(2)} MKD`,
      html: `<p><b>Купувач:</b> ${name}<br><b>Телефон:</b> ${phone}<br/><b>Email:</b> ${email}</p><ul>${htmlLines}</ul><p><b>Вкупно:</b> ${Number(total).toFixed(2)} MKD</p>`
    });

    res.json({ ok: true, messageId: info && info.messageId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Неуспешно испраќање на е-пошта. Проверете SMTP поставки во .env.' });
  }
});

// Pages
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
