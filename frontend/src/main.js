import './styles/main.css';
import { getMenu, submitOrder, adminLogin, saveItem } from './api.js';

// === 全局状态 ===
const state = {
  menu: {},
  cart: {},
  activeCategory: 'All',
  isAdmin: false
};

// === 初始化 ===
async function init() {
  console.log('🚀 系统启动...');
  
  // 1. 先绑定事件 (确保按钮可点击)
  setupEventListeners();

  // 2. 恢复管理员状态
  if(sessionStorage.getItem('isAdmin') === 'true') {
    enableAdminMode();
  }

  // 3. 加载数据
  await loadMenuData();
}

// === 数据加载 ===
async function loadMenuData() {
  const loading = document.getElementById('loading');
  try {
    state.menu = await getMenu();
    console.log('✅ 菜单数据:', state.menu);
    renderCategories();
    renderMenu();
  } catch (err) {
    console.error('❌ 数据加载失败:', err);
    if(loading) loading.innerText = '无法连接服务器';
    alert("连接后端失败，请检查 Python 是否运行！");
  } finally {
    if(loading) loading.style.display = 'none';
  }
}

// === 渲染逻辑 ===
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
    card.dataset.name = name;
    card.dataset.category = info.category || '其他';
    
    const editBtn = state.isAdmin 
      ? `<button class="edit-btn" style="position:absolute;top:10px;right:10px;z-index:10;background:white;padding:5px;cursor:pointer;">✏️ 编辑</button>` 
      : '';

    const imgUrl = (info.image && info.image.startsWith('http')) 
      ? info.image 
      : 'https://via.placeholder.com/300x200?text=No+Image';

    card.innerHTML = `
      <div class="card-img" style="background-image: url('${imgUrl}'); position:relative;">${editBtn}</div>
      <div class="card-content">
        <div class="card-tag">${info.category}</div>
        <div class="card-title">${name}</div>
        <div class="card-price">¥${Number(info.price).toFixed(2)}</div>
        <button class="btn add-btn">加入购物车</button>
      </div>
    `;

    // 绑定事件
    const addBtn = card.querySelector('.add-btn');
    if(addBtn) addBtn.onclick = () => addToCart(name);
    
    if(state.isAdmin) {
      const editBtnEl = card.querySelector('.edit-btn');
      if(editBtnEl) editBtnEl.onclick = (e) => {
        e.stopPropagation();
        openModal(name, info);
      };
    }
    
    grid.appendChild(card);
  });
  filterMenu();
}

function filterMenu() {
  const searchInput = document.getElementById('global-search');
  const grid = document.getElementById('menu-grid');
  if (!grid || !searchInput) return;

  const keyword = searchInput.value.toLowerCase().trim();
  Array.from(grid.children).forEach(card => {
    if(!card.dataset.name) return;
    const name = card.dataset.name.toLowerCase();
    const cat = card.dataset.category;
    const matchCat = state.activeCategory === 'All' || cat === state.activeCategory;
    const matchKey = name.includes(keyword);
    card.style.display = (matchCat && matchKey) ? 'flex' : 'none';
  });
}

// === 购物车 ===
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
      div.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:5px;';
      div.innerHTML = `<span>${name} x${qty}</span> <b>¥${(info.price*qty).toFixed(2)}</b>`;
      container.appendChild(div);
    }
  });

  safeSetText('drawer-total-price', `¥${total.toFixed(2)}`);
  safeSetText('cart-badge', count);
  const checkoutBtn = document.getElementById('checkout-btn');
  if(checkoutBtn) checkoutBtn.disabled = (count === 0);
}

// === 管理员与交互 ===
function enableAdminMode() {
  state.isAdmin = true;
  safeDisplay('admin-toolbar', 'flex');
  safeDisplay('admin-login-btn', 'none');
  sessionStorage.setItem('isAdmin', 'true');
  renderMenu();
}

function disableAdminMode() {
  state.isAdmin = false;
  safeDisplay('admin-toolbar', 'none');
  safeDisplay('admin-login-btn', 'block');
  sessionStorage.removeItem('isAdmin');
  renderMenu();
}

function openModal(name = '', info = {}) {
  safeDisplay('item-modal', 'flex');
  safeSetValue('input-name', name);
  const nameInput = document.getElementById('input-name');
  if(nameInput) nameInput.disabled = !!name; 
  
  safeSetValue('input-price', info.price || '');
  safeSetValue('input-category', info.category || '');
  safeSetValue('input-image', info.image || '');
  safeSetText('modal-title', name ? '编辑菜品' : '添加新菜品');
}

// === 事件监听 (修复版) ===
function setupEventListeners() {
  // 安全绑定辅助函数
  const bind = (id, event, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
    else console.warn(`⚠️ 未找到元素: #${id}`);
  };

  bind('admin-login-btn', 'click', async () => {
    const pwd = prompt("请输入管理员密码 (admin123):");
    if(pwd) {
      try { await adminLogin(pwd); enableAdminMode(); } 
      catch(e) { alert("密码错误"); }
    }
  });

  bind('logout-btn', 'click', disableAdminMode);
  
  // 搜索
  bind('search-trigger', 'click', () => {
    const el = document.getElementById('search-overlay');
    if(el) el.classList.add('active');
  });
  bind('close-search', 'click', () => {
    const el = document.getElementById('search-overlay');
    if(el) el.classList.remove('active');
  });
  bind('global-search', 'input', filterMenu);

  // 购物车开关
  const toggleCart = (open) => {
    const drawer = document.getElementById('cart-drawer');
    const bg = document.getElementById('drawer-backdrop');
    if(open) {
        if(drawer) drawer.classList.add('open');
        if(bg) bg.classList.add('open');
    } else {
        if(drawer) drawer.classList.remove('open');
        if(bg) bg.classList.remove('open');
    }
  };
  bind('cart-toggle-btn', 'click', () => toggleCart(true));
  bind('close-drawer', 'click', () => toggleCart(false));
  bind('drawer-backdrop', 'click', () => toggleCart(false));

  // 结账
  bind('checkout-btn', 'click', async () => {
    const items = Object.entries(state.cart).flatMap(([n, c]) => Array(c).fill(n));
    await submitOrder(items);
    state.cart = {}; updateCartUI();
    toggleCart(false);
    const success = document.getElementById('success-modal');
    if(success) success.classList.add('show');
  });
  bind('success-close-btn', 'click', () => {
    const success = document.getElementById('success-modal');
    if(success) success.classList.remove('show');
  });

  // 添加/保存
  bind('add-item-btn', 'click', () => openModal());
  bind('modal-cancel', 'click', () => safeDisplay('item-modal', 'none'));
  
  const form = document.getElementById('item-form');
  if(form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const data = {
        name: document.getElementById('input-name').value,
        price: document.getElementById('input-price').value,
        category: document.getElementById('input-category').value,
        image: document.getElementById('input-image').value
      };
      await saveItem(data);
      safeDisplay('item-modal', 'none');
      loadMenuData();
    };
  }
}

// 辅助工具
function safeDisplay(id, val) { const el = document.getElementById(id); if(el) el.style.display = val; }
function safeSetText(id, val) { const el = document.getElementById(id); if(el) el.innerText = val; }
function safeSetValue(id, val) { const el = document.getElementById(id); if(el) el.value = val; }

// 启动
init();