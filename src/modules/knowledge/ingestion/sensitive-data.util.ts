// Detección básica de datos sensibles (Fase 7). Nunca bloquea la carga:
// solo agrega un warning para que el supervisor decida antes de aprobar.
const PATTERNS: { label: string; regex: RegExp }[] = [
  { label: 'correo_personal', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/ },
  { label: 'telefono', regex: /\b(?:\+?57)?[ -]?3\d{2}[ -]?\d{3}[ -]?\d{4}\b/ },
  {
    label: 'identificacion_personal',
    regex: /\b(c[eé]dula|documento de identidad|n[uú]mero de identificaci[oó]n|nit)\D{0,10}\d{5,12}\b/i,
  },
  { label: 'credencial_o_token', regex: /\b(password|contrase[ñn]a|api[_ -]?key|secret|token)\s*[:=]\s*\S+/i },
  { label: 'tarjeta_de_pago', regex: /\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/ },
];

export function detectSensitiveData(text: string): string[] {
  const found = PATTERNS.filter((p) => p.regex.test(text)).map((p) => p.label);
  return found;
}
