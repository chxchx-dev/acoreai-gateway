import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { sourcesApi, sourceConversionApi } from '../lib/endpoints';
import { ApiError } from '../lib/api';
import { Stepper } from '../components/Stepper';
import { WIZARD_STEPS } from '../lib/wizardSteps';
import { InfoHint } from '../components/InfoHint';
import { MarkdownSplitEditor } from '../components/MarkdownSplitEditor';
import { Button } from '../components/Button';
import { humanizeWarning } from '../lib/warnings';

const CONVERTIBLE_TYPES = ['pdf', 'docx', 'url'] as const;
type ConvertibleType = (typeof CONVERTIBLE_TYPES)[number];

const schema = z
  .object({
    title: z.string().min(1, 'El título es obligatorio').max(300),
    description: z.string().optional(),
    area: z.string().min(1, 'El área es obligatoria'),
    language: z.string().min(1, 'El idioma es obligatorio').default('es'),
    sourceType: z.enum(['text', 'upload', 'pdf', 'docx', 'url']),
    content: z.string().optional(),
    validFrom: z.string().optional(),
    validUntil: z.string().optional(),
    priority: z.coerce.number().min(1).max(100).default(50),
  })
  .refine((data) => data.sourceType === 'upload' || (data.content && data.content.trim().length > 0), {
    message: 'El contenido es obligatorio (para PDF/DOCX/URL, primero convierte a Markdown)',
    path: ['content'],
  })
  .refine(
    (data) => !data.validFrom || !data.validUntil || data.validUntil >= data.validFrom,
    { message: 'La fecha "hasta" no puede ser menor que "desde"', path: ['validUntil'] },
  );

type FormValues = z.infer<typeof schema>;

function isConvertible(sourceType: FormValues['sourceType']): sourceType is ConvertibleType {
  return (CONVERTIBLE_TYPES as readonly string[]).includes(sourceType);
}

