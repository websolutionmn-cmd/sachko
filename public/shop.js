
// Loader
const loader = document.getElementById('loader');
function showLoader(ms=2000){ loader.classList.remove('hide'); setTimeout(()=>loader.classList.add('hide'), Math.min(ms, 2000)); }
function hideLoader(){ loader.classList.add('hide'); }
window.addEventListener('load', ()=> setTimeout(hideLoader, 1800));

// Navigation
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

  // Покажи / сокриј препорака и бројач
  updateHomeVisibility(id === 'home');

  // Ако сме во продавница — вчитај производи
  if (id === 'shop') {
    loadCategories();
    loadProducts();
  }
}

// Покажи ја само "Наша препорака" и "Бројач" ако е HOME секција
function updateHomeVisibility(show) {
  const rec = document.getElementById('recommend');
  const counter = document.getElementById('infinity-counter');
  if (!rec || !counter) return;
  rec.style.display = show ? 'block' : 'none';
  counter.style.display = show ? 'block' : 'none';
}

window.addEventListener('hashchange', ()=>{ showLoader(1000); showSection(location.hash); });
showSection(location.hash || '#home');

// Toasts
const toasts = document.getElementById('toasts');
function toast(msg){
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  toasts.appendChild(t);
  requestAnimationFrame(()=> t.classList.add('show'));
  setTimeout(()=>{
    t.classList.remove('show');
    setTimeout(()=> t.remove(), 350);
  }, 2000);
}

// Listen for admin updates
window.addEventListener('storage', (e)=>{
  if(e.key === 'catalog_refresh'){ loadCategories(); loadProducts(); }
});

// Cart logic
let cart = JSON.parse(localStorage.getItem('cart')||'[]');
const cartList = document.getElementById('cartList');
const totalEl = document.getElementById('total');
const cartCount = document.getElementById('cartCount');

function renderCart(){
  if(!cartList) return;
  cartList.innerHTML = '';
  let total = 0;
  cart.forEach((it,i)=>{
    const li = document.createElement('li');
    li.innerHTML = `<span>${it.name} x${it.qty} <b>${(it.price*it.qty).toFixed(2)}</b></span>`;
    const del = document.createElement('button');
    del.className='remove'; del.innerHTML = '<i class="fa-solid fa-trash"></i>';
    del.onclick = ()=>{
      li.classList.add('fade-out');
      setTimeout(()=>{
        it.qty--;
        toast('❌ Производот е тргнат од кошничката');
        if(it.qty<=0) cart.splice(i,1);
        saveCart();
      }, 330);
    };
    li.appendChild(del);
    cartList.appendChild(li);
    total += it.price*it.qty;
  });
  if(totalEl) totalEl.textContent = total.toFixed(2);
  // Прикажи информација за достава
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

  if(cartCount) cartCount.textContent = cart.reduce((s, x)=> s + x.qty, 0);
}
function saveCart(){ localStorage.setItem('cart', JSON.stringify(cart)); renderCart(); }
renderCart();

// Filters
const catSelect = document.getElementById('catFilter');
const statusSelect = document.getElementById('statusFilter');
const sortSelect = document.getElementById('sortBy');
const searchInput = document.getElementById('q');
if(document.getElementById('applyFilters')){
  document.getElementById('applyFilters').onclick = ()=> loadProducts();
  document.getElementById('clearFilters').onclick = ()=>{ 
    if(catSelect) catSelect.value=''; 
    if(statusSelect) statusSelect.value='all';
    if(sortSelect) sortSelect.value='';
    if(searchInput) searchInput.value=''; 
    loadProducts(); 
  };
}

async function loadCategories(){
  if(!catSelect) return;
  const r = await fetch('/api/categories', {cache:'no-store'}); const cats = await r.json();
  catSelect.innerHTML = '<option value=\"\">Сите категории</option>' + cats.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
}

