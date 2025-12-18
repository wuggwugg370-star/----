import './styles/main.css';
import { getMenu, submitOrder, adminLogin, saveItem } from './api.js';

const state = {
  menu: {},
  cart: {},
  activeCategory: 'All',
  isAdmin: false
};

async function init() {
  await loadData();
  setupEventListeners();
  // 恢复登录状态
  if(sessionStorage.getItem('isAdmin') === 'true') enableAdmin();
}

async function loadData() {
  const loading = document.getElementById('loading');
  try {
    state.menu = await getMenu();
    renderCategories();
    renderMenu();
  } catch (err) {
    if(loading) loading.innerText = 'Service Unavailable';
  } finally {
    if(loading) loading.style.display = 'none';
  }
}

function renderCategories() {
  const categories = new Set(['All']);
  Object.values(state.menu).forEach(item => categories.add(item.category || '其他'));
  
  const bar = document.getElementById('category-bar');
  bar.innerHTML = '';
  
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `cat-btn ${cat === state.activeCategory ? 'active' : ''}`;
    btn.innerText = cat;
    btn.onclick = () => {
      state.activeCategory = cat;
      renderCategories(); // 刷新高亮
      filterMenu();
    };
    bar.appendChild(btn);
  });
}

function renderMenu() {
  const grid = document.getElementById('menu-grid');
  grid.innerHTML = '';
  
  Object.entries(state.menu).forEach(([name, info]) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.category = info.category || '其他';
    card.dataset.name = name;
    
    // 管理员才显示的编辑按钮
    const editBtn = state.isAdmin 
      ? `<button class="edit-btn" style="position:absolute;top:10px;right:10px;z-index:10;background:white;border:none;border-radius:10px;padding:5px;">✏️ Edit</button>` 
      : '';

    card.innerHTML = `
      <div class="card-img" style="background-image: url('${info.image || ''}'); position:relative;">${editBtn}</div>
      <div class="card-content">
        <div class="card-tag">${info.category}</div>
        <div class="card-title">${name}</div>
        <div class="card-price">¥${info.price}</div>
        <button class="btn add-btn">Add</button>
      </div>
    `;

    card.querySelector('.add-btn').onclick = () => addToCart(name);
    
    if(state.isAdmin) {
      card.querySelector('.edit-btn').onclick = () => openModal(name, info);
    }
    
    grid.appendChild(card);
  });
  filterMenu();
}

function filterMenu() {
  const grid = document.getElementById('menu-grid');
  const search = document.getElementById('global-search').value.toLowerCase();
  
  Array.from(grid.children).forEach(card => {
    const name = card.dataset.name.toLowerCase();
    const cat = card.dataset.category;
    const matchCat = state.activeCategory === 'All' || cat === state.activeCategory;
    const matchSearch = name.includes(search);
    
    card.style.display = (matchCat && matchSearch) ? 'flex' : 'none';
  });
}

// --- 管理员功能 ---
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

// 模态框逻辑
const modal = document.getElementById('item-modal');
function openModal(name = '', info = {}) {
  modal.style.display = 'flex';
  document.getElementById('input-name').value = name;
  document.getElementById('input-name').disabled = !!name; // 编辑时不允许改名(作为ID)
  document.getElementById('input-price').value = info.price || '';
  document.getElementById('input-category').value = info.category || '';
  document.getElementById('input-image').value = info.image || '';
  document.getElementById('modal-title').innerText = name ? 'Edit Item' : 'Add New Item';
}

// --- 事件监听 ---
function setupEventListeners() {
  // 搜索
  document.getElementById('search-trigger').onclick = () => document.getElementById('search-overlay').classList.add('active');
  document.getElementById('close-search').onclick = () => document.getElementById('search-overlay').classList.remove('active');
  document.getElementById('global-search').oninput = filterMenu;

  // 购物车
  const toggleCart = (open) => {
    const cl = document.getElementById('cart-drawer').classList;
    const bd = document.getElementById('drawer-backdrop').classList;
    open ? (cl.add('open'), bd.add('open')) : (cl.remove('open'), bd.remove('open'));
  };
  document.getElementById('cart-toggle-btn').onclick = () => toggleCart(true);
  document.getElementById('close-drawer').onclick = () => toggleCart(false);
  document.getElementById('drawer-backdrop').onclick = () => toggleCart(false);
  
  // 结账
  document.getElementById('checkout-btn').onclick = async () => {
    const items = Object.entries(state.cart).flatMap(([n, c]) => Array(c).fill(n));
    await submitOrder(items);
    state.cart = {}; updateCartUI();
    toggleCart(false);
    document.getElementById('success-modal').classList.add('show');
  };
  document.getElementById('success-close-btn').onclick = () => document.getElementById('success-modal').classList.remove('show');

  // 管理员
  document.getElementById('admin-login-btn').onclick = async () => {
    const pwd = prompt("Enter Password:");
    if(pwd) {
        try { await adminLogin(pwd); enableAdmin(); } catch(e) { alert("Wrong Password"); }
    }
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
}

// 购物车UI更新 (简化版)
function addToCart(name) {
  state.cart[name] = (state.cart[name] || 0) + 1;
  updateCartUI();
}
function updateCartUI() {
  const container = document.getElementById('cart-items');
  container.innerHTML = '';
  let total = 0, count = 0;
  Object.entries(state.cart).forEach(([name, qty]) => {
    const info = state.menu[name];
    if(info) {
        total += info.price * qty;
        count += qty;
        const div = document.createElement('div');
        div.innerText = `${name} x${qty} = ¥${(info.price * qty).toFixed(2)}`;
        container.appendChild(div);
    }
  });
  document.getElementById('drawer-total-price').innerText = '¥' + total.toFixed(2);
  document.getElementById('cart-badge').innerText = count;
  document.getElementById('checkout-btn').disabled = count === 0;
}

init();