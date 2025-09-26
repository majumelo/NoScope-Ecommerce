/* app.js atualizado
   - Menu toggle
   - Catálogo dinâmico
   - Modal de produto
   - Carrinho com checkout embutido
   - CEP + cálculo de frete
   - Toasts de feedback
*/

/* ===== Utilitários ===== */
const q = (sel, ctx=document) => ctx.querySelector(sel);
const qa = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const formatCurrency = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

/* ===== Toggle menu ===== */
const navbar = q(".navbar");
const menuButton = q(".menu-button");
if (menuButton) {
  menuButton.addEventListener("click", () => {
    navbar.classList.toggle("show-menu");
  });
}

/* ===== Dados de exemplo ===== */
const PRODUCTS = [
  { id: 'p1', name: 'Combo Gamer', price: 4000.00, category: 'Periféricos', images: ['../images/images/products/product-4.png'], description: 'Combo completo para gamers iniciantes.' },
  { id: 'p2', name: 'Smartband 4', price: 199.90, category: 'Wearables', images: ['../images/images/exclusive.png'], description: 'Acompanhe sua atividade física.' },
  { id: 'p3', name: 'Placa de Video', price: 349.90, category: 'Periféricos', images: ['../images/images/products/product-5.png'], description: 'Som imersivo com microfone flexível.' },
  { id: 'p4', name: 'Controle PS5', price: 899.00, category: 'Móveis', images: ['../images/images/products/product-6.png'], description: 'Cadeira ergonômica para longas sessões.' },
  { id: 'p5', name: 'Cadeira Gamer', price: 299.90, category: 'Periféricos', images: ['../images/images/products/product-7.png'], description: 'Switches azuis, iluminação RGB.' },
];

/* ===== Classe Cart ===== */
class Cart {
  constructor() {
    this.key = 'cart';
    this.items = this.load();
  }
  add(product, qty=1) {
    const found = this.items.find(i => i.id === product.id);
    if (found) found.qty += qty;
    else this.items.push({ id: product.id, name: product.name, price: product.price, qty, image: product.images[0] });
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

/* ===== Refs DOM ===== */
const catalogEl = q('#catalog');
const searchEl = q('#search');
const catFilterEl = q('#categoryFilter');
const sortEl = q('#sort');
const cartItemsEl = q('#cartItems');
const cartSubtotalEl = q('#cartSubtotal');
const freteValueEl = q('#freteValue');
const cartTotalEl = q('#cartTotal');
const checkoutForm = q('#checkoutForm');
const cepInput = q('#cep');
const cepHelp = q('#cepHelp');
const numberInput = q('#number');
const toast = q('#toast');

/* ===== Inicialização ===== */
function init() {
  if (catFilterEl) populateCategories();
  if (catalogEl) renderCatalog(PRODUCTS);
  attachEvents();
  updateCartUI();
}
init();

/* ===== Render catálogo ===== */
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
      <p class="product-price">${formatCurrency(p.price)}</p>
      <div class="product-actions">
        <button class="view-btn btn-secondary" data-id="${p.id}"><i class="fas fa-eye"></i> Ver</button>
        <button class="add-btn btn-primary" data-id="${p.id}"><i class="fas fa-cart-plus"></i> Adicionar</button>
      </div>
    `;
    catalogEl.appendChild(card);
  });
}

/* ===== Eventos ===== */
function attachEvents() {
  if (searchEl) searchEl.addEventListener('input', applyFilters);
  if (catFilterEl) catFilterEl.addEventListener('change', applyFilters);
  if (sortEl) sortEl.addEventListener('change', applyFilters);

  if (catalogEl) {
    catalogEl.addEventListener('click', e => {
      const view = e.target.closest('.view-btn');
      const add = e.target.closest('.add-btn');
      if (view) openProductModal(view.dataset.id);
      if (add) {
        const prod = PRODUCTS.find(p => p.id === add.dataset.id);
        cart.add(prod, 1);
        showToast(`${prod.name} adicionado ao carrinho.`);
      }
    });
  }

  const openCartBtn = q('#open-cart-btn');
  const closeCartBtn = q('#close-cart');
  if (openCartBtn) openCartBtn.addEventListener('click', ()=> toggleCart(true));
  if (closeCartBtn) closeCartBtn.addEventListener('click', ()=> toggleCart(false));

  if (cartItemsEl) {
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
  }

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', e => {
      e.preventDefault();
      if (cart.items.length === 0) return showToast('Carrinho vazio.', 'error');
      showToast('Pedido finalizado com sucesso!', 'success');
      cart.clear();
      toggleCart(false);
    });
  }

  if (cepInput) cepInput.addEventListener('input', onCepInput);

  const modal = q('#productModal');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal || e.target.classList.contains('close-modal')) closeModal();
    });
    const addModalBtn = q('#addToCartFromModal');
    if (addModalBtn) {
      addModalBtn.addEventListener('click', () => {
        const pid = addModalBtn.dataset.id;
        const prod = PRODUCTS.find(p => p.id === pid);
        cart.add(prod, 1);
        showToast(`${prod.name} adicionado ao carrinho.`);
        closeModal();
      });
    }
  }
}

/* ===== Filtros ===== */
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

/* ===== Modal produto ===== */
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

/* ===== UI do Carrinho ===== */
function updateCartUI() {
  const cartCountEl = q('#cart-count');
  if (cartCountEl) {
    const count = cart.items.reduce((s,i)=> s + i.qty, 0);
    cartCountEl.textContent = count;
  }
  if (!cartItemsEl) return;

  cartItemsEl.innerHTML = '';
  if (cart.items.length === 0) {
    cartItemsEl.textContent = 'Carrinho vazio.';
  } else {
    cart.items.forEach(i => {
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="display:flex;align-items:center;gap:.5rem;">
          <img src="${i.image}" alt="${i.name}" style="width:40px;height:40px;object-fit:contain;">
          <div>
            <strong>${i.name}</strong>
            <p>${formatCurrency(i.price)}</p>
          </div>
        </div>
        <div>
          <input class="item-qty" type="number" min="1" value="${i.qty}" data-id="${i.id}" />
          <button class="remove-item btn-secondary" data-id="${i.id}" aria-label="Remover ${i.name}">Remover</button>
        </div>
      `;
      cartItemsEl.appendChild(el);
    });
  }

  const subtotal = cart.subtotal();
  if (cartSubtotalEl) cartSubtotalEl.textContent = formatCurrency(subtotal);

  // recalcula frete e total se já há CEP preenchido
  const cepDigits = cepInput?.value.replace(/\D/g,'') || '';
  if (cepDigits.length === 8) {
    const frete = currentFrete(subtotal);
    if (freteValueEl) freteValueEl.textContent = formatCurrency(frete);
    if (cartTotalEl) cartTotalEl.textContent = formatCurrency(subtotal + frete);
  } else {
    if (freteValueEl) freteValueEl.textContent = formatCurrency(0);
    if (cartTotalEl) cartTotalEl.textContent = formatCurrency(subtotal);
  }
}

