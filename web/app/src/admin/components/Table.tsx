import type { TableHTMLAttributes, HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react';


export function Table({ className = '', ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
      <table className={`min-w-full divide-y divide-slate-100 text-sm ${className}`} {...rest} />
    </div>
  );
}

export function Thead({ className = '', ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${className}`} {...rest} />;
}

export function Tbody({ className = '', ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={`divide-y divide-slate-100 ${className}`} {...rest} />;
}

export function Tr({ className = '', ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`transition hover:bg-slate-50 ${className}`} {...rest} />;
}

export function Th({ className = '', ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={`px-4 py-2.5 ${className}`} {...rest} />;
}

export function Td({ className = '', ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`px-4 py-2.5 text-slate-700 ${className}`} {...rest} />;
}
