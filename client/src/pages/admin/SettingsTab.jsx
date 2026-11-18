import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useSite } from '../../context/SiteContext.jsx';
import Spinner, { Notice } from '../../components/Spinner.jsx';
import ImageUploader from './ImageUploader.jsx';

const BANKS = ['BAC', 'Ficohsa', 'Atlántida'];
const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500';
const Label = ({ text, children }) => (
  <label className="block text-sm"><span className="mb-1 block font-medium">{text}</span>{children}</label>
);

export default function SettingsTab({ guard }) {
  const site = useSite();
  const [f, setF] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    guard(api.admin.siteConfig())
      .then((c) =>
        setF({
          siteName: c.siteName || '', logoUrl: c.logoUrl || '', whatsapp: c.whatsapp || '',
          freeShippingMin: c.freeShippingMin || 0, cashbackPercent: c.cashbackPercent, guestCashbackDays: c.guestCashbackDays,
          sideBanners: (c.sideBanners || []).map((b) => ({ image: b.image || '', title: b.title || '', link: b.link || '', active: b.active !== false })),
          bankAccounts: (c.bankAccounts || []).map((b) => ({ bank: b.bank, holder: b.holder || '', accountType: b.accountType || 'Ahorros', accountNumber: b.accountNumber || '', active: b.active !== false })),
        })
      )
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!f) return error ? <Notice>{error}</Notice> : <Spinner />;

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const setItem = (list, i, patch) => setF((p) => ({ ...p, [list]: p[list].map((x, k) => (k === i ? { ...x, ...patch } : x)) }));
  const removeItem = (list, i) => setF((p) => ({ ...p, [list]: p[list].filter((_, k) => k !== i) }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setError('');
    try {
      await guard(
        api.admin.saveSiteConfig({
          ...f,
          freeShippingMin: Number(f.freeShippingMin) || 0,
          cashbackPercent: Number(f.cashbackPercent) || 0,
          guestCashbackDays: Number(f.guestCashbackDays) || 45,
          sideBanners: f.sideBanners.filter((b) => b.image.trim()),
          bankAccounts: f.bankAccounts.filter((b) => b.accountNumber.trim()),
        })
      );
      site.reload();
      setMsg('Configuración guardada ✓');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const Section = ({ title, children }) => (
    <section className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200"><h3 className="font-semibold">{title}</h3>{children}</section>
  );

  return (
    <form onSubmit={save} className="space-y-5">
      <h2 className="text-xl font-bold">Configuración del sitio</h2>

      <Section title="Marca y contacto">
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text="Nombre de la tienda"><input className={field} value={f.siteName} onChange={set('siteName')} /></Label>
          <Label text="WhatsApp de ventas (504XXXXXXXX)"><input className={field} value={f.whatsapp} onChange={set('whatsapp')} placeholder="50499999999" /></Label>
        </div>
        <Label text="Logo (URL de imagen)"><input className={field} value={f.logoUrl} onChange={set('logoUrl')} placeholder="https://…" /></Label>
        {f.logoUrl && <img src={f.logoUrl} alt="" className="h-12 object-contain" />}
      </Section>

      <Section title="Envío gratis y cashback">
        <div className="grid gap-4 sm:grid-cols-3">
          <Label text="Envío gratis desde (L, 0 = desactivado)"><input type="number" min="0" className={field} value={f.freeShippingMin} onChange={set('freeShippingMin')} /></Label>
          <Label text="Cashback (%)"><input type="number" min="0" max="50" step="0.5" className={field} value={f.cashbackPercent} onChange={set('cashbackPercent')} /></Label>
          <Label text="Días para reclamar (invitados)"><input type="number" min="1" max="365" className={field} value={f.guestCashbackDays} onChange={set('guestCashbackDays')} /></Label>
        </div>
      </Section>

      <Section title="Banners laterales del inicio (máx. 6; se muestran 2)">
        {f.sideBanners.map((b, i) => (
          <div key={i} className="grid gap-3 rounded-xl bg-slate-50 p-3 md:grid-cols-[260px_1fr]">
            <ImageUploader compact value={b.image} onChange={(url) => setItem('sideBanners', i, { image: url })} width={600} height={270} label="Imagen (600 × 270 px)" />
            <div className="space-y-2">
              <input className={field} placeholder="Texto alternativo" value={b.title} onChange={(e) => setItem('sideBanners', i, { title: e.target.value })} />
              <input className={field} placeholder="Enlace al hacer clic (/?cat=Hogar)" value={b.link} onChange={(e) => setItem('sideBanners', i, { link: e.target.value })} />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={b.active} onChange={(e) => setItem('sideBanners', i, { active: e.target.checked })} className="accent-brand-600" /> Activo</label>
                <button type="button" onClick={() => removeItem('sideBanners', i)} className="text-slate-400 hover:text-red-600" aria-label="Quitar"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
        {f.sideBanners.length < 6 && (
          <button type="button" onClick={() => setF((p) => ({ ...p, sideBanners: [...p.sideBanners, { title: '', image: '', link: '', active: true }] }))} className="flex items-center gap-1.5 text-sm font-medium text-brand-600">
            <Plus size={15} /> Agregar banner lateral
          </button>
        )}
      </Section>

      <Section title="Cuentas bancarias para transferencias">
        {f.bankAccounts.map((b, i) => (
          <div key={i} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[120px_1fr_1fr_120px_auto_auto]">
            <select className={field} value={b.bank} onChange={(e) => setItem('bankAccounts', i, { bank: e.target.value })}>{BANKS.map((x) => <option key={x}>{x}</option>)}</select>
            <input className={field} placeholder="Número de cuenta" value={b.accountNumber} onChange={(e) => setItem('bankAccounts', i, { accountNumber: e.target.value })} />
            <input className={field} placeholder="A nombre de" value={b.holder} onChange={(e) => setItem('bankAccounts', i, { holder: e.target.value })} />
            <select className={field} value={b.accountType} onChange={(e) => setItem('bankAccounts', i, { accountType: e.target.value })}><option>Ahorros</option><option>Corriente</option></select>
            <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={b.active} onChange={(e) => setItem('bankAccounts', i, { active: e.target.checked })} className="accent-brand-600" /> Activa</label>
            <button type="button" onClick={() => removeItem('bankAccounts', i)} className="text-slate-400 hover:text-red-600" aria-label="Quitar"><Trash2 size={16} /></button>
          </div>
        ))}
        <button type="button" onClick={() => setF((p) => ({ ...p, bankAccounts: [...p.bankAccounts, { bank: 'BAC', holder: '', accountType: 'Ahorros', accountNumber: '', active: true }] }))} className="flex items-center gap-1.5 text-sm font-medium text-brand-600">
          <Plus size={15} /> Agregar cuenta
        </button>
      </Section>

      {error && <Notice>{error}</Notice>}
      {msg && <Notice tone="green">{msg}</Notice>}
      <button disabled={busy} className="rounded-xl bg-brand-600 px-8 py-3 font-semibold text-white disabled:opacity-60">{busy ? 'Guardando…' : 'Guardar configuración'}</button>
    </form>
  );
}
