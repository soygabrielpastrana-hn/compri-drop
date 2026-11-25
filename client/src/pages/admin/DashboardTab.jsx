import { useEffect, useMemo, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, Boxes, Building2, CircleDollarSign, MessageCircle, PackageCheck } from 'lucide-react';
import { api } from '../../lib/api.js';
import { money } from '../../lib/format.js';
import { useSite } from '../../context/SiteContext.jsx';
import Spinner, { Notice } from '../../components/Spinner.jsx';

const BLUE = '#1B4DDB';
const YELLOW = '#FFC21A';
const TZ = 'America/Tegucigalpa';
const DAY = 86_400_000;
const RANGES = [['7', 'Últimos 7 días'], ['30', 'Últimos 30 días'], ['month', 'Por mes']];
const STATUS_BADGE = {
  'Pendiente': 'bg-amber-100 text-amber-800', 'Confirmado por WhatsApp': 'bg-blue-100 text-blue-800',
  'Preparando': 'bg-indigo-100 text-indigo-800', 'Enviado': 'bg-sky-100 text-sky-800',
  'Entregado': 'bg-green-100 text-green-800', 'Cancelado': 'bg-red-100 text-red-700',
};
const SUPPLIER_TONES = ['bg-brand-50 text-brand-700', 'bg-accent-100 text-accent-800', 'bg-sky-100 text-sky-700', 'bg-slate-200 text-slate-700', 'bg-indigo-100 text-indigo-700'];

const dayKey = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
const shortMoney = (v) => `L ${v >= 1000 ? `${Math.round(v / 100) / 10}k` : v}`;
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const ago = (d) => {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return 'hace un momento';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
};

// Pedidos más recientes primero (~6 meses, máx. 1000). Las gráficas se agrupan aquí, sin tocar el servidor.
async function loadOrders(guard) {
  const limitDay = dayKey(Date.now() - 183 * DAY);
  const all = [];
  let capped = false;
  for (let page = 1; ; page++) {
    const r = await guard(api.admin.orders({ page, limit: 100 }));
    all.push(...r.items);
    const oldest = r.items[r.items.length - 1];
    if (!oldest || dayKey(oldest.createdAt) < limitDay || page >= r.pages) break;
    if (page >= 10) {
      capped = true;
      break;
    }
  }
  return { orders: all, capped };
}

