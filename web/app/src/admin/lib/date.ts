// Los campos validFrom/validUntil son columnas DATE (sin hora). El backend los
// serializa como ISO con hora UTC medianoche (ej. "2026-01-01T00:00:00.000Z").
// Si se pasan por `new Date(...).toLocaleDateString()` en un huso horario
// negativo (América), se muestran un día antes. Esta función lee solo la
// parte de fecha (YYYY-MM-DD) sin pasar por conversión de zona horaria.
export function formatDateOnly(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}
