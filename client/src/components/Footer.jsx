import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useSite } from '../context/SiteContext.jsx';

export default function Footer() {
  const { siteName, whatsapp } = useSite();
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
      <p>Envíos a todo Honduras · Pago contra entrega o transferencia (BAC, Ficohsa, Atlántida)</p>
      <div className="mt-3 flex items-center justify-center gap-5">
        <Link to="/rastreo" className="font-medium text-slate-700 hover:text-brand-600">Rastrear pedido</Link>
        <Link to="/cuenta" className="font-medium text-slate-700 hover:text-brand-600">Mi cuenta</Link>
        {whatsapp && (
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-green-600">
            <MessageCircle size={16} /> WhatsApp
          </a>
        )}
      </div>
      <p className="mt-4 text-xs text-slate-400">© {new Date().getFullYear()} {siteName}</p>
    </footer>
  );
}
