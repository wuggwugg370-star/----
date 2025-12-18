const API_BASE = '/api';

export async function getMenu() {
  const res = await fetch(`${API_BASE}/menu`);
  if (!res.ok) throw new Error('Failed to fetch menu');
  const json = await res.json();
  return json.data;
}

export async function submitOrder(items) {
  const res = await fetch(`${API_BASE}/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.msg || 'Order failed');
  return json;
}

export async function updateImage(name, url) {
  const res = await fetch(`${API_BASE}/admin/menu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, image: url })
  });
  if (!res.ok) throw new Error('Update failed');
  return await res.json();
}