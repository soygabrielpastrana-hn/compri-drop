import { valueState } from '../lib/variants.js';

// Atributos dinámicos: al elegir un valor, los demás atributos solo muestran las opciones que existen
// con esa combinación (ej. al elegir "Blanco" desaparecen las tallas que Blanco no tiene).
export default function VariantSelector({ variants, attributes, selected, onPick }) {
  return (
    <div className="space-y-4">
      {attributes.map((attr) => (
        <div key={attr.name}>
          <p className="mb-2 text-sm font-medium">
            {attr.name}: <span className="font-normal text-slate-500">{selected[attr.name] || 'elige una opción'}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {attr.values.map((val) => {
              const state = valueState(variants, selected, attr.name, val);
              if (state === 'hidden') return null;
              const active = selected[attr.name] === val;
              const soldOut = state === 'soldout';
              return (
                <button
                  key={val}
                  type="button"
                  disabled={soldOut}
                  onClick={() => onPick(attr.name, val)}
                  className={`min-w-11 rounded-lg border px-3 py-2 text-sm transition ${
                    active
                      ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700 ring-1 ring-brand-600'
                      : soldOut
                        ? 'cursor-not-allowed border-slate-200 text-slate-300 line-through'
                        : 'border-slate-300 hover:border-slate-500'
                  }`}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
