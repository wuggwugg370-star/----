const API_BASE = '/api';

// 通用请求处理
async function request(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, options);
  const json = await res.json();
  if (json.code !== 200) throw new Error(json.msg || 'Error');
  return json.data || json;
}

// === 核心接口 ===
export const getMenu = () => request('/menu');

export const submitOrder = (items) => request('/order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ items })
});

// === 管理员接口 (你之前缺少的！) ===
export const adminLogin = (password) => request('/admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password })
});

export const saveItem = (itemData) => request('/admin/item', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(itemData)
});