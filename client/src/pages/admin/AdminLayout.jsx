import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ExternalLink, LogOut, Menu, Search, X } from 'lucide-react';
import { useSite } from '../../context/SiteContext.jsx';

// Estructura: sidebar fijo en azul de marca + barra superior (título, búsqueda, notificaciones, perfil) + contenido en gris claro
export default function AdminLayout({ nav, tab, title, pending, adminName, roleLabel, onNavigate, onSearch, onLogout, children }) {
  const site = useSite();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) onSearch(q.trim());
    setQ('');
  };

  return (
    <div className="min-h-screen bg-brand-800">
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-800 text-white transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            {site.logoUrl ? (
              <img src={site.logoUrl} alt="" className="size-10 rounded-full bg-white object-contain p-1" />
            ) : (
              <span className="grid size-10 place-items-center rounded-full bg-accent-400 text-lg font-black text-brand-900">{site.siteName?.[0] || 'Y'}</span>
            )}
            <span className="text-lg font-extrabold leading-tight">{site.siteName}</span>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú"><X size={20} /></button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto pl-4 pt-2">
          {nav.map((group) => (
            <div key={group.group}>
              <p className="mb-2 pl-5 text-[11px] font-semibold uppercase tracking-wider text-brand-200/70">{group.group}</p>
              <ul className="space-y-1">
                {group.items.map(([id, label, Icon]) => {
                  const active = tab === id;
                  return (
                    <li key={id}>
                      <button
                        onClick={() => { onNavigate(id); setOpen(false); }}
                        className={`flex w-full items-center gap-3 rounded-l-full py-3 pl-5 pr-4 text-sm font-medium transition ${
                          active ? 'bg-slate-100 font-bold text-brand-800' : 'text-blue-100 hover:bg-white/10'
                        }`}
                      >
                        <Icon size={19} className={active ? 'text-brand-600' : ''} />
                        <span className="flex-1 text-left">{label}</span>
                        {id === 'pedidos' && pending > 0 && (
                          <span className="rounded-full bg-accent-400 px-2 py-0.5 text-xs font-bold text-brand-900">{pending}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="space-y-2 px-6 py-5 text-xs text-brand-200/80">
          <Link to="/" className="flex items-center gap-1.5 font-medium text-white hover:text-accent-400"><ExternalLink size={14} /> Ver la tienda</Link>
          <p>{site.siteName} · Panel del equipo</p>
        </div>
      </aside>

      {/* Contenido */}
      <div className="lg:ml-64">
        <div className="min-h-screen bg-slate-100 lg:rounded-l-[2rem]">
          <header className="sticky top-0 z-30 flex items-center gap-3 bg-slate-100/90 px-4 py-4 backdrop-blur sm:gap-4 lg:rounded-tl-[2rem] lg:px-8">
            <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menú"><Menu size={22} /></button>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>

            <form onSubmit={submit} className="relative mx-auto hidden w-full max-w-md md:block">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar pedido: código, teléfono o nombre…"
                className="w-full rounded-full bg-white py-2.5 pl-4 pr-10 text-sm shadow-sm outline-none ring-1 ring-slate-200 focus:ring-brand-500"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Buscar"><Search size={17} /></button>
            </form>

            <div className="ml-auto flex items-center gap-3 sm:gap-4">
              <button onClick={() => onNavigate('pedidos')} className="relative grid size-10 place-items-center rounded-full bg-white shadow-sm ring-1 ring-slate-200" aria-label="Pedidos pendientes">
                <Bell size={18} className="text-brand-700" />
                {pending > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-accent-400 px-1 text-[11px] font-bold text-brand-900">{pending}</span>}
              </button>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold leading-tight text-slate-900">{adminName}</p>
                <p className="text-xs text-slate-400">{roleLabel}</p>
              </div>
              <span className="grid size-10 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white">{adminName?.[0]?.toUpperCase() || 'A'}</span>
              <button onClick={onLogout} className="text-slate-500 hover:text-red-600" aria-label="Salir" title="Salir"><LogOut size={18} /></button>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-4 pb-10 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
