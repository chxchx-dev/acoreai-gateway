import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { automationProcessesApi } from '../lib/endpoints';
import { ApiError } from '../lib/api';
import { InfoHint } from '../components/InfoHint';
import { Button } from '../components/Button';

const schema = z.object({
  slug: z
    .string()
    .min(1, 'El slug es obligatorio')
    .max(120)
    .regex(/^[a-z0-9_]+$/, 'Solo minúsculas, números y guiones bajos (ej. crear_proceso)'),
  name: z.string().min(1, 'El nombre es obligatorio').max(200),
  platform: z.string().max(50).default('acoreai'),
  role: z.string().max(80).optional(),
  objective: z.string().optional(),
  requiredInputs: z.string().optional(),
  optionalInputs: z.string().optional(),
  restrictions: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function toList(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export function AutomationProcessNewPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { platform: 'acoreai' } });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const process = await automationProcessesApi.create({
        slug: values.slug,
        name: values.name,
        platform: values.platform,
        role: values.role || undefined,
        objective: values.objective || undefined,
        requiredInputs: toList(values.requiredInputs),
        optionalInputs: toList(values.optionalInputs),
        restrictions: toList(values.restrictions),
      });
      navigate(`/automation/${process.id}`);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'No se pudo crear el proceso');
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-xl font-bold text-slate-800">Nuevo proceso de automatización</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-card">
        {serverError && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</div>}

        <Field
          label="Slug *"
          hint="Identificador único en minúsculas, sin espacios (ej. crear_proceso). No se puede cambiar después."
          error={errors.slug?.message}
        >
          <input {...register('slug')} className="input" placeholder="crear_proceso" />
        </Field>

        <Field label="Nombre *" hint="Nombre legible para mostrar en la lista (ej. 'Crear actividad en ACOREAI')." error={errors.name?.message}>
          <input {...register('name')} className="input" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Plataforma" hint="Dónde se ejecuta este proceso." error={errors.platform?.message}>
            <input {...register('platform')} className="input" />
          </Field>
          <Field label="Rol" hint="Quién ejecuta este proceso (ej. 'profesor', 'coordinador')." error={errors.role?.message}>
            <input {...register('role')} className="input" placeholder="profesor" />
          </Field>
        </div>

        <Field label="Objetivo" hint="Qué logra el proceso cuando se ejecuta completo." error={errors.objective?.message}>
          <textarea {...register('objective')} rows={3} className="input" />
        </Field>

        <Field
          label="Entradas requeridas"
          hint="Datos obligatorios para poder ejecutar, separados por coma (ej. curso, materia, fecha_entrega)."
          error={errors.requiredInputs?.message}
        >
          <input {...register('requiredInputs')} className="input" placeholder="curso, materia, fecha_entrega, puntaje" />
        </Field>

        <Field
          label="Entradas opcionales"
          hint="Datos que mejoran el resultado pero no son obligatorios, separados por coma."
          error={errors.optionalInputs?.message}
        >
          <input {...register('optionalInputs')} className="input" placeholder="rubrica, instrucciones_adicionales" />
        </Field>

        <Field
          label="Restricciones"
          hint="Límites duros que el proceso nunca puede romper, separados por coma (ej. no_publicar_sin_confirmacion_humana)."
          error={errors.restrictions?.message}
        >
          <input {...register('restrictions')} className="input" placeholder="no_publicar_sin_confirmacion_humana" />
        </Field>

        <Button type="submit" loading={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Crear proceso'}
        </Button>
      </form>
    </div>
  );
}

function Field({ label, hint, error, children }: { label: string; hint: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 flex items-center font-medium text-slate-700">
        {label}
        <InfoHint text={hint} />
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
