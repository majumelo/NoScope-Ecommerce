/* app.js
   - Mantive seu toggle de menu
   - Adicionei: catálogo dinâmico, modal, carrinho (localStorage),
     checkout com ViaCEP (máscara e tratamento de erros/accessibility)
*/

/* --- Toggle menu (seu código original) --- */
const navbar = document.querySelector(".navbar");
const menuButton = document.querySelector(".menu-button");

menuButton.addEventListener('click', () => {
    navbar.classList.toggle("show-menu");
});

/* ---------- Dados de exemplo (pode trocar/expandir) ---------- */
const PRODUCTS = [
  { id: 'p1', name: 'Combo Gamer A', price: 4000.00, category: 'Periféricos', images: ['images/products/product-4.png'], description: 'Combo completo para gamers iniciantes.' },
  { id: 'p2', name: 'Smartband 4', price: 199.90, category: 'Wearables', images: ['images/exclusive.png'], description: 'Acompanhe sua atividade física.' },
  { id: 'p3', name: 'Headset RGB', price: 349.90, category: 'Periféricos', images: ['images/products/product-5.png'], description: 'Som imersivo com microfone flexível.' },
  { id: 'p4', name: 'Cadeira Gamer', price: 899.00, category: 'Móveis', images: ['images/products/product-6.png'], description: 'Cadeira ergonômica para longas sessões.' },
  { id: 'p5', name: 'Teclado Mecânico', price: 299.90, category: 'Periféricos', images: ['images/products/product-7.png'], description: 'Switches azuis, iluminação RGB.' },
  // adicione mais conforme quiser
];

/* ---------- Utilitários ---------- */
const q = (sel, ctx=document) => ctx.querySelector(sel);
const qa = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const formatCurrency = v => v.toFixed(2).replace('.', ',');

/* ---------- Classe Cart (persistência localStorage) ---------- */
class Cart {
  constructor() {
    this.key = 'cart';
    this.items = this.load();
  }
  add(product, qty=1) {
    const found = this.items.find(i => i.id === product.id);
    if (found) found.qty += qty;
    else this.items.push({ id: product.id, name: product.name, price: product.price, qty });
    this.save();
  }
  updateQty(productId, qty) {
    this.items = this.items.map(i => i.id === productId ? { ...i, qty } : i).filter(i => i.qty > 0);
    this.save();
  }
  remove(productId) {
    this.items = this.items.filter(i => i.id !== productId);
    this.save();
  }
  clear() { this.items = []; this.save(); }
  subtotal() { return this.items.reduce((s,i)=> s + i.price * i.qty, 0); }
  save() { localStorage.setItem(this.key, JSON.stringify(this.items)); updateCartUI(); }
  load() { const raw = localStorage.getItem(this.key); return raw ? JSON.parse(raw) : []; }
}

const cart = new Cart();

/* ---------- Refs DOM ---------- */
const catalogEl = q('#catalog');
const searchEl = q('#search');
const catFilterEl = q('#categoryFilter');
const sortEl = q('#sort');
const cartCountEl = q('#cart-count');
const cartPanel = q('#cartPanel');
const openCartBtn = q('#open-cart-btn');
const closeCartBtn = q('#close-cart');
const cartItemsEl = q('#cartItems');
const cartSubtotalEl = q('#cartSubtotal');
const checkoutSection = q('#checkout');
const checkoutBtn = q('#checkoutBtn');
const checkoutForm = q('#checkoutForm');
const cepInput = q('#cep');
const cepHelp = q('#cepHelp');
const numberInput = q('#number');
const toast = q('#toast');

/* ---------- Inicialização ---------- */
function init() {
  populateCategories();
  renderCatalog(PRODUCTS);
  attachEvents();
  updateCartUI();
}
init();

