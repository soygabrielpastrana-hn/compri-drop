import { useEffect, useState } from 'react';
import { Boxes, Building2, ClipboardList, FolderTree, Image, LayoutDashboard, Settings, Ticket } from 'lucide-react';
import { adminToken, api } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import AdminLogin from './AdminLogin.jsx';
import AdminLayout from './AdminLayout.jsx';
import DashboardTab from './DashboardTab.jsx';
import SuppliersTab from './SuppliersTab.jsx';
import OrdersTab from './OrdersTab.jsx';
import ProductsTab from './ProductsTab.jsx';
import CategoriesTab from './CategoriesTab.jsx';
import CouponsTab from './CouponsTab.jsx';
import BannersTab from './BannersTab.jsx';
import SettingsTab from './SettingsTab.jsx';

const NAV = [
  {
    group: 'Principal',
    items: [
      ['dashboard', 'Dashboard', LayoutDashboard],
      ['proveedores', 'Proveedores', Building2],
      ['pedidos', 'Pedidos', ClipboardList],
      ['inventario', 'Inventario', Boxes], // productos, variantes y stock
    ],
  },
  {
    group: 'Tienda',
    items: [
      ['categorias', 'Categorías', FolderTree],
      ['cupones', 'Cupones', Ticket],
      ['banners', 'Banners', Image],
      ['config', 'Configuración', Settings],
    ],
  },
];

export default function AdminApp() {
  const { profile } = useAuth();
  const [token, setToken] = useState(adminToken.get());
  const [tab, setTab] = useState('dashboard');
  const [ordersQuery, setOrdersQuery] = useState({ q: '', n: 0 });
  const [pending, setPending] = useState(0);
  const authorized = Boolean(token) || Boolean(profile?.isAdmin);

  useEffect(() => {
    document.title = 'Admin | Yo lo Quiero HN';
  }, []);

  const logout = () => {
    adminToken.clear();
    setToken(null);
  };

  // Si el servidor responde 401/403 (sesión vencida), vuelve al login
  const guard = (promise) =>
    promise.catch((err) => {
      if (err.status === 401 || err.status === 403) logout();
      throw err;
    });

  // Número de pedidos pendientes (insignia del menú y de la campana)
  useEffect(() => {
    if (!authorized) return;
    guard(api.admin.stats(7))
      .then((s) => setPending(s.byStatus.find((r) => r.status === 'Pendiente')?.count || 0))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, authorized]);

  if (!authorized) {
    return (
      <AdminLogin
        onLogin={(t) => {
          adminToken.set(t);
          setToken(t);
        }}
      />
    );
  }

  // Ir a una pestaña; hacia Pedidos puede llevar una búsqueda (código, teléfono o nombre)
  const go = (t, q) => {
    if (t === 'pedidos') setOrdersQuery({ q: q || '', n: Date.now() });
    setTab(t);
  };
  const title = NAV.flatMap((g) => g.items).find((i) => i[0] === tab)?.[1] || 'Admin';

  return (
    <AdminLayout
      nav={NAV}
      tab={tab}
      title={title}
      pending={pending}
      adminName={profile?.name || 'Administrador'}
      onNavigate={go}
      onSearch={(q) => go('pedidos', q)}
      onLogout={logout}
    >
      {tab === 'dashboard' && <DashboardTab guard={guard} go={go} />}
      {tab === 'proveedores' && <SuppliersTab guard={guard} />}
      {tab === 'pedidos' && <OrdersTab key={ordersQuery.n} guard={guard} initialQuery={ordersQuery.q} />}
      {tab === 'inventario' && <ProductsTab guard={guard} />}
      {tab === 'categorias' && <CategoriesTab guard={guard} />}
      {tab === 'cupones' && <CouponsTab guard={guard} />}
      {tab === 'banners' && <BannersTab guard={guard} />}
      {tab === 'config' && <SettingsTab guard={guard} />}
    </AdminLayout>
  );
}
