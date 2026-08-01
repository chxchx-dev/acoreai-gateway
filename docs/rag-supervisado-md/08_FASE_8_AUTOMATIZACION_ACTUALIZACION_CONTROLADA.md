# Fase 8 — Automatización y actualización controlada

## Fallo

Automatizar publicación desde el día 1 es irresponsable. La IA no debe decidir qué conocimiento institucional queda activo.

## Por qué duele

Una URL rota, un documento viejo, un Excel mal editado o una fuente externa cambiada puede contaminar el RAG sin que nadie lo note.

## Acción

Automatiza detección y preparación. Mantén publicación bajo control humano.

---

## Objetivo de la fase

Agregar actualización programada sin perder supervisión.

```txt
Sistema detecta cambio
  ↓
crea nueva versión
  ↓
extrae texto
  ↓
compara cambios
  ↓
marca pending_review
  ↓
supervisor aprueba
  ↓
admin publica
```

---

## Fuentes automatizables

```txt
URLs autorizadas
Google Drive
OneDrive
Carpetas internas
APIs internas
RSS institucional
Base de datos institucional
```

Para MVP, empieza solo con:

```txt
URL autorizada
Texto manual
Archivo manual
```

---

## Watchers programados

Tabla sugerida:

```sql
CREATE TABLE knowledge_watchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  target_url TEXT,
  schedule_cron TEXT NOT NULL,
  last_checked_at TIMESTAMP,
  last_checksum TEXT,
  status TEXT DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Flujo de actualización por URL

```txt
1. Worker revisa URL.
2. Calcula checksum del contenido.
3. Si no cambió, no hace nada.
4. Si cambió, crea nueva versión.
5. Extrae texto.
6. Genera diff contra versión publicada.
7. Marca pending_review.
8. Notifica al supervisor.
```

---

## No publicar automáticamente

Regla:

```txt
watcher nunca llama /publish
```

Solo puede crear:

```txt
pending_review
```

---

## Comparación automática

La IA puede ayudar con:

```txt
- resumen de cambios
- posibles contradicciones
- fecha de vencimiento detectada
- preguntas que responde el documento
- temas principales
- sensibilidad posible
```

Pero la decisión final es humana.

---

## Resumen de cambios sugerido

```json
{
  "changeSummary": {
    "added": [
      "Se agregó plazo de matrícula extraordinaria."
    ],
    "removed": [
      "Se eliminó referencia a calendario 2025."
    ],
    "modified": [
      {
        "before": "Descuento máximo 10%",
        "after": "Descuento máximo 15%"
      }
    ],
    "riskLevel": "medium"
  }
}
```

---

## Alertas al supervisor

Eventos:

```txt
- nueva versión detectada
- fuente próxima a vencer
- fuente vencida
- embedding fallido
- documento duplicado
- contradicción posible
```

Canales:

```txt
- dashboard
- email después
- notificación interna después
```

---

## Expiración automática

Job diario:

```txt
Si valid_until < hoy:
  source.status = expired
  chunks.status = expired
```

El chat no usa expired.

---

## Modo asistido por IA

La IA puede generar:

```txt
- resumen para el supervisor
- sugerencia de categoría
- tags
- preguntas frecuentes posibles
- detección de secciones importantes
```

No puede:

```txt
- aprobar
- publicar
- archivar documentos activos sin regla humana
```

---

## Resultado esperado de la fase

```txt
- Watchers definidos
- Expiración automática
- Nuevas versiones pendientes de revisión
- Comparación de cambios
- Alertas en dashboard
```

## Plazo

```txt
Después del MVP. Tiempo sugerido: 2 a 3 días.
```