/* ---------- Render catálogo ---------- */
function populateCategories() {
  const cats = Array.from(new Set(PRODUCTS.map(p=>p.category)));
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    catFilterEl.appendChild(opt);
  });
}
function renderCatalog(list) {
  catalogEl.innerHTML = '';
  if (!list || list.length === 0) {
    catalogEl.textContent = 'Nenhum produto encontrado.';
    return;
  }
  list.forEach(p => {
    const card = document.createElement('article');
    card.className = 'product';
    card.innerHTML = `
      <img src="${p.images[0] || ''}" alt="${p.name}" />
      <p class="product-name">${p.name}</p>
      <p class="rate">&#9733;&#9733;&#9733;&#9733;&#9734;</p>
      <p class="product-price">R$ ${formatCurrency(p.price)}</p>
      <div class="product-actions">
        <button class="view-btn" data-id="${p.id}"><i class="fas fa-eye"></i> Ver</button>
        <button class="add-btn" data-id="${p.id}"><i class="fas fa-cart-plus"></i> Adicionar</button>
      </div>
    `;
    catalogEl.appendChild(card);
  });
}

/* ---------- Eventos ---------- */
function attachEvents() {
  // busca / filtro / ordenação
  searchEl.addEventListener('input', applyFilters);
  catFilterEl.addEventListener('change', applyFilters);
  sortEl.addEventListener('change', applyFilters);

  // delegação de clicks no catálogo
  catalogEl.addEventListener('click', e => {
    const view = e.target.closest('.view-btn');
    const add = e.target.closest('.add-btn');
    if (view) openProductModal(view.dataset.id);
    if (add) {
      const prod = PRODUCTS.find(p => p.id === add.dataset.id);
      cart.add(prod, 1);
      // feedback toast em vez de alert
      showToast(`${prod.name} adicionado ao carrinho.`);
    }
  });

  // abrir/fechar carrinho
  openCartBtn.addEventListener('click', ()=> toggleCart(true));
  if (closeCartBtn) closeCartBtn.addEventListener('click', ()=> toggleCart(false));

  // delegação no carrinho (remover/alterar qty)
  cartItemsEl.addEventListener('click', e => {
    const btn = e.target.closest('.remove-item');
    if (btn) cart.remove(btn.dataset.id);
  });
  cartItemsEl.addEventListener('change', e => {
    if (e.target.matches('.item-qty')) {
      const id = e.target.dataset.id;
      const qty = parseInt(e.target.value, 10) || 1;
      cart.updateQty(id, qty);
    }
  });

  // checkout flow
  checkoutBtn.addEventListener('click', ()=> {
    toggleCart(false);
    openCheckout();
  });
  q('#backToStore').addEventListener('click', ()=> { checkoutSection.hidden = true; });

  checkoutForm.addEventListener('submit', e => {
    e.preventDefault();
    if (cart.items.length === 0) return showToast('Carrinho vazio.', 'error');
    // aqui você processaria o pagamento / envio do pedido (simulação)
    showToast('Pedido finalizado (simulação). Obrigado!', 'success');
    cart.clear();
    checkoutSection.hidden = true;
  });

  // máscara do CEP e trigger de busca
  cepInput.addEventListener('input', onCepInput);

  // fechar modal ao clicar fora / botão fechar
  const modal = q('#productModal');
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.classList.contains('close-modal')) closeModal();
  });

  // adicionar do modal
  q('#addToCartFromModal').addEventListener('click', () => {
    const pid = q('#addToCartFromModal').dataset.id;
    const prod = PRODUCTS.find(p => p.id === pid);
    cart.add(prod, 1);
    showToast(`${prod.name} adicionado ao carrinho.`);
    closeModal();
  });
}

/* ---------- Filtros e ordenação ---------- */
let filteredProducts = [...PRODUCTS];
function applyFilters() {
  const term = searchEl.value.trim().toLowerCase();
  const cat = catFilterEl.value;
  const sortVal = sortEl.value;

  filteredProducts = PRODUCTS.filter(p => {
    const matchesTerm = p.name.toLowerCase().includes(term);
    const matchesCat = cat ? p.category === cat : true;
    return matchesTerm && matchesCat;
  });

  if (sortVal) {
    if (sortVal === 'price-asc') filteredProducts.sort((a,b)=>a.price-b.price);
    if (sortVal === 'price-desc') filteredProducts.sort((a,b)=>b.price-a.price);
    if (sortVal === 'name-asc') filteredProducts.sort((a,b)=>a.name.localeCompare(b.name));
  }

  renderCatalog(filteredProducts);
}

