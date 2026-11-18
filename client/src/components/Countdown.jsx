import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

// Reloj de Ofertas Relámpago: cuenta regresiva hasta el fin del día (se reinicia a medianoche)
const msLeft = () => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return Math.max(0, end.getTime() - Date.now());
};
const pad = (n) => String(n).padStart(2, '0');

export default function Countdown() {
  const [left, setLeft] = useState(msLeft);
  useEffect(() => {
    const t = setInterval(() => setLeft(msLeft()), 1000);
    return () => clearInterval(t);
  }, []);

  const s = Math.floor(left / 1000);
  const parts = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60];

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
      <Zap size={14} className="fill-red-500 text-red-500" /> Termina en
      {parts.map((n, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="rounded bg-slate-900 px-1.5 py-1 font-mono text-sm font-bold text-white">{pad(n)}</span>
          {i < 2 && <span className="font-bold">:</span>}
        </span>
      ))}
    </div>
  );
}
