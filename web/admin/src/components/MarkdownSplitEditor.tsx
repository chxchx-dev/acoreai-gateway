import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MarkdownSplitEditorProps {
  value: string;
  onChange: (value: string) => void;
  heightPx?: number;
}

// Estilos manuales por tag en vez de @tailwindcss/typography: evita sumar un
// plugin nuevo solo para esto y mantiene el bundle liviano — react-markdown ya
// renderiza a elementos React reales (no dangerouslySetInnerHTML), así que esto
// es solo mapear tag -> clases.
const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="mb-3 mt-4 text-xl font-bold text-slate-800 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-4 text-lg font-bold text-slate-800 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-3 text-base font-semibold text-slate-700 first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="mb-3 text-sm leading-relaxed text-slate-700">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-inside list-disc space-y-1 text-sm text-slate-700">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-inside list-decimal space-y-1 text-sm text-slate-700">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-brand-700 underline hover:text-brand-800">
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-slate-300 pl-3 text-sm italic text-slate-500">{children}</blockquote>
  ),
  code: ({ children }) => <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-700">{children}</code>,
  pre: ({ children }) => <pre className="mb-3 overflow-x-auto rounded-md bg-slate-100 p-3 text-xs">{children}</pre>,
  hr: () => <hr className="my-4 border-slate-200" />,
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-slate-100">{children}</tbody>,
  th: ({ children }) => <th className="px-3 py-1.5 text-left text-xs font-semibold uppercase text-slate-500">{children}</th>,
  td: ({ children }) => <td className="px-3 py-1.5 text-slate-700">{children}</td>,
};

// Pantalla partida: textarea con el Markdown crudo (editable) a la izquierda,
// preview en vivo a la derecha. El estado vive en el padre (value/onChange)
// para que el formulario que lo envuelve controle qué se manda al guardar.
export function MarkdownSplitEditor({ value, onChange, heightPx = 512 }: MarkdownSplitEditorProps) {
  return (
    // Altura vía style, no clase Tailwind dinámica: una clase arbitraria
    // (`h-[32rem]`) armada por interpolación de string no la detecta el
    // escáner JIT de Tailwind (necesita ver el literal completo en el código
    // fuente), así que nunca se generaría el CSS y el layout no se contenía.
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2" style={{ height: heightPx }}>
      <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <span className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Markdown (editable)
        </span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="min-h-0 flex-1 resize-none border-0 p-3 font-mono text-xs leading-relaxed focus:outline-none focus:ring-0"
        />
      </div>
      <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <span className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Vista previa
        </span>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {value.trim().length === 0 ? (
            <p className="text-sm text-slate-400">Nada que previsualizar todavía.</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {value}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
}
