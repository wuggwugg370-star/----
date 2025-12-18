import './styles/main.css';
import { getMenu, submitOrder, adminLogin, saveItem } from './api.js';

// === 全局状态 ===
const state = {
  menu: {},
  cart: {},
  activeCategory: 'All',
  isAdmin: false
};

// === 1. 初始化入口 (入口函数) ===
async function init() {
  console.log('🚀 系统正在启动...');
  
  // 1.1 绑定事件 (先绑定，防止按钮无反应)
  setupEventListeners();

  // 1.2 恢复登录状态
  if(sessionStorage.getItem('isAdmin') === 'true') {
    enableAdminMode();
  }

  // 1.3 加载数据
  await loadMenuData();
}

// === 2. 数据加载 ===
async function loadMenuData() {
  const loading = document.getElementById('loading');
  try {
    state.menu = await getMenu();
    console.log('✅ 菜单加载成功:', Object.keys(state.menu).length, '个菜品');
    
    renderCategories();
    renderMenu();
  } catch (err) {
    console.error('❌ 无法加载菜单:', err);
    if(loading) loading.innerText = '无法连接服务器，请检查后端是否启动';
    alert("连接失败：\n请确认黑窗口 (Python) 是否正在运行！");
  } finally {
    if(loading) loading.style.display = 'none';
  }
}

// === 3. 渲染逻辑 ===
function renderCategories() {
  const categories = new Set(['All']);
  Object.values(state.menu).forEach(item => categories.add(item.category || '其他'));
  
  const bar = document.getElementById('category-bar');
  if (!bar) return; // 防御性检查
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
  if (!grid) return;
  grid.innerHTML = '';
  
  const items = Object.entries(state.menu);
  if (items.length === 0) {
    grid.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">暂无菜品<br>请管理员添加</div>';
    return;
  }

  items.forEach(([name, info]) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.category = info.category || '其他';
    card.dataset.name = name;
    
    // 管理员编辑按钮
    const editBtn = state.isAdmin 
      ? `<button class="edit-btn" style="position:absolute;top:10px;right:10px;z-index:10;background:white;padding:5px 10px;border-radius:15px;border:none;box-shadow:0 2px 5px rgba(0,0,0,0.2);cursor:pointer;">✏️ 编辑</button>` 
      : '';

    // 图片容错
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

// 搜索筛选
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

// === 4. 购物车逻辑 ===
function addToCart(name) {
  state.cart[name] = (state.cart[name] || 0) + 1;
  updateCartUI();
  
  // 购物车图标动画
  const btn = document.getElementById('cart-toggle-btn');
  if(btn) {
    btn.style.transform = 'scale(1.2)';
    setTimeout(() => btn.style.transform = 'scale(1)', 200);
  }
}

function updateCartUI() {
  const container = document.getElementById('cart-items');
  if(!container) return;
  container.innerHTML = '';
  
  let total = 0;
  let count = 0;
  
  Object.entries(state.cart).forEach(([name, qty]) => {
    const info = state.menu[name];
    if(info) {
      total += info.price * qty;
      count += qty;
      
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #eee;';
      row.innerHTML = `
        <span>${name} <small>x${qty}</small></span>
        <b>¥${(info.price * qty).toFixed(2)}</b>
      `;
      container.appendChild(row);
    }
  });

  safeSetText('drawer-total-price', `¥${total.toFixed(2)}`);
  safeSetText('cart-badge', count);
  
  const checkoutBtn = document.getElementById('checkout-btn');
  if(checkoutBtn) checkoutBtn.disabled = (count === 0);
}

// === 5. 管理员与交互逻辑 ===
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
  if(nameInput) nameInput.disabled = !!name; // 编辑模式禁止改名
  
  safeSetValue('input-price', info.price || '');
  safeSetValue('input-category', info.category || '');
  safeSetValue('input-image', info.image || '');
  safeSetText('modal-title', name ? '编辑菜品' : '添加新菜品');
}

// === 6. 事件监听 (核心修复部分) ===
function setupEventListeners() {
  console.log('🔧 正在绑定按钮事件...');

  // 辅助函数：安全绑定
  const bind = (id, event, handler) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener(event, handler);
    } else {
      console.warn(`⚠️警告: 找不到元素 #${id}，该功能可能无法使用`);
    }
  };

  // 管理员登录
  bind('admin-login-btn', 'click', async () => {
    const pwd = prompt("请输入管理员密码 (演示密码: admin123):");
    if (!pwd) return;
    try {
      await adminLogin(pwd);
      alert("登录成功！");
      enableAdminMode();
    } catch (e) {
      alert("密码错误！");
    }
  });

  // 退出登录
  bind('logout-btn', 'click', disableAdminMode);

  // 搜索功能 (点击图标和输入文字)
  bind('search-trigger', 'click', () => {
    const overlay = document.getElementById('search-overlay');
    if(overlay) overlay.classList.add('active');
    setTimeout(() => {
        const input = document.getElementById('global-search');
        if(input) input.focus();
    }, 100);
  });
  bind('close-search', 'click', () => {
    const overlay = document.getElementById('search-overlay');
    if(overlay) overlay.classList.remove('active');
  });
  bind('global-search', 'input', filterMenu);

  // 购物车抽屉
  const toggleDrawer = (open) => {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    if (open) {
      if(drawer) drawer.classList.add('open');
      if(backdrop) backdrop.classList.add('open');
    } else {
      if(drawer) drawer.classList.remove('open');
      if(backdrop) backdrop.classList.remove('open');
    }
  };
  bind('cart-toggle-btn', 'click', () => toggleDrawer(true));
  bind('close-drawer', 'click', () => toggleDrawer(false));
  bind('drawer-backdrop', 'click', () => toggleDrawer(false));

  // 结账
  bind('checkout-btn', 'click', async () => {
    const items = Object.entries(state.cart).flatMap(([n, c]) => Array(c).fill(n));
    await submitOrder(items);
    state.cart = {};
    updateCartUI();
    toggleDrawer(false);
    const successModal = document.getElementById('success-modal');
    if(successModal) successModal.classList.add('show');
  });
  bind('success-close-btn', 'click', () => {
    const successModal = document.getElementById('success-modal');
    if(successModal) successModal.classList.remove('show');
  });

  // 添加/保存菜品
  bind('add-item-btn', 'click', () => openModal());
  bind('modal-cancel', 'click', () => safeDisplay('item-modal', 'none'));
  
  const form = document.getElementById('item-form');
  if (form) {
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
      await loadMenuData(); // 重新加载
    };
  }
}

// === 工具函数 ===
function safeDisplay(id, display) {
  const el = document.getElementById(id);
  if(el) el.style.display = display;
}
function safeSetText(id, text) {
  const el = document.getElementById(id);
  if(el) el.innerText = text;
}
function safeSetValue(id, val) {
  const el = document.getElementById(id);
  if(el) el.value = val;
}

// === 启动应用 ===
// 使用 DOMContentLoaded 确保 HTML 加载完后再执行 JS
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}