function applySort(items){
  const sort = sortSelect ? sortSelect.value : '';
  const arr = [...items];
  if(sort==='name_asc') arr.sort((a,b)=>a.name.localeCompare(b.name));
  else if(sort==='name_desc') arr.sort((a,b)=>b.name.localeCompare(a.name));
  else if(sort==='price_asc') arr.sort((a,b)=>Number(a.price)-Number(b.price));
  else if(sort==='price_desc') arr.sort((a,b)=>Number(b.price)-Number(a.price));
  else if(sort==='newest') arr.sort((a,b)=>Number(b.id)-Number(a.id));
  return arr;
}

// Fullscreen image viewer
const imgModal = document.getElementById('imgModal');
const imgModalImg = imgModal ? imgModal.querySelector('img') : null;
const imgModalClose = imgModal ? imgModal.querySelector('.close') : null;
if(imgModalClose){
  imgModalClose.addEventListener('click', ()=> imgModal.classList.remove('open'));
  imgModal.addEventListener('click', (e)=>{ if(e.target===imgModal) imgModal.classList.remove('open'); });
}

function hookCardImages(scope){
  (scope||document).querySelectorAll('.card img').forEach(img => {
    img.addEventListener('click', ()=>{
      if(!imgModal || !imgModalImg) return;
      imgModalImg.src = img.src;
      imgModal.classList.add('open');
    });
  });
}

async function loadProducts(){
  const productsWrap = document.getElementById('products'); if(!productsWrap) return;
  const params = new URLSearchParams();
  if(catSelect && catSelect.value) params.set('category', catSelect.value);
  if(statusSelect && statusSelect.value) params.set('status', statusSelect.value);
  if(searchInput && searchInput.value.trim()) params.set('q', searchInput.value.trim());
  const res = await fetch('/api/products?'+params.toString(), {cache:'no-store'}); 
  let items = await res.json();
  items = applySort(items);
  productsWrap.innerHTML='';
  items.forEach(p=>{
    const card = document.createElement('div'); card.className='card';
    const status = p.status || 'available';
    const isSold = status === 'soldout';
    card.innerHTML = `
      <img src="${p.imageUrl || '/img/logo.jpg'}" alt=""/>
      <h4>${p.name}</h4>
      <p>${p.description||''}</p>
      <div class="status ${isSold?'bad':'ok'}">${isSold?'🔴 Распродадено':'🟢 Достапно'}</div>
      <b style="margin-top:6px">${p.price} MKD</b>
      <div class="qty">
        <label>Количина:</label>
        <input type="number" min="1" step="1" value="1" ${isSold?'disabled':''}/>
        <button class="btn full" ${isSold?'disabled':''}>Додај во кошничка</button>
      </div>`;
    const qtyInput = card.querySelector('input');
    const addBtn = card.querySelector('button');
    if(!isSold){
      addBtn.onclick = ()=>{
        const qty = Math.max(1, parseInt(qtyInput.value||'1',10));
        const found = cart.find(x=>x.id===p.id);
        if(found) found.qty += qty; else cart.push({id:p.id, name:p.name, price:p.price, qty});
        saveCart();
        toast('✅ Производот е додаден во кошничката');
        document.getElementById('cartBtn').scrollIntoView({behavior:'smooth'});
      };
    }
    productsWrap.appendChild(card);
  });
  hookCardImages(productsWrap);
}
if((location.hash||'#home').replace('#','')==='shop'){ loadCategories(); loadProducts(); }

