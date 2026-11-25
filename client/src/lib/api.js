const BASE = import.meta.env.VITE_API_URL || '';
const ADMIN_KEY = 'tienda-hn-admin-token';

let tokenGetter = async () => null;
export const setTokenGetter = (fn) => {
  tokenGetter = fn;
};

// Sesión del panel /admin (contraseña simple)
export const adminToken = {
  get: () => {
    try {
      return localStorage.getItem(ADMIN_KEY);
    } catch {
      return null;
    }
  },
  set: (t) => {
    try {
      localStorage.setItem(ADMIN_KEY, t);
    } catch {
      /* ignorar */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(ADMIN_KEY);
    } catch {
      /* ignorar */
    }
  },
};

async function request(path, { method = 'GET', body, params } = {}) {
  const url = new URL(`${BASE}/api${path}`, window.location.origin);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });

  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  const token = await tokenGetter();
  if (token) headers.Authorization = `Bearer ${token}`;
  const adm = adminToken.get();
  if (adm) headers['x-admin-token'] = adm;

  let res;
  try {
    res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('No hay conexión con el servidor');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || 'Ocurrió un error'), { status: res.status });
  return data;
}

// Las imágenes subidas desde el admin se guardan como /api/media/ID; esto las convierte en URL completa
export const mediaUrl = (src) => (!src ? '' : src.startsWith('/api/') ? `${BASE}${src}` : src);

const save = (base, id, body) =>
  id ? request(`${base}/${id}`, { method: 'PUT', body }) : request(base, { method: 'POST', body });

export const api = {
  // Tienda
  products: (params) => request('/products', { params }),
  product: (slug) => request(`/products/${slug}`),
  productCategories: () => request('/products/categories'),
  categories: () => request('/categories'),
  banners: () => request('/banners'),
  siteConfig: () => request('/site-config'),
  popups: () => request('/popups'),
  quote: (body) => request('/orders/quote', { method: 'POST', body }),
  createOrder: (body) => request('/orders', { method: 'POST', body }),
  reviews: (productId) => request(`/reviews/product/${productId}`),
  addReview: (body) => request('/reviews', { method: 'POST', body }),

  // Rastreo
  lookup: (body) => request('/tracking/lookup', { method: 'POST', body }),
  trackLink: (code, t) => request('/tracking/link', { params: { code, t } }),
  myOrders: () => request('/tracking/mine'),

  // Cuenta (Google)
  syncUser: (body) => request('/auth/sync', { method: 'POST', body }),
  googleLogin: (body) => request('/auth/google', { method: 'POST', body }),
  me: () => request('/me'),
  saveAddresses: (addresses) => request('/me/addresses', { method: 'PUT', body: { addresses } }),
  wallet: () => request('/me/wallet'),
  claim: (body) => request('/me/claim', { method: 'POST', body }),

  // Admin
  admin: {
    // Sube una imagen (Blob) y devuelve { id, url }
    uploadImage: async (blob, name = '') => {
      const headers = { 'Content-Type': blob.type };
      const token = await tokenGetter();
      if (token) headers.Authorization = `Bearer ${token}`;
      const adm = adminToken.get();
      if (adm) headers['x-admin-token'] = adm;
      let res;
      try {
        res = await fetch(`${BASE}/api/media?name=${encodeURIComponent(name)}`, { method: 'POST', headers, body: blob });
      } catch {
        throw new Error('No hay conexión con el servidor');
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(data.message || 'No se pudo subir la imagen'), { status: res.status });
      return data;
    },
    // Con correo → cuenta del equipo; sin correo → clave maestra
    login: (email, password) => request('/admin/login', { method: 'POST', body: { email: email || undefined, password } }),
    me: () => request('/admin/me'),
    staff: () => request('/admin/staff'),
    saveStaff: (id, body) => (id ? request(`/admin/staff/${id}`, { method: 'PUT', body }) : request('/admin/staff', { method: 'POST', body })),
    deleteStaff: (id) => request(`/admin/staff/${id}`, { method: 'DELETE' }),
    popups: () => request('/popups/admin/all'),
    savePopup: (id, body) => save('/popups', id, body),
    deletePopup: (id) => request(`/popups/${id}`, { method: 'DELETE' }),
    stats: (days) => request('/admin/stats', { params: { days } }),
    products: (params) => request('/products/admin/list', { params }),
    saveProduct: (id, body) => save('/products', id, body),
    deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
    orders: (params) => request('/orders', { params }),
    setOrderStatus: (id, body) => request(`/orders/${id}/status`, { method: 'PATCH', body }),
    addOrderNote: (id, body) => request(`/orders/${id}/note`, { method: 'PATCH', body }),
    coupons: () => request('/coupons'),
    saveCoupon: (id, body) => save('/coupons', id, body),
    deleteCoupon: (id) => request(`/coupons/${id}`, { method: 'DELETE' }),
    banners: () => request('/banners/admin/all'),
    saveBanner: (id, body) => save('/banners', id, body),
    deleteBanner: (id) => request(`/banners/${id}`, { method: 'DELETE' }),
    categories: () => request('/categories/admin/all'),
    saveCategory: (id, body) => save('/categories', id, body),
    deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
    siteConfig: () => request('/site-config/admin'),
    saveSiteConfig: (body) => request('/site-config', { method: 'PUT', body }),
  },
};
