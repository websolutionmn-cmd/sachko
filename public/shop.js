
// Loader
const loader = document.getElementById('loader');
function showLoader(ms=2000){ loader.classList.remove('hide'); setTimeout(()=>loader.classList.add('hide'), Math.min(ms, 2000)); }
function hideLoader(){ loader.classList.add('hide'); }
window.addEventListener('load', ()=> setTimeout(hideLoader, 1800));

// Navigation
const navLinks = document.querySelectorAll('[data-nav]');
function showSection(hash){
  const id = (hash || '#home').replace('#','');
  ['home','shop','about'].forEach(s => {
    const el = document.getElementById(s);
    if(!el) return;
    el.style.display = (s === id) ? '' : 'none';
  });
  navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#'+id));
  if(id === 'shop'){ loadCategories(); loadProducts(); }
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
