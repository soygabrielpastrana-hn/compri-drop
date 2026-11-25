import { useEffect, useMemo, useState } from 'react';
import { Boxes, Building2, ClipboardList, FolderTree, Image, LayoutDashboard, Megaphone, Settings, Ticket, Users } from 'lucide-react';
import { adminToken, api } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Spinner from '../../components/Spinner.jsx';
import AdminLogin from './AdminLogin.jsx';
import AdminLayout from './AdminLayout.jsx';
import DashboardTab from './DashboardTab.jsx';
import SuppliersTab from './SuppliersTab.jsx';
import OrdersTab from './OrdersTab.jsx';
import ProductsTab from './ProductsTab.jsx';
import CategoriesTab from './CategoriesTab.jsx';
import CouponsTab from './CouponsTab.jsx';
import BannersTab from './BannersTab.jsx';
import PopupsTab from './PopupsTab.jsx';
import StaffTab from './StaffTab.jsx';
import SettingsTab from './SettingsTab.jsx';

// [id, etiqueta, ícono, permiso requerido]. El servidor valida los mismos permisos; esto solo arma el menú.
const NAV = [
  {
    group: 'Principal',
    items: [
      ['dashboard', 'Dashboard', LayoutDashboard, 'stats:view'],
      ['proveedores', 'Proveedores', Building2, 'suppliers:read'],
      ['pedidos', 'Pedidos', ClipboardList, 'orders:read'],
      ['inventario', 'Inventario', Boxes, 'products:read'],
    ],
  },
  {
    group: 'Tienda',
    items: [
      ['categorias', 'Categorías', FolderTree, 'categories:write'],
      ['cupones', 'Cupones', Ticket, 'coupons:manage'],
      ['banners', 'Banners', Image, 'banners:manage'],
      ['popups', 'Popups', Megaphone, 'popups:manage'],
      ['config', 'Configuración', Settings, 'settings:manage'],
    ],
  },
  { group: 'Equipo', items: [['equipo', 'Usuarios y roles', Users, 'staff:manage']] },
];

export default function AdminApp() {
  const { profile } = useAuth();
  const [token, setToken] = useState(adminToken.get());
  const [me, setMe] = useState(null); // { name, role, roleLabel, permissions }
  const [tab, setTab] = useState('dashboard');
  const [ordersQuery, setOrdersQuery] = useState({ q: '', n: 0 });
  const [pending, setPending] = useState(0);
  const authorized = Boolean(token) || Boolean(profile?.isAdmin);

  useEffect(() => {
    document.title = 'Admin | Compri';
  }, []);

  const logout = () => {
    adminToken.clear();
    setToken(null);
    setMe(null);
  };

  // 401 = sesión vencida → login. 403 = falta de permiso: NO cierra la sesión.
  const guard = (promise) =>
    promise.catch((err) => {
      if (err.status === 401) logout();
      throw err;
    });

  // Quién soy y qué puedo hacer
  useEffect(() => {
    if (!authorized) return;
    guard(api.admin.me()).then(setMe).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized, token]);

  const can = (perm) => Boolean(me?.permissions.includes(perm));

  const nav = useMemo(
    () => (me ? NAV.map((g) => ({ ...g, items: g.items.filter((i) => me.permissions.includes(i[3])) })).filter((g) => g.items.length) : []),
    [me]
  );

  // Si la pestaña actual no está permitida para este rol, abre la primera que sí
  useEffect(() => {
    const allowed = nav.flatMap((g) => g.items.map((i) => i[0]));
    if (allowed.length && !allowed.includes(tab)) setTab(allowed[0]);
  }, [nav, tab]);

  // Insignia del menú: Despachador = pedidos en "Preparando"; los demás = "Pendiente"
  useEffect(() => {
    if (!me || !can('orders:read')) return;
    const status = me.role === 'dispatcher' ? 'Preparando' : 'Pendiente';
    guard(api.admin.orders({ status, limit: 1 })).then((r) => setPending(r.total)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, tab]);

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
  if (!me) return <div className="grid min-h-screen place-items-center bg-slate-100"><Spinner /></div>;

  const go = (t, q) => {
    if (t === 'pedidos') setOrdersQuery({ q: q || '', n: Date.now() });
    setTab(t);
  };
  const title = nav.flatMap((g) => g.items).find((i) => i[0] === tab)?.[1] || 'Admin';

  return (
    <AdminLayout
      nav={nav}
      tab={tab}
      title={title}
      pending={pending}
      adminName={me.name || profile?.name || 'Equipo'}
      roleLabel={me.roleLabel}
      onNavigate={go}
      onSearch={(q) => go('pedidos', q)}
      onLogout={logout}
    >
      {tab === 'dashboard' && <DashboardTab guard={guard} go={go} can={can} />}
      {tab === 'proveedores' && <SuppliersTab guard={guard} />}
      {tab === 'pedidos' && <OrdersTab key={ordersQuery.n} guard={guard} initialQuery={ordersQuery.q} />}
      {tab === 'inventario' && <ProductsTab guard={guard} canWrite={can('products:write')} />}
      {tab === 'categorias' && <CategoriesTab guard={guard} />}
      {tab === 'cupones' && <CouponsTab guard={guard} />}
      {tab === 'banners' && <BannersTab guard={guard} />}
      {tab === 'popups' && <PopupsTab guard={guard} />}
      {tab === 'config' && <SettingsTab guard={guard} />}
      {tab === 'equipo' && <StaffTab guard={guard} />}
    </AdminLayout>
  );
}
