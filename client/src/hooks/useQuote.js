import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

// Cotización del servidor: subtotal, cupón, saldo, envío, total, bloques de pago (split) y barra de envío gratis.
// opts: { coupon, paymentMethod (preferencia para productos que aceptan ambos), useWallet }
export function useQuote(items, opts = {}) {
  const { coupon = '', paymentMethod = '', useWallet = false } = opts;
  const { user } = useAuth();
  const [state, setState] = useState({ quote: null, error: '', couponError: '', loading: false });
  const signature = JSON.stringify(items.map((i) => [i.productId, i.variantId, i.qty])) + coupon + paymentMethod + useWallet + (user?.uid || '');

  useEffect(() => {
    if (!items.length) {
      setState({ quote: null, error: '', couponError: '', loading: false });
      return undefined;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));

    const timer = setTimeout(async () => {
      const lines = items.map((i) => ({ productId: i.productId, variantId: i.variantId, qty: i.qty }));
      const body = { items: lines, paymentMethod: paymentMethod || undefined, useWallet: useWallet || undefined };
      try {
        const quote = await api.quote({ ...body, couponCode: coupon || undefined });
        if (!cancelled) setState({ quote, error: '', couponError: '', loading: false });
      } catch (err) {
        if (cancelled) return;
        if (coupon) {
          // Reintenta sin cupón para distinguir si el error es del cupón o del carrito
          try {
            const quote = await api.quote(body);
            if (!cancelled) setState({ quote, error: '', couponError: err.message, loading: false });
          } catch (err2) {
            if (!cancelled) setState({ quote: null, error: err2.message, couponError: '', loading: false });
          }
          return;
        }
        setState({ quote: null, error: err.message, couponError: '', loading: false });
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return state;
}
