export default function Spinner() {
  return (
    <div className="flex justify-center py-20">
      <div className="size-8 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
    </div>
  );
}

export function Notice({ children, tone = 'red' }) {
  const tones = {
    red: 'bg-red-50 text-red-700 ring-red-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    green: 'bg-green-50 text-green-700 ring-green-200',
  };
  return <div className={`rounded-xl px-4 py-3 text-sm ring-1 ${tones[tone]}`}>{children}</div>;
}