/* ---------- Modal produto ---------- */
function openProductModal(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  q('#modalTitle').textContent = p.name;
  q('#modalDesc').textContent = p.description;
  q('#modalPrice').textContent = formatCurrency(p.price);
  q('#addToCartFromModal').dataset.id = p.id;
  q('#modalGallery').innerHTML = p.images.map(src => `<img src="${src}" alt="${p.name}" />`).join('');
  q('#productModal').setAttribute('aria-hidden', 'false');
}
function closeModal() {
  q('#productModal').setAttribute('aria-hidden', 'true');
}

/* ---------- UI do Carrinho ---------- */
function updateCartUI() {
  const count = cart.items.reduce((s,i)=> s + i.qty, 0);
  q('#cart-count').textContent = count;
  cartItemsEl.innerHTML = '';
  if (cart.items.length === 0) {
    cartItemsEl.textContent = 'Carrinho vazio.';
  } else {
    cart.items.forEach(i => {
      const el = document.createElement('div');
      el.innerHTML = `
        <div>
          <strong>${i.name}</strong>
          <p>R$ ${formatCurrency(i.price)}</p>
        </div>
        <div>
          <input class="item-qty" type="number" min="1" value="${i.qty}" data-id="${i.id}" />
          <button class="remove-item" data-id="${i.id}" aria-label="Remover ${i.name}">Remover</button>
        </div>
      `;
      cartItemsEl.appendChild(el);
    });
  }
  cartSubtotalEl.textContent = formatCurrency(cart.subtotal());
}

/* ---------- Toggle carrinho ---------- */
function toggleCart(show) {
  cartPanel.setAttribute('aria-hidden', String(!show));
  if (show) cartPanel.focus();
}

/* ---------- Checkout ---------- */
function openCheckout() {
  checkoutSection.hidden = false;
  cepInput.focus();
}

/* ---------- CEP (ViaCEP) + máscara, tratamento de erros e acessibilidade ---------- */
function onCepInput(e) {
  let v = e.target.value.replace(/\D/g,'');
  if (v.length > 8) v = v.slice(0,8);
  if (v.length > 5) v = v.slice(0,5) + '-' + v.slice(5);
  e.target.value = v;
  const digits = v.replace(/\D/g,'');
  cepHelp.textContent = '';
  if (digits.length === 8) {
    fetchCep(digits);
  } else {
    if (digits.length > 0 && digits.length < 8) {
      cepHelp.textContent = 'CEP incompleto — digite 8 dígitos.';
      cepHelp.setAttribute('role','status');
    }
  }
}

async function fetchCep(cep) {
  cepHelp.textContent = 'Buscando endereço...';
  cepHelp.setAttribute('role','status');
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!res.ok) throw new Error('Falha na requisição');
    const data = await res.json();
    if (data.erro) {
      cepHelp.textContent = 'CEP não encontrado. Preencha manualmente.';
    } else {
      q('#street').value = data.logradouro || '';
      q('#neighborhood').value = data.bairro || '';
      q('#city').value = data.localidade || '';
      q('#uf').value = data.uf || '';
      cepHelp.textContent = 'Endereço autopreenchido.';
      // acessibilidade: foco no número após preencher
      numberInput.focus();
    }
  } catch (err) {
    cepHelp.textContent = 'Falha de rede ao buscar CEP. Preencha manualmente.';
    console.error(err);
  }
}

/* ---------- Toast ---------- */
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = 'toast';
  if (type === 'error') {
    toast.style.backgroundColor = '#f44336';
  } else {
    toast.style.backgroundColor = '#4CAF50';
  }
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

/* expose for debugging */
window.app = { cart, PRODUCTS };