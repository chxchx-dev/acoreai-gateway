const SENSITIVE_LABELS: Record<string, string> = {
  correo_personal: 'un correo personal',
  telefono: 'un teléfono',
  identificacion_personal: 'un número de identificación',
  credencial_o_token: 'una posible contraseña o token',
  tarjeta_de_pago: 'un posible número de tarjeta',
};

const STATIC_LABELS: Record<string, string> = {
  documento_sin_texto_extraible: 'No se pudo extraer texto del documento.',
  texto_demasiado_corto: 'El texto extraído es muy corto; revisa que la carga esté completa.',
  fecha_de_vencimiento_ausente: 'No tiene fecha de vencimiento (vigente hasta).',
  area_sin_asignar: 'No tiene un área asignada.',
  idioma_no_detectado: 'No se detectó el idioma.',
};

export function humanizeWarning(code: string): string {
  if (STATIC_LABELS[code]) return STATIC_LABELS[code];

  const [prefix, arg] = code.split(':');

  if (prefix === 'chunks_demasiado_pequenos') {
    return `${arg} chunk(s) muy pequeños (menos de 50 tokens aprox.).`;
  }
  if (prefix === 'chunks_demasiado_grandes') {
    return `${arg} chunk(s) muy grandes (más de 1200 tokens aprox.).`;
  }
  if (prefix === 'posible_informacion_sensible') {
    return `Posible dato sensible: ${SENSITIVE_LABELS[arg] ?? arg}. Revisa antes de aprobar.`;
  }

  return code;
}
