import type { ReactNode } from 'react';
import { InfoHint } from './InfoHint';

export function StatCard({
  label,
  value,
  tone,
  hint,
  icon,
}: {
  label: string;
  value: number | string;
  tone?: 'default' | 'warning' | 'danger';
  hint?: string;
  icon?: ReactNode;
}) {
  const toneClass =
    tone === 'danger' ? 'text-red-600' : tone === 'warning' ? 'text-amber-600' : 'text-brand-900';
  const iconToneClass = tone === 'danger' ? 'bg-red-50 text-red-500' : tone === 'warning' ? 'bg-amber-50 text-amber-500' : 'bg-brand-50 text-brand-600';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card transition hover:shadow-card-hover">
      <div className="flex items-start justify-between">
        <div className="flex items-center text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
          {hint && <InfoHint text={hint} />}
        </div>
        {icon && <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconToneClass}`}>{icon}</div>}
      </div>
      <div className={`mt-1.5 text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

export function Panel({
  title,
  hint,
  children,
  action,
}: {
  title: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
        <h2 className="flex items-center text-sm font-semibold text-slate-700">
          {title}
          {hint && <InfoHint text={hint} />}
        </h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
