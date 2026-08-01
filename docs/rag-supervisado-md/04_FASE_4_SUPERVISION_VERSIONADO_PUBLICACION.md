# Fase 4 — Supervisión humana, versionado y publicación

## Fallo

Decir “tendrá supervisor” pero solo poner un botón de subir archivo es falso control.

## Por qué duele

Si el humano no puede revisar, corregir, rechazar, comentar, comparar versiones y decidir qué se publica, el sistema no está supervisado. Solo tiene una fachada administrativa.

## Acción

Crea un flujo de revisión con decisiones explícitas y trazabilidad.

---

## Objetivo de la fase

Permitir que un supervisor controle qué conocimiento entra al RAG.

```txt
pending_review
  ↓
approved / rejected / needs_changes
  ↓
embedding_pending
  ↓
ready_to_publish
  ↓
published
```

---

## Roles en el flujo

### Uploader

```txt
- sube fuentes
- edita metadata mientras está en draft
- no aprueba
- no publica
```

### Supervisor

```txt
- revisa texto extraído
- revisa chunks
- edita chunks
- aprueba o rechaza
- pide cambios
```

### Admin

```txt
- publica
- archiva
- reemplaza versiones
- gestiona roles
```

---

## Bandeja de revisión

Columnas:

```txt
Título
Área
Estado
Versión
Subido por
Fecha de carga
Vigencia
Chunks
Warnings
Acciones
```

Estados visibles:

```txt
Pendiente de revisión
Necesita cambios
Aprobado
Rechazado
Listo para publicar
Publicado
Archivado
Vencido
```

---

## Detalle de revisión

El supervisor debe ver:

```txt
1. Metadata
2. Archivo original
3. Texto extraído
4. Chunks
5. Warnings
6. Historial
7. Preguntas de prueba
```

Acciones:

```txt
[Aprobar documento]
[Rechazar documento]
[Pedir cambios]
[Editar chunk]
[Eliminar chunk]
[Aprobar chunk]
[Marcar sensible]
[Comparar con versión anterior]
```

---

## Checklist antes de aprobar

```txt
[ ] El texto extraído es legible.
[ ] El documento pertenece al área correcta.
[ ] La fecha de vigencia es correcta.
[ ] No contiene datos sensibles no permitidos.
[ ] No contradice una fuente activa de mayor prioridad.
[ ] Los chunks son entendibles.
[ ] La fuente tiene responsable.
[ ] El documento puede ser usado por el chat.
```

Guarda este checklist como JSONB en `knowledge_reviews`.

---

## Decisiones de revisión

### Aprobar

```json
{
  "decision": "approved",
  "comments": "Documento válido para publicación."
}
```

Resultado:

```txt
source.status = embedding_pending
chunks.status = approved
crear job generate_embeddings
```

### Rechazar

```json
{
  "decision": "rejected",
  "comments": "Documento desactualizado."
}
```

Resultado:

```txt
source.status = rejected
chunks.status = rejected
no se generan embeddings
```

### Pedir cambios

```json
{
  "decision": "needs_changes",
  "comments": "Falta fecha de vigencia y responsable."
}
```

Resultado:

```txt
source.status = needs_changes
```

---

## Versionado correcto

Nunca reemplaces una fuente publicada directamente.

### Flujo de nueva versión

```txt
Manual Académico v1 → published
Manual Académico v2 → pending_review
Supervisor revisa diferencias
Admin publica v2
v1 → archived
v2 → published
```

---

## Comparación entre versiones

Muestra diferencias:

```txt
Antes:
"El descuento máximo será del 10%."

Ahora:
"El descuento máximo será del 15% con aprobación administrativa."
```

El supervisor debe poder ver:

```txt
- texto agregado
- texto eliminado
- texto modificado
- secciones afectadas
- chunks nuevos
- chunks eliminados
```

---

## Publicación

Publicar no es lo mismo que aprobar.

### Aprobar

Significa:

```txt
El humano validó el contenido.
```

### Publicar

Significa:

```txt
El chat ya puede usarlo.
```

Esto permite preparar una fuente sin liberarla todavía.

---

## Endpoint de aprobación

```http
POST /knowledge/sources/:id/review
```

Body:

```json
{
  "decision": "approved",
  "comments": "Validado por coordinación.",
  "checklist": {
    "texto_extraido_correcto": true,
    "vigencia_confirmada": true,
    "sin_datos_sensibles": true,
    "sin_contradicciones": true
  }
}
```

---

## Endpoint de publicación

```http
POST /knowledge/sources/:id/publish
```

Reglas:

```txt
- source.status debe ser ready_to_publish
- todos los chunks publicables deben tener embedding
- debe existir review approved
- debe tener valid_from
- debe tener área
```

Resultado:

```txt
source.status = published
chunks.status = published
published_at = now()
```

---

## Endpoint de archivado

```http
POST /knowledge/sources/:id/archive
```

Body:

```json
{
  "reason": "Reemplazado por versión 2"
}
```

Resultado:

```txt
source.status = archived
chunks.status = archived
```

---

## Regla crítica para chat

El chat jamás debe interpretar:

```txt
approved = usable
```

Solo puede usar:

```txt
published = usable
```

---

## Resultado esperado de la fase

```txt
- Bandeja de revisión funcional
- Checklist guardado
- Aprobar/rechazar/pedir cambios
- Publicar separado de aprobar
- Versiones sin borrar historial
- Auditoría de cada cambio
```

## Plazo

```txt
Tiempo máximo: 1 día.
```
