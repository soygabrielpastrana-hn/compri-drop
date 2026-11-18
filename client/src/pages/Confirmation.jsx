import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Landmark, MessageCircle, PackageSearch } from 'lucide-react';
import { money } from '../lib/format.js';
import { useSite } from '../context/SiteContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import GoogleButton from '../components/GoogleButton.jsx';

export default function Confirmation() {
  const { code } = useParams();
  const site = useSite();
  const { user } = useAuth();
  const info = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem(`order-${code}`));
    } catch {
      return null;
    }
  }, [code]);

  const transfers = (info?.orders || []).filter((o) => o.paymentMethod === 'Transferencia');
  const accounts = site.bankAccounts.filter((a) => transfers.some((o) => !o.bank || o.bank === a.bank));

  // Abre WhatsApp automáticamente (una sola vez); el botón queda como respaldo
  useEffect(() => {
    if (!info) return undefined;
    const flag = `redirected-${code}`;
    if (sessionStorage.getItem(flag)) return undefined;
    const t = setTimeout(() => {
      sessionStorage.setItem(flag, '1');
      window.location.href = info.whatsappUrl;
    }, 2500);
    return () => clearTimeout(t);
  }, [info, code]);

  return (
    <div className="mx-auto max-w-md px-4 py-14 text-center">
      <CheckCircle2 size={64} className="mx-auto text-green-500" />
      <h1 className="mt-4 text-2xl font-bold">¡Pedido #{code} registrado!</h1>

      {info ? (
        <>
          <p className="mt-2 text-slate-600">
            Total: <b>{money(info.total)}</b>. Te llevamos a WhatsApp para enviar tu pedido…
          </p>
          {info.split && (
            <ul className="mt-3 space-y-1 rounded-xl bg-amber-50 p-3 text-left text-sm text-amber-900">
              <li className="font-semibold">Se dividió en {info.orders.length} envíos:</li>
              {info.orders.map((o) => (
                <li key={o.code}>#{o.code} · {o.paymentMethod} · <b>{money(o.total)}</b></li>
              ))}
            </ul>
          )}

          {transfers.length > 0 && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-left text-sm">
              <p className="flex items-center gap-2 font-semibold"><Landmark size={16} /> Datos para tu transferencia</p>
              {accounts.length === 0 ? (
                <p className="mt-1 text-slate-500">Te enviaremos los datos de la cuenta por WhatsApp.</p>
              ) : (
                accounts.map((a, i) => (
                  <p key={i} className="mt-2">
                    <b>{a.bank}</b> · {a.accountType}<br />
                    Cuenta: <span className="font-mono">{a.accountNumber}</span><br />
                    A nombre de: {a.holder}
                  </p>
                ))
              )}
              <p className="mt-2 text-xs text-slate-500">Monto a transferir: <b>{money(transfers.reduce((a, o) => a + o.total, 0))}</b>. Envía el comprobante por WhatsApp.</p>
            </div>
          )}

          <a href={info.whatsappUrl} className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 font-semibold text-white">
            <MessageCircle size={18} /> Abrir WhatsApp
          </a>
          <Link to={`/rastreo?code=${code}&t=${info.token}`} className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-slate-300 py-3 font-medium">
            <PackageSearch size={18} /> Seguir mi pedido
          </Link>
          <p className="mt-4 text-xs text-slate-500">Tu pedido se confirma cuando nos envías el mensaje por WhatsApp.</p>

          {!user && site.cashbackPercent > 0 && (
            <div className="mt-6 space-y-2 rounded-xl bg-green-50 p-4 text-sm text-green-800">
              <p>💰 Ganarás <b>{site.cashbackPercent}%</b> de saldo cuando recibas tu pedido. Como invitado vence en {site.guestCashbackDays} días; con Google es permanente.</p>
              <GoogleButton />
            </div>
          )}
        </>
      ) : (
        <p className="mt-2 text-slate-600">Usa el enlace de seguimiento que te enviamos por WhatsApp o entra a Rastrear pedido.</p>
      )}
      <Link to="/" className="mt-8 inline-block font-medium text-brand-600">Seguir comprando</Link>
    </div>
  );
}
