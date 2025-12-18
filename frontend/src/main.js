import './styles/main.css';
import { getMenu, submitOrder, adminLogin, saveItem } from './api.js';

// === 🚨 诊断代码 ===
window.onerror = function(msg, url, line) {
  alert("❌ JS执行出错:\n" + msg + "\n\n行号: " + line);
};
console.log('🚀 前端代码开始运行...');
// ===================

const state = {
  menu: {},
  cart: {},
  activeCategory: 'All',
  isAdmin: false
};

async function init() {
  const loading = document.getElementById('loading');
  try {
    console.log('📡 正在请求菜单...');
    state.menu = await getMenu();
    console.log('✅ 菜单获取成功:', state.menu);

    renderCategories();
    renderMenu();
    
    if(sessionStorage.getItem('isAdmin') === 'true') enableAdmin();

  } catch (err) {
    console.error(err);
    alert("⚠️ 后端连接失败！\n请确认黑窗口是否在运行 'python app.py'\n\n错误: " + err.message);
    if(loading) loading.innerText = '服务不可用';
  } finally {
    if(loading) loading.style.display = 'none';
  }
}

function renderCategories() {
  const categories = new Set(['All']);
  Object.values(state.menu).forEach(item => categories.add(item.category || '其他'));
  
  const bar = document.getElementById('category-bar');
  if(!bar) return;
  bar.innerHTML = '';
  
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `cat-btn ${cat === state.activeCategory ? 'active' : ''}`;
    btn.innerText = cat;
    btn.onclick = () => {
      state.activeCategory = cat;
      renderCategories();
      filterMenu();
    };
    bar.appendChild(btn);
  });
}

function renderMenu() {
  const grid = document.getElementById('menu-grid');
  if(!grid) return;
  grid.innerHTML = '';
  
  const items = Object.entries(state.menu);
  if (items.length === 0) {
    grid.innerHTML = '<div style="padding:20px;">暂无菜品</div>';
    return;
  }

  items.forEach(([name, info]) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.category = info.category || '其他';
    card.dataset.name = name;
    
    const editBtn = state.isAdmin 
      ? `<button class="edit-btn" style="position:absolute;top:10px;right:10px;z-index:10;background:white;padding:5px;cursor:pointer;">✏️ 编辑</button>` 
      : '';

    const imgUrl = info.image || 'https://via.placeholder.com/300x200?text=No+Image';

    card.innerHTML = `
      <div class="card-img" style="background-image: url('${imgUrl}'); position:relative;">${editBtn}</div>
      <div class="card-content">
        <div class="card-tag">${info.category}</div>
        <div class="card-title">${name}</div>
        <div class="card-price">¥${Number(info.price).toFixed(2)}</div>
        <button class="btn add-btn">加入购物车</button>
      </div>
    `;

    card.querySelector('.add-btn').onclick = () => addToCart(name);
    
    if(state.isAdmin) {
      card.querySelector('.edit-btn').onclick = (e) => {
        e.stopPropagation();
        openModal(name, info);
      };
    }
    
    grid.appendChild(card);
  });
  filterMenu();
}

function filterMenu() {
  const grid = document.getElementById('menu-grid');
  if(!grid) return;
  const search = (document.getElementById('global-search').value || '').toLowerCase();
  
  Array.from(grid.children).forEach(card => {
    if(!card.dataset.name) return;
    const name = card.dataset.name.toLowerCase();
    const cat = card.dataset.category;
    const matchCat = state.activeCategory === 'All' || cat === state.activeCategory;
    const matchSearch = name.includes(search);
    card.style.display = (matchCat && matchSearch) ? 'flex' : 'none';
  });
}

function enableAdmin() {
  state.isAdmin = true;
  document.getElementById('admin-toolbar').style.display = 'flex';
  document.getElementById('admin-login-btn').style.display = 'none';
  sessionStorage.setItem('isAdmin', 'true');
  renderMenu();
}

function disableAdmin() {
  state.isAdmin = false;
  document.getElementById('admin-toolbar').style.display = 'none';
  document.getElementById('admin-login-btn').style.display = 'block';
  sessionStorage.removeItem('isAdmin');
  renderMenu();
}

const modal = document.getElementById('item-modal');
function openModal(name = '', info = {}) {
  modal.style.display = 'flex';
  document.getElementById('input-name').value = name;
  document.getElementById('input-name').disabled = !!name;
  document.getElementById('input-price').value = info.price || '';
  document.getElementById('input-category').value = info.category || '';
  document.getElementById('input-image').value = info.image || '';
  document.getElementById('modal-title').innerText = name ? '编辑' : '新增';
}

function addToCart(name) {
  state.cart[name] = (state.cart[name] || 0) + 1;
  updateCartUI();
}

function updateCartUI() {
  const container = document.getElementById('cart-items');
  if(!container) return;
  container.innerHTML = '';
  let total = 0, count = 0;
  Object.entries(state.cart).forEach(([name, qty]) => {
    const info = state.menu[name];
    if(info) {
        total += info.price * qty;
        count += qty;
        const div = document.createElement('div');
        div.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:8px;';
        div.innerHTML = `<span>${name} x${qty}</span> <span>¥${(info.price*qty).toFixed(2)}</span>`;
        container.appendChild(div);
    }
  });
  document.getElementById('drawer-total-price').innerText = '¥' + total.toFixed(2);
  document.getElementById('cart-badge').innerText = count;
  document.getElementById('checkout-btn').disabled = count === 0;
}

function setupEventListeners() {
  document.getElementById('admin-login-btn').onclick = async () => {
    const pwd = prompt("请输入密码:");
    if(pwd) { try { await adminLogin(pwd); enableAdmin(); } catch(e) { alert("密码错误"); } }
  };
  document.getElementById('logout-btn').onclick = disableAdmin;
  document.getElementById('add-item-btn').onclick = () => openModal();
  document.getElementById('modal-cancel').onclick = () => modal.style.display = 'none';
  
  document.getElementById('item-form').onsubmit = async (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('input-name').value,
      price: document.getElementById('input-price').value,
      category: document.getElementById('input-category').value,
      image: document.getElementById('input-image').value
    };
    await saveItem(data);
    modal.style.display = 'none';
    loadData();
  };

  document.getElementById('search-trigger').onclick = () => document.getElementById('search-overlay').classList.add('active');
  document.getElementById('close-search').onclick = () => document.getElementById('search-overlay').classList.remove('active');
  document.getElementById('global-search').oninput = filterMenu;

  const toggleCart = (open) => {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    if(open) { drawer.classList.add('open'); backdrop.classList.add('open'); }
    else { drawer.classList.remove('open'); backdrop.classList.remove('open'); }
  };
  document.getElementById('cart-toggle-btn').onclick = () => toggleCart(true);
  document.getElementById('close-drawer').onclick = () => toggleCart(false);
  document.getElementById('drawer-backdrop').onclick = () => toggleCart(false);

  document.getElementById('checkout-btn').onclick = async () => {
    const items = Object.entries(state.cart).flatMap(([n, c]) => Array(c).fill(n));
    await submitOrder(items);
    state.cart = {}; updateCartUI();
    toggleCart(false);
    document.getElementById('success-modal').classList.add('show');
  };
  document.getElementById('success-close-btn').onclick = () => document.getElementById('success-modal').classList.remove('show');
}

async function loadData() {
  try {
    state.menu = await getMenu();
    renderCategories();
    renderMenu();
  } catch (err) { console.error(err); }
}

init();