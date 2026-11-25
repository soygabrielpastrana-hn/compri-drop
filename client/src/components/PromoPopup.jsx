import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { api, mediaUrl } from '../lib/api.js';

const KEY = 'compri-popups-seen';
const DAY = 86_400_000;
const safeHref = (l) => /^(\/(?!\/)|https?:\/\/)/i.test(l || '');

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
};

// Frecuencia (para no ser invasivo):
//  once = una sola vez · day = una vez cada 24 h · session = una vez por visita · always = en cada carga
// Si el admin edita el popup, cambia su "version" y vuelve a mostrarse.
function eligible(p) {
  const seen = read()[p._id];
  if (seen?.forever && seen.v === p.version) return false; // el cliente pidió no verlo más
  switch (p.frequency) {
    case 'always':
      return true;
    case 'session':
      return !sessionStorage.getItem(`${KEY}:${p._id}:${p.version}`);
    case 'once':
      return !(seen && seen.v === p.version);
    default:
      return !(seen && seen.v === p.version && Date.now() - seen.at < DAY);
  }
}

function markSeen(p, forever = false) {
  try {
    const all = read();
    all[p._id] = { v: p.version, at: Date.now(), forever };
    localStorage.setItem(KEY, JSON.stringify(all));
    sessionStorage.setItem(`${KEY}:${p._id}:${p.version}`, '1');
  } catch {
    /* almacenamiento no disponible */
  }
}

export default function PromoPopup() {
  const { pathname } = useLocation();
  const [popup, setPopup] = useState(null);
  const shown = useRef(false);
  const closeBtn = useRef(null);

  // Solo al entrar a la tienda (inicio); la imagen se precarga para que no "salte"
  useEffect(() => {
    if (pathname !== '/' || shown.current) return undefined;
    let alive = true;
    let timer;
    api
      .popups()
      .then((list) => {
        const p = list.find(eligible);
        if (!p || !alive) return;
        const img = new Image();
        img.onload = () => {
          if (!alive) return;
          timer = setTimeout(() => {
            shown.current = true;
            markSeen(p); // se marca al mostrarse: recargar no lo repite (salvo "always")
            setPopup(p);
          }, (p.delaySeconds || 0) * 1000);
        };
        img.src = mediaUrl(p.image);
      })
      .catch(() => {});
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [pathname]);

  const close = () => setPopup(null);

  // Escape cierra, el foco va al botón de cerrar y la página de fondo no se desplaza
  useEffect(() => {
    if (!popup) return undefined;
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtn.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [popup]);

  if (!popup) return null;

  const img = <img src={mediaUrl(popup.image)} alt={popup.title || 'Promoción'} className="mx-auto max-h-[75vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl" />;
  const internal = popup.link?.startsWith('/');

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-brand-900/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={popup.title || 'Promoción'}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="relative w-full max-w-md">
        <button
          ref={closeBtn}
          onClick={close}
          aria-label="Cerrar"
          className="absolute -right-2 -top-3 z-10 grid size-9 place-items-center rounded-full bg-accent-400 text-brand-900 shadow-lg ring-2 ring-white transition hover:scale-105"
        >
          <X size={18} strokeWidth={3} />
        </button>

        {safeHref(popup.link) ? (
          internal ? (
            <Link to={popup.link} onClick={close}>{img}</Link>
          ) : (
            <a href={popup.link} target="_blank" rel="noopener noreferrer" onClick={close}>{img}</a>
          )
        ) : (
          img
        )}

        <button
          onClick={() => {
            markSeen(popup, true);
            close();
          }}
          className="mx-auto mt-3 block text-xs font-medium text-white/80 underline-offset-2 hover:text-white hover:underline"
        >
          No volver a mostrar
        </button>
      </div>
    </div>
  );
}
