import { Star } from 'lucide-react';

// Solo lectura, o interactivo si recibe onChange
export default function StarRating({ value = 0, onChange, size = 16 }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const star = (
          <Star size={size} className={n <= Math.round(value) ? 'fill-accent-400 text-accent-400' : 'text-slate-300'} />
        );
        return onChange ? (
          <button type="button" key={n} onClick={() => onChange(n)} aria-label={`${n} estrellas`}>
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </div>
  );
}
