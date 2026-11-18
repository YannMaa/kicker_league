import type { ReactNode } from 'react';

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-end justify-between">
        <h2 className="font-score text-3xl tracking-wider drop-shadow">{title}</h2>
        {right}
      </div>
      <div className="rod mb-3" />
      {children}
    </section>
  );
}
