import type { Result } from '../lib/rating';

export function FormDots({ form }: { form: Result[] }) {
  return (
    <span className="inline-flex gap-1" aria-label={`Form: ${form.join(' ')}`}>
      {form.map((r, i) => (
        <span
          key={i}
          title={r === 'W' ? 'Win' : 'Loss'}
          className={`inline-block h-2.5 w-2.5 rounded-full ${r === 'W' ? 'bg-lime-300' : 'bg-red-500'}`}
        />
      ))}
    </span>
  );
}

export function Diff({ value }: { value: number }) {
  const cls = value > 0 ? 'text-lime-300' : value < 0 ? 'text-red-300' : 'text-white/70';
  return <span className={cls}>{value > 0 ? `+${value}` : value}</span>;
}
