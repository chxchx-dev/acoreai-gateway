# Fase 3 — Ingesta, extracción, limpieza y chunking

## Fallo

Subir archivos y partirlos de una es pereza técnica. El texto mal extraído se vuelve basura persistente dentro del RAG.

## Por qué duele

Un PDF escaneado, un Excel con columnas rotas o un DOCX con encabezados repetidos puede generar chunks inútiles. Si esos chunks llegan a embeddings, el chat recuperará ruido con mucha seguridad.

## Acción

Procesa todo en etapas visibles y auditables.

---

## Objetivo de la fase

Construir el pipeline que convierte una fuente en texto revisable y chunks editables.

```txt
archivo/url/manual
  ↓
registro de fuente
  ↓
extracción de texto
  ↓
normalización
  ↓
chunking
  ↓
vista previa para supervisor
```

---

## Tipos de fuente MVP

```txt
PDF
TXT
MD
DOCX
CSV
XLSX
URL autorizada
FAQ manual
Artículo escrito desde panel
```

Para el primer MVP, prioriza:

```txt
1. TXT / MD
2. PDF con texto
3. DOCX
4. CSV / XLSX
```

No empieces con OCR si el servidor es normalito. OCR es otra fase.

---

## Metadata obligatoria al cargar

```json
{
  "title": "Política de matrícula 2026",
  "description": "Documento oficial de matrícula",
  "sourceType": "pdf",
  "area": "Académica",
  "language": "es",
  "validFrom": "2026-01-01",
  "validUntil": "2026-12-31",
  "priority": 80,
  "responsibleUserId": "uuid"
}
```

---

## Endpoint de carga

```http
POST /knowledge/sources
Content-Type: multipart/form-data
```

Campos:

```txt
file
title
description
area
language
validFrom
validUntil
priority
```

Respuesta:

```json
{
  "id": "source_uuid",
  "status": "pending_extraction",
  "message": "Fuente registrada. La extracción quedó en cola."
}
```

---

## Pipeline de extracción

### Paso 1: guardar archivo original

```txt
/storage/knowledge/{tenant_id}/{source_id}/original.pdf
```

Guarda:

```txt
- nombre original
- mime type
- tamaño
- checksum
- usuario
- fecha de carga
```

### Paso 2: detectar duplicados

Compara `checksum`.

```txt
Si existe el mismo archivo:
- no lo indexes otra vez
- muestra advertencia
- permite crear nueva versión si el usuario insiste
```

### Paso 3: extraer texto

Resultado esperado:

```json
{
  "sourceId": "uuid",
  "pagesDetected": 12,
  "characters": 24500,
  "warnings": [],
  "extractedText": "..."
}
```

### Paso 4: guardar versión

```txt
knowledge_source_versions.extracted_text
knowledge_source_versions.text_hash
```

---

## Normalización de texto

Antes de chunking:

```txt
- quitar espacios repetidos
- normalizar saltos de línea
- eliminar encabezados repetidos cuando sea evidente
- conservar títulos y subtítulos
- conservar números de página si existen
- no borrar fechas
- no borrar nombres de políticas
- no borrar notas legales
```

No resumas el documento antes de crear chunks. Primero guarda el texto real.

---

## Chunking recomendado

### Configuración base

```txt
chunk_size: 700 tokens aproximados
overlap: 120 tokens aproximados
top_k_chat: 6
top_k_search: 10
```

### Regla práctica

```txt
- No cortar tablas si se puede evitar.
- No cortar listas de requisitos a la mitad.
- No mezclar secciones distintas si tienen títulos claros.
- Mantener el título de sección en cada chunk.
```

---

## Estructura de chunk

```json
{
  "sourceId": "uuid",
  "versionId": "uuid",
  "chunkIndex": 4,
  "sectionTitle": "Matrícula ordinaria",
  "content": "El plazo máximo para realizar matrícula ordinaria será...",
  "pageStart": 3,
  "pageEnd": 3,
  "tokensCount": 681,
  "status": "pending_review"
}
```

---

## Vista previa obligatoria

El supervisor debe ver:

```txt
- texto extraído completo
- número de páginas detectadas
- warnings
- chunks generados
- cantidad de tokens
- fuente original
- metadata
```

Botones:

```txt
[Enviar a revisión]
[Reprocesar extracción]
[Editar metadata]
[Eliminar fuente]
```

---

## Warnings que debes detectar

```txt
- Documento sin texto extraíble
- Texto demasiado corto
- Archivo duplicado
- Fecha de vencimiento ausente
- Área sin asignar
- Idioma no detectado
- Chunks demasiado pequeños
- Chunks demasiado grandes
- Posible información sensible
```

---

## Flujo con BullMQ

```txt
Queue: knowledge-processing

Jobs:
- extract-text
- normalize-text
- chunk-text
```

Ejemplo conceptual:

```ts
await knowledgeQueue.add('extract-text', {
  tenantId,
  sourceId,
  versionId,
  filePath
});
```

---

## No hagas esto

```txt
- No generar embeddings antes de revisión.
- No publicar automáticamente.
- No ocultar texto extraído.
- No mezclar chunks de varias versiones activas.
- No permitir archivos sin metadata mínima.
```

---

## Resultado esperado de la fase

```txt
- Subida de archivos funcionando
- Texto extraído visible
- Chunks generados
- Chunks editables
- Fuente lista para revisión
```

## Plazo

```txt
Tiempo máximo: 1 día.
```
