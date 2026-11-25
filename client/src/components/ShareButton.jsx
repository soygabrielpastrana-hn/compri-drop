import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Check, Copy, Download, MessageCircle, Share2, X } from 'lucide-react';
import { money } from '../lib/format.js';

// OJO: la tarjeta usa SOLO colores hex/rgb en línea. html2canvas no entiende los colores modernos (oklch)
// que Tailwind v4 genera en sus clases de color.
function ShareCard({ cardRef, product, image, price }) {
  const badges = [];
  if (product.shipping.free) badges.push('ENVÍO GRATIS');
  if (product.payment.cod) badges.push('PAGO CONTRA ENTREGA');

  return (
    <div
      ref={cardRef}
      style={{
        width: 320, height: 568, color: '#ffffff', fontFamily: 'system-ui, sans-serif',
        background: 'linear-gradient(160deg,#0F2A7A 0%,#1B4DDB 100%)',
      }}
      className="flex flex-col items-center gap-3 p-5 text-center"
    >
      <div style={{ fontSize: 13, letterSpacing: 3, fontWeight: 800 }}>COMPRI</div>
      <div style={{ width: 280, height: 280, background: '#ffffff', borderRadius: 20, overflow: 'hidden' }}>
        {image && (
          <img src={image} alt="" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {badges.map((b) => (
          <span key={b} style={{ background: '#ffffff', color: '#0F2A7A', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 999 }}>
            {b}
          </span>
        ))}
      </div>
      <div className="line-clamp-2" style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.25 }}>{product.name}</div>
      <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1 }}>{money(price)}</div>
      <div style={{ marginTop: 'auto', fontSize: 13, fontWeight: 600, background: 'rgba(0,0,0,0.25)', padding: '8px 16px', borderRadius: 999 }}>
        📲 Pídelo por WhatsApp
      </div>
    </div>
  );
}

export default function ShareButton({ product, image, price }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cardRef = useRef(null);

  const link = product.shareUrl;
  const badge = product.shipping.free ? 'Envío gratis' : product.payment.cod ? 'Pago contra entrega' : '';
  const text = `${product.name} — ${money(price)}${badge ? ` · ${badge}` : ''}\nPídelo aquí: ${link}`;

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = async () => {
    setBusy(true);
    setError('');
    try {
      const canvas = await html2canvas(cardRef.current, { useCORS: true, scale: 1080 / 320, backgroundColor: null });
      const a = document.createElement('a');
      a.download = `${product.slug}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    } catch {
      setError('No se pudo generar la imagen. Sube las fotos a un hosting con CORS habilitado (Cloudinary, por ejemplo).');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
      >
        <Share2 size={16} /> Compartir / Promocionar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Compartir producto</h3>
              <button onClick={() => setOpen(false)} aria-label="Cerrar">
                <X />
              </button>
            </div>

            <div className="flex gap-2">
              <input readOnly value={link} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs" />
              <button onClick={copy} className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 text-sm text-white">
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-medium">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(text)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2 text-white"
              >
                <MessageCircle size={15} /> WhatsApp
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center rounded-lg bg-blue-600 py-2 text-white"
              >
                Facebook
              </a>
            </div>

            <p className="mb-2 mt-5 text-sm font-medium">Tarjeta para estados e historias</p>
            <div className="flex justify-center overflow-x-auto">
              <ShareCard cardRef={cardRef} product={product} image={image} price={price} />
            </div>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <button
              onClick={download}
              disabled={busy}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-semibold text-white disabled:opacity-60"
            >
              <Download size={16} /> {busy ? 'Generando…' : 'Descargar tarjeta (PNG)'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
