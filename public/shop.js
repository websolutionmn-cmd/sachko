// === Loader ===
const loader = document.getElementById('loader');
function showLoader(ms = 2000) {
  loader.classList.remove('hide');
  setTimeout(() => loader.classList.add('hide'), Math.min(ms, 2000));
}
function hideLoader() {
  loader.classList.add('hide');
}
window.addEventListener('load', () => setTimeout(hideLoader, 1800));

// === Navigation ===
const navLinks = document.querySelectorAll('[data-nav]');
function showSection(hash) {
  const id = (hash || '#home').replace('#', '');
  ['home', 'shop', 'about'].forEach(s => {
    const el = document.getElementById(s);
    if (!el) return;
    el.style.display = (s === id) ? '' : 'none';
  });

  navLinks.forEach(a =>
    a.classList.toggle('active', a.getAttribute('href') === '#' + id)
  );

  updateHomeVisibility(id === 'home');

  if (id === 'shop') {
    loadCategories();
    fetchProductsWithFilters();
  }
}

function updateHomeVisibility(show) {
  const rec = document.getElementById('recommend');
  const counter = document.getElementById('infinity-counter');
  if (!rec || !counter) return;
  rec.style.display = show ? 'block' : 'none';
  counter.style.display = show ? 'block' : 'none';
}

window.addEventListener('hashchange', () => {
  showLoader(1000);
  showSection(location.hash);
});
showSection(location.hash || '#home');

// === Toasts ===
const toasts = document.getElementById('toasts');
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  toasts.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 350);
  }, 2000);
}

// === Cart Logic ===
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
const cartList = document.getElementById('cartList');
const totalEl = document.getElementById('total');
const cartCount = document.getElementById('cartCount');