// Order submit
const orderForm = document.getElementById('orderForm');
if(orderForm){
  orderForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if(!cart.length){ toast('⚠️ Кошничката е празна'); return; }
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const total = totalEl.textContent;
    const body = { items: cart, total, name, phone, email };
    const res = await fetch('/api/order', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
    const msg = document.getElementById('orderMsg');
    if(res.ok){
      msg.textContent = 'Нарачката е успешно испратена! Ќе ве контактираме наскоро.';
      cart = []; saveCart(); (e.target).reset();
    } else {
      const d = await res.json().catch(()=>({}));
      msg.textContent = d.error || 'Настана грешка. Обидете се повторно.';
    }
  });
}
document.addEventListener('DOMContentLoaded', () => {
  const cartLink = document.querySelector('a[href="#cart"]');
  const shopSection = document.getElementById('shop-end');

  if (cartLink && shopSection) {
    cartLink.addEventListener('click', (e) => {
      e.preventDefault();

      // Осигури се дека продавницата е прикажана
      location.hash = '#shop';

      // Мало доцнење за да се вчита продавницата пред скролирање
      setTimeout(() => {
        shopSection.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 400);
    });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const cartNav = document.querySelector('a[href="#shop"].btn'); // копчето во менито
  const shopSection = document.getElementById('shop');
  const cartTop = document.getElementById('cartTop');

  if (cartNav && shopSection && cartTop) {
    cartNav.addEventListener('click', (e) => {
      e.preventDefault();

      // отвори ја продавницата ако не е активна
      location.hash = '#shop';

      // почекај малку пред да скролира
      setTimeout(() => {
        cartTop.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    });
  }
});
const productsEl = document.getElementById('products');
const loadMoreBtn = document.getElementById('loadMore');

let currentAll = [];     // целата листа (по важечките филтри)
let renderedCount = 0;   // колку се прикажани во моментов
const PAGE = 10;

// Повикај ова само кога се менуваат филтрите/сортирањето
async function fetchProductsWithFilters() {
  // земи ги тековните вредности од филтрите (ако ги имаш)
  const cat = document.getElementById('catFilter')?.value || '';
  const st  = document.getElementById('statusFilter')?.value || '';
  const q   = document.getElementById('q')?.value || '';
  const sort= document.getElementById('sortBy')?.value || '';

  const params = new URLSearchParams();
  if (cat) params.set('category', cat);
  if (st && st !== 'all') params.set('status', st);
  if (q) params.set('q', q);
  if (sort) params.set('sort', sort); // ако на backend го поддржуваш, ок; ако не — сортирај на фронт

  const res = await fetch('/api/products?' + params.toString(), { cache: 'no-store' });
  currentAll = await res.json();

  // ако треба локално сортирање:
  if (sort === 'name_asc') currentAll.sort((a,b)=>a.name.localeCompare(b.name));
  if (sort === 'name_desc') currentAll.sort((a,b)=>b.name.localeCompare(a.name));
  if (sort === 'price_asc') currentAll.sort((a,b)=>Number(a.price)-Number(b.price));
  if (sort === 'price_desc') currentAll.sort((a,b)=>Number(b.price)-Number(a.price));
  if (sort === 'newest') currentAll.sort((a,b)=>Number(b.id)-Number(a.id));

  // ресетирај приказ
  renderedCount = 0;
  productsEl.innerHTML = '';
  renderNextPage(true);
}

// создава HTML за една картичка (искористи ги твоите полиња)
function cardTpl(p) {
  const isSold = (p.status || 'available') === 'soldout';
  return `
    <div class="card">
      <img src="${p.imageUrl || '/img/logo.jpg'}" alt="${p.name}" />
      <h4>${p.name}</h4>
      <p>${p.description || ''}</p>
      <div class="status ${isSold ? 'bad' : 'ok'}">${isSold ? '🔴 Распродадено' : '🟢 Достапно'}</div>
      <b style="margin-top:6px">${p.price} MKD</b>
      <div class="qty">
        <label>Количина:</label>
        <input type="number" min="1" step="1" value="1" ${isSold ? 'disabled' : ''}/>
        <button class="btn full" ${isSold ? 'disabled' : ''}>Додај во кошничка</button>
      </div>
    </div>`;
}

// прикажува уште 10 без да ги брише претходните
function renderNextPage(initial = false) {
  const next = currentAll.slice(renderedCount, renderedCount + PAGE);
  if (!next.length) {
    // нема повеќе — сокриј го копчето
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    return;
  }

  const html = next.map(cardTpl).join('');
  productsEl.insertAdjacentHTML('beforeend', html);  // <-- КЛУЧНО: додади, не заменувај

  renderedCount += next.length;

  // покажи/сокриј копче
  if (loadMoreBtn) {
    loadMoreBtn.style.display = (renderedCount >= currentAll.length) ? 'none' : 'inline-block';
  }

  // ако имаш логика што треба да се закачи на новододадените карти (пример клик на слика за fullscreen или "Додај во кошничка"),
  // повикај ја тука, со productsEl како scope:
  // hookCardImages(productsEl);
  // hookAddToCartButtons(productsEl);
}

// handler за копчето „Прикажи повеќе“
loadMoreBtn?.addEventListener('click', () => {
  renderNextPage(false);
  // скролни го копчето да остане во фокус
  setTimeout(() => loadMoreBtn.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
});

// Поврзи ги филтрите за да прават fresh fetch + reset на пагинација
document.getElementById('applyFilters')?.addEventListener('click', fetchProductsWithFilters);
document.getElementById('clearFilters')?.addEventListener('click', () => {
  document.getElementById('catFilter').value = '';
  document.getElementById('statusFilter').value = 'all';
  document.getElementById('q').value = '';
  document.getElementById('sortBy').value = '';
  fetchProductsWithFilters();
});

// иницијално вчитување кога ќе се отвори „Продавница“
if (location.hash === '#shop') {
  fetchProductsWithFilters();
}
window.addEventListener('hashchange', () => {
  if (location.hash === '#shop') fetchProductsWithFilters();
});


document.addEventListener('DOMContentLoaded', async () => {
  const recContainer = document.getElementById('recommendProducts');
  const prevBtn = document.getElementById('prevRec');
  const nextBtn = document.getElementById('nextRec');

  if (!recContainer) return;

  // Вчитај ги сите производи
  const res = await fetch('/data/products.json');
  const allProducts = await res.json();

  let currentIndex = 0;
  const SHOW_COUNT = 3;
  const CHANGE_INTERVAL = 180000; // 3 минути

  function renderRecommendations() {
    // избери 3 производи од тековната позиција
    const slice = allProducts.slice(currentIndex, currentIndex + SHOW_COUNT);

    // ако сме на крај – wrap around
    if (slice.length < SHOW_COUNT) {
      const extra = allProducts.slice(0, SHOW_COUNT - slice.length);
      slice.push(...extra);
    }

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
// Препораките нека се прикажуваат само кога е HOME
updateHomeVisibility((location.hash || '#home') === '#home');

// Кога се менува hash (секција)
window.addEventListener('hashchange', () => {
  updateHomeVisibility(location.hash === '#home');
});

  // стрелки
  prevBtn?.addEventListener('click', () => {
    currentIndex = (currentIndex - SHOW_COUNT + allProducts.length) % allProducts.length;
    renderRecommendations();
  });
  nextBtn?.addEventListener('click', () => {
    currentIndex = (currentIndex + SHOW_COUNT) % allProducts.length;
    renderRecommendations();
  });

  // автоматска промена на секои 3 минути
  setInterval(() => {
    currentIndex = (currentIndex + SHOW_COUNT) % allProducts.length;
    renderRecommendations();
  }, CHANGE_INTERVAL);

  // при клик на производ – оди во продавница и скрол до истиот
  recContainer.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    const prodId = card.dataset.id;

    // префрли на продавница
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


document.addEventListener('DOMContentLoaded', () => {
  const counterEl = document.getElementById('counter');
  if (!counterEl) return;

  let count = 3;
  const target = 10;
  const delay = 600; // милисекунди помеѓу броеви (~3 секунди вкупно)

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

