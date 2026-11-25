// Roles y permisos del panel. Para agregar un rol nuevo: añádelo a ROLES y a los permisos que le correspondan.
export const ROLES = {
  admin: 'Administrador',
  seller: 'Vendedor',
  dispatcher: 'Despachador',
  inventory: 'Inventario / Proveedor', // reservado: listo para usarse, sin cuentas por defecto
};

export const PERMISSIONS = {
  'stats:view': ['admin', 'seller'],
  'orders:read': ['admin', 'seller', 'dispatcher'],
  'orders:status': ['admin', 'seller', 'dispatcher'], // qué estados puede aplicar cada rol: ver STATUS_BY_ROLE
  'orders:note': ['admin', 'seller', 'dispatcher'],
  'products:read': ['admin', 'seller', 'inventory'],
  'products:write': ['admin', 'inventory'],
  'suppliers:read': ['admin', 'inventory'], // costos y datos de proveedor
  'categories:read': ['admin', 'inventory'],
  'categories:write': ['admin', 'inventory'],
  'coupons:manage': ['admin'],
  'banners:manage': ['admin'],
  'popups:manage': ['admin'],
  'settings:manage': ['admin'],
  'media:upload': ['admin'],
  'staff:manage': ['admin'],
};

// Vendedor: confirma con el cliente, prepara y cancela. Despachador: prepara, envía y entrega.
export const STATUS_BY_ROLE = {
  admin: ['Pendiente', 'Confirmado por WhatsApp', 'Preparando', 'Enviado', 'Entregado', 'Cancelado'],
  seller: ['Confirmado por WhatsApp', 'Preparando', 'Cancelado'],
  dispatcher: ['Preparando', 'Enviado', 'Entregado'],
  inventory: [],
};

export const can = (role, perm) => !perm || (PERMISSIONS[perm] || []).includes(role);
export const permsOf = (role) => Object.keys(PERMISSIONS).filter((p) => PERMISSIONS[p].includes(role));
export const canSetStatus = (role, status) => (STATUS_BY_ROLE[role] || []).includes(status);
