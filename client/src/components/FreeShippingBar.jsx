import { Truck } from 'lucide-react';
import { money } from '../lib/format.js';

// Barra de progreso hacia el envío gratis (monto configurable en /admin → Configuración)
export default function FreeShippingBar({ freeShipping }) {
  if (!freeShipping || !freeShipping.min) return null;
  const { min, remaining, reached } = freeShipping;
  const pct = Math.min(100, Math.round(((min - remaining) / min) * 100));

  return (
    <div className={`rounded-xl p-3 text-sm ${reached ? 'bg-green-50 text-green-700' : 'bg-accent-100 text-accent-800'}`}>
      <p className="flex items-center gap-2 font-medium">
        <Truck size={16} />
        {reached ? '¡Tienes envío gratis! 🎉' : <>Te faltan <b>{money(remaining)}</b> para el envío gratis</>}
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80">
        <div className={`h-full rounded-full transition-all ${reached ? 'bg-green-500' : 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