function renderCart() {
  if (!cartList) return;
  cartList.innerHTML = '';
  let total = 0;
  cart.forEach((it, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${it.name} x${it.qty} <b>${(it.price * it.qty).toFixed(2)}</b></span>`;
    const del = document.createElement('button');
    del.className = 'remove';
    del.innerHTML = '<i class="fa-solid fa-trash"></i>';
    del.onclick = () => {
      li.classList.add('fade-out');
      setTimeout(() => {
        it.qty--;
        toast('❌ Производот е тргнат од кошничката');
        if (it.qty <= 0) cart.splice(i, 1);
        saveCart();
      }, 330);
    };
    li.appendChild(del);
    cartList.appendChild(li);
    total += it.price * it.qty;
  });
  if (totalEl) totalEl.textContent = total.toFixed(2);

  // Достава инфо
  const deliveryMsg = document.getElementById('deliveryMsg');
  if (deliveryMsg) {
    if (total < 2000) {
      const diff = (2000 - total).toFixed(0);
      deliveryMsg.textContent = `🚚 За бесплатна достава недостасуваат уште ${diff} денари.`;
      deliveryMsg.className = 'delivery red';
    } else {
      deliveryMsg.textContent = `✅ Бесплатна достава!`;
      deliveryMsg.className = 'delivery green';
    }
  }

  if (cartCount)
    cartCount.textContent = cart.reduce((s, x) => s + x.qty, 0);
}
function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
}
renderCart();

// === Filters ===
const catSelect = document.getElementById('catFilter');
const statusSelect = document.getElementById('statusFilter');
const sortSelect = document.getElementById('sortBy');
const searchInput = document.getElementById('q');

async function loadCategories() {
  if (!catSelect) return;
  const r = await fetch('/api/categories', { cache: 'no-store' });
  const cats = await r.json();
  catSelect.innerHTML =
    '<option value="">Сите категории</option>' +
    cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

// === Fullscreen Image Modal ===
const imgModal = document.getElementById('imgModal');
const imgModalImg = imgModal?.querySelector('img');
imgModal?.addEventListener('click', (e) => {
  if (e.target === imgModal || e.target.classList.contains('close'))
    imgModal.classList.remove('open');
});

// Делегиран listener за слики
document.addEventListener('click', (e) => {
  const img = e.target.closest('.card img');
  if (!img) return;
  if (!imgModal || !imgModalImg) return;
  imgModalImg.src = img.src;
  imgModal.classList.add('open');
});

// === Product Loading (Pagination) ===
const productsEl = document.getElementById('products');
const loadMoreBtn = document.getElementById('loadMore');
let currentAll = [];
let renderedCount = 0;
const PAGE = 10;

async function fetchProductsWithFilters() {
  const params = new URLSearchParams();
  const cat = catSelect?.value || '';
  const st = statusSelect?.value || '';
  const q = searchInput?.value || '';
  const sort = sortSelect?.value || '';

  if (cat) params.set('category', cat);
  if (st && st !== 'all') params.set('status', st);
  if (q) params.set('q', q);
  if (sort) params.set('sort', sort);

  const res = await fetch('/api/products?' + params.toString(), { cache: 'no-store' });
  currentAll = await res.json();

  // Локално сортирање
  if (sort === 'name_asc') currentAll.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'name_desc') currentAll.sort((a, b) => b.name.localeCompare(a.name));
  if (sort === 'price_asc') currentAll.sort((a, b) => a.price - b.price);
  if (sort === 'price_desc') currentAll.sort((a, b) => b.price - a.price);
  if (sort === 'newest') currentAll.sort((a, b) => b.id - a.id);

  renderedCount = 0;
  productsEl.innerHTML = '';
  renderNextPage(true);
}

function cardTpl(p) {
  const isSold = (p.status || 'available') === 'soldout';
  return `
    <div class="card" data-id="${p.id}">
      <img src="${p.imageUrl || '/img/logo.jpg'}" alt="${p.name}" />
      <h4>${p.name}</h4>
      <p>${p.description || ''}</p>
      <div class="status ${isSold ? 'bad' : 'ok'}">${isSold ? '🔴 Распродадено' : '🟢 Достапно'}</div>
      <b>${p.price} МКД</b>
      <div class="qty">
        <label>Количина:</label>
        <input type="number" min="1" value="1" ${isSold ? 'disabled' : ''}/>
        <button class="btn full" ${isSold ? 'disabled' : ''}>Додај во кошничка</button>
      </div>
    </div>`;
}

function renderNextPage(initial = false) {
  const next = currentAll.slice(renderedCount, renderedCount + PAGE);
  if (!next.length) {
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    return;
  }

  const html = next.map(cardTpl).join('');
  productsEl.insertAdjacentHTML('beforeend', html);
  renderedCount += next.length;

  if (loadMoreBtn)
    loadMoreBtn.style.display = (renderedCount >= currentAll.length) ? 'none' : 'inline-block';
}

loadMoreBtn?.addEventListener('click', () => {
  renderNextPage(false);
  setTimeout(() => loadMoreBtn.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
});

document.getElementById('applyFilters')?.addEventListener('click', fetchProductsWithFilters);
document.getElementById('clearFilters')?.addEventListener('click', () => {
  catSelect.value = '';
  statusSelect.value = 'all';
  searchInput.value = '';
  sortSelect.value = '';
  fetchProductsWithFilters();
});

if (location.hash === '#shop') fetchProductsWithFilters();
window.addEventListener('hashchange', () => {
  if (location.hash === '#shop') fetchProductsWithFilters();
});

// === Делегиран listener за кошничка ===
productsEl?.addEventListener('click', (e) => {
  const btn = e.target.closest('.card .btn');
  if (!btn) return;

  const card = btn.closest('.card');
  const id = card?.dataset.id;
  const p = currentAll.find(x => String(x.id) === String(id));
  if (!p) return;

  const qtyInput = card.querySelector('input[type="number"]');
  const qty = Math.max(1, parseInt(qtyInput?.value || '1', 10));

  const found = cart.find(x => String(x.id) === String(p.id));
  if (found) found.qty += qty; else cart.push({ id: p.id, name: p.name, price: p.price, qty });
  saveCart();
  toast('✅ Производот е додаден во кошничката');
});

// === Recommendations ===
document.addEventListener('DOMContentLoaded', async () => {
  const recContainer = document.getElementById('recommendProducts');
  if (!recContainer) return;
  const prevBtn = document.getElementById('prevRec');
  const nextBtn = document.getElementById('nextRec');

  const res = await fetch('/api/products', { cache: 'no-store' });
  const allProducts = await res.json();

  let currentIndex = 0;
  const SHOW_COUNT = 3;
  const CHANGE_INTERVAL = 180000;

  function renderRecommendations() {
    const slice = allProducts.slice(currentIndex, currentIndex + SHOW_COUNT);
    if (slice.length < SHOW_COUNT)
      slice.push(...allProducts.slice(0, SHOW_COUNT - slice.length));
    recContainer.innerHTML = slice.map(p => `
      <div class="card" data-id="${p.id}">
        <img src="${p.imageUrl || '/img/logo.jpg'}" alt="${p.name}">
        <h4>${p.name}</h4>
        <p>${p.description || ''}</p>
        <b>${p.price} МКД</b>
      </div>
    `).join('');
  }

  renderRecommendations();

  prevBtn?.addEventListener('click', () => {
    currentIndex = (currentIndex - SHOW_COUNT + allProducts.length) % allProducts.length;
    renderRecommendations();
  });
  nextBtn?.addEventListener('click', () => {
    currentIndex = (currentIndex + SHOW_COUNT) % allProducts.length;
    renderRecommendations();
  });
  setInterval(() => {
    currentIndex = (currentIndex + SHOW_COUNT) % allProducts.length;
    renderRecommendations();
  }, CHANGE_INTERVAL);

  recContainer.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    const prodId = card.dataset.id;
    location.hash = '#shop';
    setTimeout(() => {
      const productCard = document.querySelector(`#products .card[data-id="${prodId}"]`);
      if (productCard) {
        productCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        productCard.classList.add('highlight');
        setTimeout(() => productCard.classList.remove('highlight'), 2000);
      }
    }, 700);
  });
});

// === Counter Animation ===
document.addEventListener('DOMContentLoaded', () => {
  const counterEl = document.getElementById('counter');
  if (!counterEl) return;
  let count = 3;
  const target = 10;
  const delay = 600;
  const timer = setInterval(() => {
    count++;
    counterEl.textContent = count;
    if (count >= target) {
      clearInterval(timer);
      setTimeout(() => {
        counterEl.textContent = '∞';
        counterEl.classList.add('infinity');
      }, 600);
    }
  }, delay);
});

// === Hamburger Menu ===
const hamburger = document.querySelector('.hamburger');
const headerEl = document.querySelector('header');
hamburger?.addEventListener('click', () => headerEl.classList.toggle('nav-open'));
