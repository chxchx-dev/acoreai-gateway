import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface InfoHintProps {
  text: string;
}

const TOOLTIP_WIDTH = 224; // w-56
const MARGIN = 8;

// Ícono "?" con tooltip on-hover/focus. Se renderiza en un portal a <body> con
// position:fixed y calcula su propia posición al abrir — así nunca queda
// recortado por overflow:hidden/auto de un contenedor padre (tablas con scroll,
// paneles cerca del borde superior, etc.) y se voltea solo si no hay espacio.
export function InfoHint({ text }: InfoHintProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const spaceAbove = rect.top;
    const placement: 'top' | 'bottom' = spaceAbove > 90 ? 'top' : 'bottom';

    let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - TOOLTIP_WIDTH - MARGIN));

    const top = placement === 'top' ? rect.top - MARGIN : rect.bottom + MARGIN;

    setCoords({ top, left, placement });
  }, [open]);

  return (
    <span className="ml-1 inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        ref={triggerRef}
        type="button"
        tabIndex={0}
        aria-label="Más información"
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-300"
      >
        ?
      </button>
      {open &&
        coords &&
        createPortal(
          <span
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: TOOLTIP_WIDTH,
              transform: coords.placement === 'top' ? 'translateY(-100%)' : undefined,
            }}
            className="z-50 rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-normal leading-snug text-white shadow-lg"
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}
