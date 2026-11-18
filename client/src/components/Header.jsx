import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PackageSearch, Search, Store, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSite } from '../context/SiteContext.jsx';
import GoogleButton from './GoogleButton.jsx';
import CategoryMenu from './CategoryMenu.jsx';

export default function Header() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const { user, profile } = useAuth();
  const site = useSite();

  const submit = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/?q=${encodeURIComponent(q.trim())}` : '/');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-lg font-extrabold text-brand-600">
          {site.logoUrl ? (
            <img src={site.logoUrl} alt={site.siteName} className="h-9 max-w-40 object-contain" />
          ) : (
            <>
              <Store size={22} /> <span className="hidden sm:inline">{site.siteName}</span>
            </>
          )}
        </Link>

        <form onSubmit={submit} className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar productos…"
            className="w-full rounded-full border border-slate-300 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-brand-500 focus:bg-white"
          />
        </form>

        <Link to="/rastreo" className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-600" title="Rastrear pedido">
          <PackageSearch size={20} /> <span className="hidden md:inline">Rastrear</span>
        </Link>

        {profile?.isAdmin && (
          <Link to="/admin" className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Admin</Link>
        )}

        {user ? (
          <Link to="/cuenta" className="flex items-center gap-2 text-sm font-medium text-slate-700" title="Mi cuenta">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="size-8 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <User size={20} />
            )}
            {profile?.walletBalance > 0 && (
              <span className="hidden rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700 sm:inline">
                L {Number(profile.walletBalance).toFixed(2)}
              </span>
            )}
          </Link>
        ) : (
          <GoogleButton hideLabelOnMobile className="!px-3" />
        )}
      </div>
      <CategoryMenu />
    </header>
  );
}
