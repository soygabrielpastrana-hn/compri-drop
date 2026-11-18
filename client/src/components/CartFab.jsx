import { ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';

// Botón flotante del carrito (siempre visible)
export default function CartFab() {
  const { count, setOpen } = useCart();
  return (
    <button
      onClick={() => setOpen(true)}
      aria-label="Abrir carrito"
      className="fixed bottom-5 right-5 z-40 grid size-14 place-items-center rounded-full bg-brand-600 text-white shadow-lg transition hover:bg-brand-700 active:scale-95"
    >
      <ShoppingBag size={24} />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 grid min-w-6 place-items-center rounded-full bg-slate-900 px-1.5 text-xs font-bold">
          {count}
        </span>
      )}
    </button>
  );
}
