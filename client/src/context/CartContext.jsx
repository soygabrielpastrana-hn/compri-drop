import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CartCtx = createContext(null);
const KEY = 'tienda-hn-cart-v1';

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [items]);

  // item: { productId, slug, variantId, name, image, options, price, stock, payment, shipping }
  const add = useCallback((item, qty = 1) => {
    const key = `${item.productId}|${item.variantId || ''}`;
    setItems((prev) => {
      const found = prev.find((i) => i.key === key);
      if (found) {
        return prev.map((i) => (i.key === key ? { ...i, ...item, key, qty: Math.min(i.qty + qty, item.stock) } : i));
      }
      return [...prev, { ...item, key, qty: Math.min(qty, item.stock) }];
    });
    setOpen(true);
  }, []);

  const setQty = useCallback(
    (key, qty) =>
      setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(qty, i.stock)) } : i))),
    []
  );
  const remove = useCallback((key) => setItems((prev) => prev.filter((i) => i.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items, open, setOpen, add, setQty, remove, clear,
      count: items.reduce((a, i) => a + i.qty, 0),
    }),
    [items, open, add, setQty, remove, clear]
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => useContext(CartCtx);