export function SourceNewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillTitle = (location.state as { title?: string } | null)?.title ?? '';
  const [file, setFile] = useState<File | null>(null);
  const [convertUrlInput, setConvertUrlInput] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Procedencia + estado de conversión para pdf/docx/url: no se manda al
  // backend hasta que el usuario revisa/edita el Markdown y hace clic en
  // "Guardar" — antes de eso no existe ninguna fuente en la base de datos.
  const [converted, setConverted] = useState(false);
  const [conversionWarnings, setConversionWarnings] = useState<string[]>([]);
  const [provenance, setProvenance] = useState<{ originalFilename?: string; mimeType?: string; sourceUrl?: string }>({});

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { sourceType: 'text', language: 'es', priority: 50, title: prefillTitle },
  });

  const sourceType = watch('sourceType');
  const content = watch('content') ?? '';

  function resetConversion() {
    setConverted(false);
    setConversionWarnings([]);
    setProvenance({});
    setValue('content', '');
  }

  // Cambiar de tipo de fuente invalida cualquier archivo/URL/conversión previa.
  useEffect(() => {
    setFile(null);
    setConvertUrlInput('');
    resetConversion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceType]);

  const convertMutation = useMutation({
    mutationFn: async () => {
      if (sourceType === 'url') {
        if (!convertUrlInput.trim()) throw new Error('Ingresa una URL');
        return sourceConversionApi.fromUrl(convertUrlInput.trim());
      }
      if (!file) throw new Error(`Selecciona un archivo .${sourceType}`);
      return sourceConversionApi.fromFile(file);
    },
    onSuccess: (result) => {
      setValue('content', result.markdown, { shouldValidate: true });
      setConversionWarnings(result.warnings);
      setProvenance({ originalFilename: result.originalFilename, mimeType: result.mimeType, sourceUrl: result.sourceUrl });
      if (result.suggestedTitle && !getValues('title')) {
        setValue('title', result.suggestedTitle, { shouldValidate: true });
      }
      setConverted(true);
    },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setSuccessMessage(null);
    try {
      let result: { id: string; status: string; message: string };

      if (values.sourceType === 'upload') {
        if (!file) {
          setServerError('Selecciona un archivo .txt o .md');
          return;
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', values.title);
        formData.append('sourceType', 'upload');
        if (values.description) formData.append('description', values.description);
        formData.append('area', values.area);
        formData.append('language', values.language);
        formData.append('priority', String(values.priority));
        if (values.validFrom) formData.append('validFrom', values.validFrom);
        if (values.validUntil) formData.append('validUntil', values.validUntil);
        result = await sourcesApi.createFromUpload(formData);
      } else {
        // text, pdf, docx y url llegan todos como sourceType "text": lo único
        // que cambia es de dónde salió el Markdown (provenance), que ya viene
        // guardado en el estado tras la conversión.
        result = await sourcesApi.create({
          title: values.title,
          description: values.description || undefined,
          sourceType: 'text',
          area: values.area,
          language: values.language,
          priority: values.priority,
          validFrom: values.validFrom || undefined,
          validUntil: values.validUntil || undefined,
          content: values.content,
          originalFilename: provenance.originalFilename,
          mimeType: provenance.mimeType,
          sourceUrl: provenance.sourceUrl,
        });
      }

      setSuccessMessage(result.message);
      setTimeout(() => navigate(`/knowledge/${result.id}`), 800);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setServerError('Ya existe una fuente con el mismo contenido. Revisa la bandeja antes de duplicarla.');
      } else {
        setServerError(err instanceof Error ? err.message : 'No se pudo crear la fuente');
      }
    }
  }

  const showSplitEditor = isConvertible(sourceType) && converted;
  const showConvertPanel = isConvertible(sourceType) && !converted;

  return (
    <div className={`space-y-6 ${showSplitEditor ? 'max-w-5xl' : 'max-w-2xl'}`}>
      <div>
        <h1 className="mb-3 text-xl font-bold text-slate-800">Nueva fuente</h1>
        <Stepper current={1} steps={WIZARD_STEPS.map((label) => ({ label }))} />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-card">
        {serverError && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</div>}
        {successMessage && <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{successMessage}</div>}

        <Field label="Tipo de fuente *" error={errors.sourceType?.message}>
          <select {...register('sourceType')} className="input">
            <option value="text">Texto manual / FAQ</option>
            <option value="upload">Archivo (.txt, .md, .csv)</option>
            <option value="pdf">Archivo PDF</option>
            <option value="docx">Archivo Word (.docx)</option>
            <option value="url">Página web (URL)</option>
          </select>
        </Field>

        {showConvertPanel && (
          <div className="space-y-3 rounded-xl border border-dashed border-brand-200 bg-brand-50 p-4">
            <p className="flex items-center text-sm font-medium text-brand-900">
              Paso previo: convertir a Markdown
              <InfoHint text="Esto NO guarda nada todavía. Solo convierte el archivo/URL a Markdown para que lo revises y corrijas antes de mandarlo al pipeline del RAG." />
            </p>

            {sourceType === 'url' ? (
              <input
                value={convertUrlInput}
                onChange={(e) => setConvertUrlInput(e.target.value)}
                placeholder="https://ejemplo.com/pagina"
                className="input"
              />
            ) : (
              <input
                type="file"
                accept={sourceType === 'pdf' ? '.pdf' : '.docx'}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-600"
              />
            )}

            {convertMutation.isError && (
              <p className="text-xs text-red-600">
                {convertMutation.error instanceof ApiError ? convertMutation.error.message : 'No se pudo convertir'}
              </p>
            )}

            <Button type="button" onClick={() => convertMutation.mutate()} loading={convertMutation.isPending}>
              {convertMutation.isPending ? 'Convirtiendo...' : 'Convertir a Markdown'}
            </Button>
          </div>
        )}

        {isConvertible(sourceType) && converted && (
          <div className="space-y-2">
            {conversionWarnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <ul className="list-inside list-disc space-y-0.5">
                  {conversionWarnings.map((w) => (
                    <li key={w}>{humanizeWarning(w)}</li>
                  ))}
                </ul>
              </div>
            )}
            <button type="button" onClick={resetConversion} className="text-xs text-slate-500 hover:underline">
              ← Convertir otro archivo/URL
            </button>
          </div>
        )}

        {(sourceType === 'text' || !isConvertible(sourceType) || converted) && (
          <>
            <Field label="Título *" error={errors.title?.message}>
              <input {...register('title')} className="input" />
            </Field>

            <Field label="Descripción" hint="Nota interna para otros supervisores — no la ve el chat ni el usuario final." error={errors.description?.message}>
              <textarea {...register('description')} rows={2} className="input" />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Área *" hint="Categoría temática (ej. Académica, Bienestar). Se usa para filtrar y también suma puntos en el ranking de búsqueda cuando coincide con el área de la pregunta." error={errors.area?.message}>
                <input {...register('area')} className="input" placeholder="Académica, Bienestar..." />
              </Field>
              <Field label="Idioma *" error={errors.language?.message}>
                <input {...register('language')} className="input" placeholder="es" />
              </Field>
            </div>

            {sourceType === 'text' && (
              <Field label="Contenido *" error={errors.content?.message}>
                <textarea {...register('content')} rows={10} className="input font-mono text-xs" placeholder="# Título de sección&#10;&#10;Contenido..." />
              </Field>
            )}

            {sourceType === 'upload' && (
              <Field label="Archivo *" error={undefined}>
                <input
                  type="file"
                  accept=".txt,.md,.csv"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-600"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Un CSV se convierte automáticamente a texto (una sección por fila) antes de procesarse.
                </p>
              </Field>
            )}

            {showSplitEditor && (
              <Field label="Contenido (Markdown) *" error={errors.content?.message}>
                <MarkdownSplitEditor value={content} onChange={(v) => setValue('content', v, { shouldValidate: true })} />
              </Field>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label="Vigente desde" hint="Fecha desde la que la fuente puede publicarse. Es obligatoria antes de publicar, aunque no aquí en la carga." error={errors.validFrom?.message}>
                <input type="date" {...register('validFrom')} className="input" />
              </Field>
              <Field label="Vigente hasta" hint="Después de esta fecha la fuente pasa a estado 'Vencida' — sigue publicada pero conviene revisarla. Déjala vacía si no vence nunca." error={errors.validUntil?.message}>
                <input type="date" {...register('validUntil')} className="input" />
              </Field>
            </div>

            <Field
              label="Prioridad (1-100)"
              hint="Cuando varias fuentes compiten por una misma pregunta, esta prioridad suma en el ranking (junto con similitud semántica y frescura). No es una jerarquía estricta, solo un peso más."
              error={errors.priority?.message}
            >
              <input type="number" min={1} max={100} {...register('priority')} className="input w-32" />
            </Field>

            <Button type="submit" loading={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar en Fuente de Conocimiento (RAG)'}
            </Button>
          </>
        )}
      </form>
    </div>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 flex items-center font-medium text-slate-700">
        {label}
        {hint && <InfoHint text={hint} />}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