function buildBuckets(range) {
  if (range === 'month') {
    const [y, m] = dayKey(Date.now()).split('-').map(Number);
    return Array.from({ length: 6 }, (_, i) => {
      const idx = y * 12 + (m - 1) - (5 - i);
      const yy = Math.floor(idx / 12);
      const mm = idx % 12;
      return {
        key: `${yy}-${String(mm + 1).padStart(2, '0')}`,
        label: new Date(Date.UTC(yy, mm, 15)).toLocaleDateString('es-HN', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
        total: 0, orders: 0,
      };
    });
  }
  const n = Number(range);
  return Array.from({ length: n }, (_, i) => {
    const key = dayKey(Date.now() - (n - 1 - i) * DAY);
    return { key, label: `${key.slice(8)}/${key.slice(5, 7)}`, total: 0, orders: 0 };
  });
}

// ---------- Piezas visuales ----------
const Card = ({ className = '', children }) => (
  <section className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 ${className}`}>{children}</section>
);

const KPI_TONE = {
  blue: 'bg-brand-50 text-brand-700 ring-brand-100',
  yellow: 'bg-accent-100 text-accent-700 ring-accent-200',
};

const Kpi = ({ icon: Icon, tone, label, value, sub }) => (
  <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 transition hover:shadow-md">
    <span className={`grid size-14 shrink-0 place-items-center rounded-xl ring-1 ${KPI_TONE[tone]}`}><Icon size={26} /></span>
    <div className="min-w-0 flex-1 text-right">
      <p className="truncate text-sm text-slate-500">{label}</p>
      <p className="truncate text-2xl font-extrabold text-slate-900 xl:text-3xl">{value}</p>
      {sub && <p className="truncate text-xs text-slate-400">{sub}</p>}
    </div>
  </div>
);

function Ring({ value, color, label }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative size-16">
        <svg viewBox="0 0 64 64" className="size-full -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-xs font-bold text-slate-800">{value}%</span>
      </div>
      <span className="text-[11px] text-slate-500">{label}</span>
    </div>
  );
}

const Toggle = ({ on, onChange, color, label }) => (
  <div className="flex items-center gap-2 text-sm text-slate-600">
    <span>{label}</span>
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="relative h-5 w-9 rounded-full transition" style={{ background: on ? color : '#cbd5e1' }}>
      <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  </div>
);

const Tip = ({ active, payload }) =>
  active && payload?.length ? (
    <div className="rounded-lg bg-brand-900 px-3 py-2 text-xs text-white shadow-lg">
      <p className="font-semibold">{payload[0].payload.label}</p>
      <p>{money(payload[0].payload.total)}</p>
      <p className="text-blue-200">{payload[0].payload.orders} pedidos</p>
    </div>
  ) : null;

export default function DashboardTab({ guard, go, can = () => true }) {
  const site = useSite();
  const [range, setRange] = useState('7');
  const [showSales, setShowSales] = useState(true);
  const [showOrders, setShowOrders] = useState(true);
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    guard(api.admin.stats(30)).then((s) => alive && setStats(s)).catch(() => {});
    guard(api.admin.products()).then((p) => alive && setProducts(p)).catch(() => alive && setProducts([]));
    loadOrders(guard).then((r) => alive && setData(r)).catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const view = useMemo(() => {
    if (!data) return null;
    const buckets = buildBuckets(range);
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    const first = range === 'month' ? `${buckets[0].key}-01` : buckets[0].key;
    const prod = new Map();

    for (const o of data.orders) {
      const day = dayKey(o.createdAt);
      if (day < first || o.status === 'Cancelado') continue;
      const b = byKey.get(range === 'month' ? day.slice(0, 7) : day);
      if (b) {
        b.total += o.total;
        b.orders += 1;
      }
      for (const i of o.items) {
        const r = prod.get(String(i.product)) || { name: i.name, image: i.image, qty: 0, revenue: 0 };
        r.qty += i.qty;
        r.revenue += i.price * i.qty;
        prod.set(String(i.product), r);
      }
    }
    const top = [...prod.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6).map((r) => ({ ...r, revenue: round2(r.revenue) }));
    return { byDay: buckets.map((b) => ({ ...b, total: round2(b.total) })), top };
  }, [data, range]);

  const global = useMemo(() => {
    if (!data) return null;
    const live = data.orders.filter((o) => o.status !== 'Cancelado');
    const activity = data.orders
      .flatMap((o) => o.statusHistory.map((h) => ({ code: o.code, status: h.status, at: h.at, name: o.customer.name })))
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 8);
    return {
      delivered: pct(live.filter((o) => o.status === 'Entregado').length, live.length),
      cod: pct(live.filter((o) => o.paymentMethod === 'Contra Entrega').length, live.length),
      account: pct(live.filter((o) => o.customer.user).length, live.length),
      salesTotal: live.reduce((a, o) => a + o.total, 0),
      salesDelivered: live.filter((o) => o.status === 'Entregado').reduce((a, o) => a + o.total, 0),
      pending: data.orders.filter((o) => o.status === 'Pendiente').length,
      recent: data.orders.slice(0, 8),
      activity,
    };
  }, [data]);

  const catalog = useMemo(() => {
    const list = products || [];
    const inStock = list.filter((p) => p.active && p.totalStock > 0);
    const m = new Map();
    for (const p of list) {
      const name = (p.supplier?.name || '').trim();
      if (!p.active || !name) continue;
      const s = m.get(name) || { name, products: 0 };
      s.products += 1;
      m.set(name, s);
    }
    return { inStock: inStock.length, units: inStock.reduce((a, p) => a + p.totalStock, 0), suppliers: [...m.values()].sort((a, b) => b.products - a.products) };
  }, [products]);

  if (error) return <Notice>{error}</Notice>;
  if (!view || !global || !products) return <Spinner />;

  const salesTotal = stats ? stats.sales.pipeline : global.salesTotal;
  const salesDelivered = stats ? stats.sales.delivered : global.salesDelivered;
  const pending = stats ? stats.byStatus.find((r) => r.status === 'Pendiente')?.count || 0 : global.pending;
  const chartMax = Math.max(1, ...view.byDay.map((d) => d.total));
  const topMax = Math.max(1, ...view.top.map((t) => t.revenue));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={CircleDollarSign} tone="yellow" label="Ventas totales" value={money(salesTotal)} sub={`${money(salesDelivered)} ya entregadas`} />
        <Kpi icon={MessageCircle} tone="blue" label="Pedidos pendientes de WhatsApp" value={pending} sub={pending > 0 ? 'Por confirmar con el cliente' : 'Todo al día'} />
        {can('suppliers:read') ? (
          <Kpi icon={Building2} tone="blue" label="Proveedores activos" value={catalog.suppliers.length} sub="Con productos activos" />
        ) : (
          <Kpi icon={Building2} tone="blue" label="Productos activos" value={(products || []).filter((p) => p.active).length} sub="Visibles en la tienda" />
        )}
        <Kpi icon={Boxes} tone="yellow" label="Productos en stock" value={catalog.inStock} sub={`${catalog.units} unidades disponibles`} />
      </div>

      {/* Perfil de la tienda + gráfica */}
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card>
          <div className="flex flex-col items-center text-center">
            <div className="relative size-28">
              <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                <circle cx="50" cy="50" r="46" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                <circle cx="50" cy="50" r="46" fill="none" stroke={BLUE} strokeWidth="5" strokeLinecap="round" strokeDasharray={2 * Math.PI * 46} strokeDashoffset={2 * Math.PI * 46 * (1 - global.delivered / 100)} />
              </svg>
              <div className="absolute inset-3 grid place-items-center overflow-hidden rounded-full bg-brand-700 text-3xl font-extrabold text-white">
                {site.logoUrl ? <img src={site.logoUrl} alt="" className="size-full bg-white object-contain p-2" /> : site.siteName?.[0]}
              </div>
            </div>
            <h3 className="mt-3 text-lg font-bold text-slate-900">{site.siteName}</h3>
            <p className="text-sm text-slate-500">Resumen de los últimos 6 meses</p>
          </div>

          <div className="mt-5 flex justify-around">
            <Ring value={global.delivered} color={BLUE} label="Entregados" />
            <Ring value={global.cod} color={YELLOW} label="Contra entrega" />
            <Ring value={global.account} color="#0ea5e9" label="Con cuenta" />
          </div>

          <div className="my-5 border-t border-slate-100" />
          <h4 className="mb-3 text-sm font-semibold text-slate-900">Actividad reciente</h4>
          {global.activity.length === 0 ? (
            <p className="text-sm text-slate-400">Aún no hay actividad.</p>
          ) : (
            <ul className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {global.activity.map((a, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${a.status === 'Pendiente' ? 'bg-accent-100 text-accent-700' : 'bg-brand-50 text-brand-700'}`}><PackageCheck size={18} /></span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-medium text-slate-800">
                      {a.status === 'Pendiente' ? 'Nuevo pedido' : `Pasó a ${a.status === 'Confirmado por WhatsApp' ? 'Confirmado' : a.status}`} · #{a.code}
                    </p>
                    <p className="truncate text-xs text-slate-400">{a.name} · {ago(a.at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <h3 className="mr-auto text-base font-bold text-slate-900">Estadísticas de ventas</h3>
            <Toggle on={showSales} onChange={setShowSales} color={BLUE} label="Ventas (L)" />
            <Toggle on={showOrders} onChange={setShowOrders} color={YELLOW} label="Pedidos" />
            <select value={range} onChange={(e) => setRange(e.target.value)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 outline-none">
              {RANGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {view.byDay.every((d) => d.orders === 0) ? (
            <p className="py-24 text-center text-sm text-slate-400">Sin ventas en este período</p>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={view.byDay} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BLUE} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} interval="preserveStartEnd" />
                  <YAxis yAxisId="l" hide={!showSales} domain={[0, chartMax]} tickLine={false} axisLine={false} fontSize={12} width={56} tickFormatter={shortMoney} />
                  <YAxis yAxisId="r" hide orientation="right" allowDecimals={false} />
                  <Tooltip content={<Tip />} />
                  {showSales && <Area yAxisId="l" type="monotone" dataKey="total" stroke={BLUE} strokeWidth={3} fill="url(#gSales)" activeDot={{ r: 6 }} />}
                  {showOrders && <Line yAxisId="r" type="monotone" dataKey="orders" stroke={YELLOW} strokeWidth={3} dot={false} activeDot={{ r: 6 }} />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-3 flex justify-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full" style={{ background: BLUE }} /> Ventas (L)</span>
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full" style={{ background: YELLOW }} /> Pedidos</span>
          </div>
        </Card>
      </div>

      {/* Pedidos recientes */}
      <Card className="!p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <h3 className="text-base font-bold text-slate-900">Pedidos recientes</h3>
          <button onClick={() => go('pedidos')} className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-800">Ver todos <ArrowRight size={15} /></button>
        </div>
        {global.recent.length === 0 ? (
          <p className="px-5 pb-8 text-sm text-slate-400">Aún no hay pedidos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase text-slate-400">
                <tr><th className="px-5 py-3">Pedido</th><th className="px-5 py-3">Cliente</th><th className="px-5 py-3">Pago</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3">Fecha</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {global.recent.map((o) => (
                  <tr key={o._id} onClick={() => go('pedidos', o.code)} className="cursor-pointer hover:bg-brand-50/50">
                    <td className="px-5 py-3 font-bold text-brand-700">#{o.code}</td>
                    <td className="px-5 py-3">{o.customer.name}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${o.paymentMethod === 'Transferencia' ? 'bg-brand-50 text-brand-700' : 'bg-accent-100 text-accent-800'}`}>{o.paymentMethod}</span>
                    </td>
                    <td className="px-5 py-3 font-semibold">{money(o.total)}</td>
                    <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[o.status]}`}>{o.status}</span></td>
                    <td className="px-5 py-3 text-slate-400">{ago(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Productos más vendidos */}
      <section>
        <h3 className="mb-3 text-base font-bold text-slate-900">Productos más vendidos</h3>
        {view.top.length === 0 ? (
          <p className="text-sm text-slate-400">Sin ventas en el período seleccionado.</p>
        ) : (
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-3">
            {view.top.map((t, i) => (
              <div key={t.name} className="w-72 shrink-0 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start gap-3">
                  <img src={t.image} alt="" className="size-14 shrink-0 rounded-xl bg-slate-100 object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-400">{t.qty} unidades vendidas</p>
                    <p className="line-clamp-2 font-semibold leading-snug text-slate-900">{t.name}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${i === 0 ? 'bg-accent-400 text-brand-900' : 'bg-slate-100 text-slate-500'}`}>#{i + 1}</span>
                </div>
                <p className="mt-4 text-xl font-extrabold text-brand-700">{money(t.revenue)}</p>
                <div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${(t.revenue / topMax) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        )}
      </section>

      {can('suppliers:read') && (
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Proveedores activos</h3>
          <button onClick={() => go('proveedores')} className="flex items-center gap-2 rounded-full border border-brand-600 px-4 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50">
            Ver más <ArrowRight size={14} />
          </button>
        </div>
        {catalog.suppliers.length === 0 ? (
          <p className="text-sm text-slate-400">Asigna un proveedor dentro de cada producto (Inventario) para verlo aquí.</p>
        ) : (
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-3">
            {catalog.suppliers.slice(0, 8).map((s, i) => (
              <div key={s.name} className="flex w-56 shrink-0 items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 transition hover:shadow-md">
                <span className={`grid size-12 shrink-0 place-items-center rounded-xl text-lg font-extrabold ${SUPPLIER_TONES[i % SUPPLIER_TONES.length]}`}>{s.name[0]}</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{s.name}</p>
                  <p className="text-sm text-brand-700">{s.products} producto{s.products === 1 ? '' : 's'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      )}

      {data.capped && <p className="text-center text-xs text-slate-400">Se analizaron los 1000 pedidos más recientes.</p>}
    </div>
  );
}
