import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api, mediaUrl } from '../lib/api.js';
import { useSite } from '../context/SiteContext.jsx';

// Enlace opcional: interno (/?cat=Hogar), externo (https://…) o sin enlace
function Wrap({ link, className, children }) {
  if (!link) return <div className={className}>{children}</div>;
  return link.startsWith('/') ? (
    <Link to={link} className={className}>{children}</Link>
  ) : (
    <a href={link} target="_blank" rel="noreferrer" className={className}>{children}</a>
  );
}

// Banner = una imagen subida desde Admin → Banners (principal 1200×400) o Configuración (secundarios 600×270)
function Tile({ banner, eager = false, className = '' }) {
  return (
    <Wrap link={banner.link} className={`group block overflow-hidden ${className}`}>
      {banner.image ? (
        <img
          src={mediaUrl(banner.image)}
          alt={banner.title || 'Promoción'}
          loading={eager ? 'eager' : 'lazy'}
          className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        // banners antiguos sin imagen: se muestran con texto sobre el azul de la marca
        <div className="flex size-full flex-col justify-center bg-gradient-to-r from-brand-700 to-brand-500 p-6 text-white sm:p-10">
          <p className="text-2xl font-extrabold sm:text-4xl">{banner.title}</p>
          {banner.subtitle && <p className="mt-1 text-sm text-white/90 sm:text-base">{banner.subtitle}</p>}
        </div>
      )}
    </Wrap>
  );
}

export default function HeroBanners() {
  const site = useSite();
  const [banners, setBanners] = useState(null);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const side = site.sideBanners.filter((b) => b.image).slice(0, 2);

  useEffect(() => {
    api.banners().then(setBanners).catch(() => setBanners([]));
  }, []);

  const n = banners?.length || 0;
  useEffect(() => {
    if (n < 2 || paused) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % n), 5000);
    return () => clearInterval(t);
  }, [n, paused]);

  const go = (d) => setI((x) => (x + d + n) % n);

  return (
    <div className={`grid gap-4 ${side.length ? 'lg:grid-cols-[1fr_300px]' : ''}`}>
      {/* Banner principal */}
      <div
        className="group/hero relative aspect-[3/1] min-h-32 overflow-hidden rounded-2xl bg-slate-200 shadow-sm ring-1 ring-slate-200"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {banners === null ? (
          <div className="size-full animate-pulse bg-slate-200" />
        ) : n === 0 ? (
          <div className="flex size-full flex-col justify-center bg-gradient-to-r from-brand-800 via-brand-700 to-brand-500 p-6 text-white sm:p-10">
            <h1 className="text-2xl font-extrabold sm:text-4xl">Envíos a todo Honduras 🇭🇳</h1>
            <p className="mt-2 text-sm text-white/90 sm:text-base">Paga al recibir o por transferencia. Pide fácil por WhatsApp.</p>
            <span className="mt-4 h-1.5 w-16 rounded-full bg-accent-400" />
          </div>
        ) : (
          banners.map((b, idx) => (
            <div key={b._id} className={`absolute inset-0 transition-opacity duration-700 ${idx === i ? 'z-10 opacity-100' : 'pointer-events-none opacity-0'}`}>
              <Tile banner={b} eager={idx === 0} className="size-full" />
            </div>
          ))
        )}

        {n > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="Anterior" className="absolute left-3 top-1/2 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-brand-800 opacity-0 shadow transition group-hover/hero:opacity-100">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => go(1)} aria-label="Siguiente" className="absolute right-3 top-1/2 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-brand-800 opacity-0 shadow transition group-hover/hero:opacity-100">
              <ChevronRight size={18} />
            </button>
            <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-1.5">
              {banners.map((b, idx) => (
                <button key={b._id} onClick={() => setI(idx)} aria-label={`Banner ${idx + 1}`} className={`h-2 rounded-full transition-all ${idx === i ? 'w-6 bg-accent-400' : 'w-2 bg-white/70'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Banners secundarios (600 × 270) */}
      {side.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:grid-rows-2">
          {side.map((b, idx) => (
            <Tile key={idx} banner={b} className="aspect-[600/270] rounded-2xl bg-slate-200 shadow-sm ring-1 ring-slate-200 lg:aspect-auto lg:h-full" />
          ))}
        </div>
      )}
    </div>
  );
}