/* ===== Toggle carrinho ===== */
function toggleCart(show) {
  const cartPanel = q('#cartPanel');
  if (!cartPanel) return;
  cartPanel.setAttribute('aria-hidden', String(!show));
  if (show) cartPanel.focus();
}

/* ===== Frete ===== */
function currentFrete(subtotal) {
  return subtotal >= 500 ? 0 : 20;
}

/* ===== CEP (ViaCEP) ===== */
function onCepInput(e) {
  let v = e.target.value.replace(/\D/g,'');
  if (v.length > 8) v = v.slice(0,8);
  if (v.length > 5) v = v.slice(0,5) + '-' + v.slice(5);
  e.target.value = v;
  const digits = v.replace(/\D/g,'');
  cepHelp.textContent = '';
  if (digits.length === 8) fetchCep(digits);
}

async function fetchCep(cep) {
  cepHelp.textContent = 'Buscando endereço...';
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
      cepHelp.textContent = 'Endereço preenchido automaticamente.';

      // calcula frete após CEP válido
      const subtotal = cart.subtotal();
      const frete = currentFrete(subtotal);
      freteValueEl.textContent = formatCurrency(frete);
      cartTotalEl.textContent = formatCurrency(subtotal + frete);
    }
  } catch (err) {
    cepHelp.textContent = 'Erro ao buscar CEP. Preencha manualmente.';
  }
}

/* ===== Toast ===== */
function showToast(message, type = 'success') {
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Código para mostrar toast de sucesso ao enviar o formulário
document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('contactForm');
  const toast = document.getElementById('toast');

  if (!form || !toast) return;

  function showToast(message, { type = 'success', duration = 3500 } = {}) {
    toast.textContent = message;
    toast.classList.remove('error', 'show');
    if (type === 'error') toast.classList.add('error');
    toast.classList.add('show');

    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

    // remover depois do tempo
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show', 'error');
      toast.textContent = '';
    }, duration);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    showToast('Mensagem enviada com sucesso! Entraremos em contato em breve.');
    form.reset();

  });
});

/* Expose */
window.app = { cart, PRODUCTS };
