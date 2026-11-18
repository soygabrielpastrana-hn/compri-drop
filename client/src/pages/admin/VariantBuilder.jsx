import { useState } from 'react';
import { Plus, Trash2, Wand2, X } from 'lucide-react';

const norm = (s) => String(s ?? '').trim().toLowerCase();
const keyOf = (opts) => opts.map((o) => `${norm(o.name)}=${norm(o.value)}`).sort().join('|');
const cartesian = (attrs) =>
  attrs.reduce((acc, a) => acc.flatMap((combo) => a.values.map((v) => [...combo, { name: a.name, value: v }])), [[]]);

const input = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500';

function ValueInput({ onAdd }) {
  const [text, setText] = useState('');
  const commit = () => {
    const vals = text.split(',').map((s) => s.trim()).filter(Boolean);
    if (vals.length) onAdd(vals);
    setText('');
  };
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          commit();
        }
      }}
      onBlur={commit}
      placeholder="Valor + Enter (ej. S, M, L · 128GB)"
      className={`${input} min-w-52 flex-1`}
    />
  );
}

// Atributos 100% libres: tú escribes el nombre (Color, Talla, Capacidad, Modelo…) y sus valores.
export default function VariantBuilder({ attributes, variants, onChange }) {
  const [img, setImg] = useState({ attr: '', value: '', url: '' });
  const set = (patch) => onChange({ attributes, variants, ...patch });

  const complete = attributes.length > 0 && attributes.every((a) => a.name.trim() && a.values.length);
  const combos = complete ? cartesian(attributes) : [];
  const existing = new Set(variants.map((v) => keyOf(v.options)));
  const missing = combos.filter((c) => !existing.has(keyOf(c)));

  const addAttr = () => attributes.length < 5 && set({ attributes: [...attributes, { name: '', values: [] }] });

  const renameAttr = (i, name) => {
    const old = attributes[i].name;
    set({
      attributes: attributes.map((a, x) => (x === i ? { ...a, name } : a)),
      variants: variants.map((v) => ({ ...v, options: v.options.map((o) => (o.name === old ? { ...o, name } : o)) })),
    });
  };

  const removeAttr = (i) => {
    const name = attributes[i].name;
    const rest = attributes.filter((_, x) => x !== i);
    const seen = new Set();
    const vs = rest.length
      ? variants
          .map((v) => ({ ...v, options: v.options.filter((o) => o.name !== name) }))
          .filter((v) => {
            const k = keyOf(v.options);
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          })
      : [];
    set({ attributes: rest, variants: vs });
  };

  const addValues = (i, vals) => {
    const cur = [...attributes[i].values];
    vals.forEach((v) => {
      if (!cur.some((c) => norm(c) === norm(v))) cur.push(v);
    });
    set({ attributes: attributes.map((a, x) => (x === i ? { ...a, values: cur } : a)) });
  };

  const removeValue = (i, val) => {
    const name = attributes[i].name;
    set({
      attributes: attributes.map((a, x) => (x === i ? { ...a, values: a.values.filter((v) => v !== val) } : a)),
      variants: variants.filter((v) => !v.options.some((o) => o.name === name && o.value === val)),
    });
  };

  const generate = () =>
    set({ variants: [...variants, ...missing.map((options) => ({ options, stock: 0, price: '', sku: '', image: '' }))] });

  const updateVariant = (idx, patch) => set({ variants: variants.map((v, x) => (x === idx ? { ...v, ...patch } : v)) });
  const removeVariant = (idx) => set({ variants: variants.filter((_, x) => x !== idx) });

  const applyImage = () => {
    if (!img.attr || !img.value || !img.url.trim()) return;
    set({
      variants: variants.map((v) =>
        v.options.some((o) => o.name === img.attr && o.value === img.value) ? { ...v, image: img.url.trim() } : v
      ),
    });
  };
  const imgAttr = attributes.find((a) => a.name === img.attr);

  return (
    <div className="space-y-5">
      {/* 1. Atributos */}
      <div className="space-y-3">
        <p className="text-sm font-medium">1. Define los atributos y sus valores</p>
        {attributes.map((a, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex gap-2">
              <input
                value={a.name}
                onChange={(e) => renameAttr(i, e.target.value)}
                placeholder="Atributo (Color, Talla, Capacidad, Modelo…)"
                className={`${input} w-64`}
              />
              <button type="button" onClick={() => removeAttr(i)} className="ml-auto text-slate-400 hover:text-red-600" aria-label="Quitar atributo">
                <Trash2 size={16} />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {a.values.map((v) => (
                <span key={v} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm ring-1 ring-slate-300">
                  {v}
                  <button type="button" onClick={() => removeValue(i, v)} aria-label={`Quitar ${v}`}>
                    <X size={13} className="text-slate-400 hover:text-red-600" />
                  </button>
                </span>
              ))}
              <ValueInput onAdd={(vals) => addValues(i, vals)} />
            </div>
          </div>
        ))}
        {attributes.length < 5 && (
          <button type="button" onClick={addAttr} className="flex items-center gap-1.5 text-sm font-medium text-brand-600">
            <Plus size={15} /> Agregar atributo
          </button>
        )}
      </div>

      {/* 2. Combinaciones */}
      {attributes.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">2. Stock por combinación</p>
            <button
              type="button"
              onClick={generate}
              disabled={!missing.length}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              <Wand2 size={14} /> Generar combinaciones{missing.length > 0 && ` (${missing.length} nuevas)`}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Borra las combinaciones que no existan (ej. Color Blanco con Talla 36). El cliente solo verá las que dejes.
          </p>

          {variants.length > 0 && (
            <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-2">Combinación</th>
                    <th className="p-2">Stock</th>
                    <th className="p-2">Precio (opc.)</th>
                    <th className="p-2">SKU</th>
                    <th className="p-2">URL de imagen</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {variants.map((v, idx) => (
                    <tr key={v._id || keyOf(v.options) || idx}>
                      <td className="p-2 font-medium">{v.options.map((o) => o.value).join(' / ')}</td>
                      <td className="p-2">
                        <input type="number" min="0" step="1" value={v.stock} onChange={(e) => updateVariant(idx, { stock: e.target.value })} className={`${input} w-20`} />
                      </td>
                      <td className="p-2">
                        <input type="number" min="0" step="0.01" value={v.price} onChange={(e) => updateVariant(idx, { price: e.target.value })} placeholder="Base" className={`${input} w-24`} />
                      </td>
                      <td className="p-2">
                        <input value={v.sku} onChange={(e) => updateVariant(idx, { sku: e.target.value })} className={`${input} w-24`} />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {v.image && <img src={v.image} alt="" className="size-8 rounded object-cover" />}
                          <input value={v.image} onChange={(e) => updateVariant(idx, { image: e.target.value })} placeholder="https://…" className={`${input} w-44`} />
                        </div>
                      </td>
                      <td className="p-2">
                        <button type="button" onClick={() => removeVariant(idx)} className="text-slate-400 hover:text-red-600" aria-label="Quitar combinación">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Imagen por valor (ej. una foto para todo el color Azul) */}
          {variants.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm">
              <span className="font-medium">Misma imagen para todo un valor:</span>
              <select value={img.attr} onChange={(e) => setImg({ attr: e.target.value, value: '', url: img.url })} className={input}>
                <option value="">Atributo…</option>
                {attributes.filter((a) => a.name).map((a) => <option key={a.name}>{a.name}</option>)}
              </select>
              <select value={img.value} onChange={(e) => setImg({ ...img, value: e.target.value })} className={input} disabled={!imgAttr}>
                <option value="">Valor…</option>
                {(imgAttr?.values || []).map((v) => <option key={v}>{v}</option>)}
              </select>
              <input value={img.url} onChange={(e) => setImg({ ...img, url: e.target.value })} placeholder="https://…" className={`${input} min-w-48 flex-1`} />
              <button type="button" onClick={applyImage} className="rounded-lg bg-white px-3 py-2 font-medium ring-1 ring-slate-300">
                Aplicar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
