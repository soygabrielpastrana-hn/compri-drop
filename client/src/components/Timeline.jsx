import { BadgeCheck, ClipboardList, Package, PackageCheck, Truck } from 'lucide-react';
import { Notice } from './Spinner.jsx';

const STEPS = [
  ['Pendiente', 'Pedido recibido', ClipboardList],
  ['Confirmado por WhatsApp', 'Confirmado', BadgeCheck],
  ['Preparando', 'Preparando tu pedido', Package],
  ['Enviado', 'En camino', Truck],
  ['Entregado', 'Entregado', PackageCheck],
];

const when = (d) => new Date(d).toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' });

// Línea de tiempo paso a paso con fecha, nota, transportista y guía de cada estado
export default function Timeline({ order }) {
  const history = order.statusHistory || [];
  const last = (s) => [...history].reverse().find((h) => h.status === s);

  if (order.status === 'Cancelado') {
    return (
      <div className="space-y-2">
        <Notice>Este pedido fue cancelado.</Notice>
        {last('Cancelado')?.note && <p className="text-sm text-slate-600">Motivo: {last('Cancelado').note}</p>}
      </div>
    );
  }

  const current = STEPS.findIndex(([s]) => s === order.status);

  return (
    <ol>
      {STEPS.map(([status, label, Icon], i) => {
        const done = i <= current;
        const h = last(status);
        return (
          <li key={status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`grid size-9 shrink-0 place-items-center rounded-full ${done ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-400'} ${i === current ? 'ring-4 ring-green-200' : ''}`}>
                <Icon size={16} />
              </span>
              {i < STEPS.length - 1 && <span className={`min-h-6 w-0.5 flex-1 ${i < current ? 'bg-green-600' : 'bg-slate-200'}`} />}
            </div>
            <div className="pb-5">
              <p className={`font-semibold ${done ? '' : 'text-slate-400'}`}>{label}</p>
              {h && (
                <>
                  <p className="text-xs text-slate-500">{when(h.at)}</p>
                  {(h.carrier || h.guide) && (
                    <p className="mt-1 text-sm text-slate-700">
                      {h.carrier && <>🚚 {h.carrier}</>} {h.guide && <>· Guía: <b className="font-mono">{h.guide}</b></>}
                    </p>
                  )}
                  {h.note && <p className="mt-1 text-sm text-slate-600">📝 {h.note}</p>}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
