# Fase 6 — Panel admin para administrar la data

## Fallo

Si construyes solo el backend, el supervisor seguirá dependiendo de ti para cargar y aprobar documentos. Eso no es producto, es soporte manual disfrazado.

## Por qué duele

Un RAG controlado necesita interfaz. Si el usuario no puede revisar texto, editar chunks, aprobar, publicar y probar preguntas, el sistema no escala ni se puede vender bien.

## Acción

Crea un sitio administrativo simple, serio y funcional. Menos decoración, más control.

---

## Objetivo de la fase

Crear el sitio web para administrar el Centro de Conocimiento de Olan AI Gateway.

---

## Stack frontend recomendado

```txt
React + Vite
TypeScript
TailwindCSS
React Router
TanStack Query
React Hook Form
Zod
Zustand opcional
```

---

## Rutas del panel

```txt
/admin/login
/admin/dashboard
/admin/knowledge
/admin/knowledge/new
/admin/knowledge/:sourceId
/admin/knowledge/:sourceId/review
/admin/knowledge/:sourceId/chunks
/admin/knowledge/:sourceId/test
/admin/knowledge/audit
/admin/settings/categories
/admin/settings/users
```

---

## Layout principal

```txt
┌───────────────────────────────────────────────────────┐
│ Topbar: Tenant | Usuario | Estado del Gateway          │
├───────────────┬───────────────────────────────────────┤
│ Sidebar       │ Contenido                              │
│               │                                       │
│ Dashboard     │                                       │
│ Fuentes       │                                       │
│ Revisión      │                                       │
│ Publicadas    │                                       │
│ Auditoría     │                                       │
│ Configuración │                                       │
└───────────────┴───────────────────────────────────────┘
```

---

## Pantalla 1 — Dashboard

Cards:

```txt
- Fuentes publicadas
- Pendientes de revisión
- Fuentes vencidas
- Chunks publicados
- Embeddings fallidos
- Preguntas sin respuesta
```

Tabla rápida:

```txt
Últimas fuentes cargadas
Últimas revisiones
Últimas publicaciones
```

Alertas:

```txt
- documentos próximos a vencer
- jobs fallidos
- documentos sin vigencia
- fuentes duplicadas
```

---

## Pantalla 2 — Bandeja de fuentes

Filtros:

```txt
Estado
Área
Idioma
Tipo
Responsable
Fecha de carga
Vigencia
```

Columnas:

```txt
Título
Área
Tipo
Estado
Versión
Chunks
Subido por
Vence
Acciones
```

Acciones:

```txt
Ver detalle
Enviar a revisión
Publicar
Archivar
Crear nueva versión
```

---

## Pantalla 3 — Nueva fuente

Formulario:

```txt
Título *
Descripción
Área *
Idioma *
Tipo de fuente *
Archivo / URL / Texto manual *
Vigente desde
Vigente hasta
Prioridad
Responsable
```

Validaciones:

```txt
- título obligatorio
- área obligatoria
- archivo o contenido obligatorio
- fecha hasta no puede ser menor que fecha desde
- prioridad entre 1 y 100
```

Botón:

```txt
[Guardar y procesar]
```

Respuesta visual:

```txt
Fuente creada. La extracción quedó en cola.
```

---

## Pantalla 4 — Detalle de documento

Secciones:

```txt
1. Resumen
2. Metadata
3. Archivo original
4. Texto extraído
5. Chunks
6. Historial
7. Jobs
```

Estados visuales:

```txt
Pendiente extracción
Extraído
Chunked
Pendiente revisión
Aprobado
Listo para publicar
Publicado
Archivado
```

---

## Pantalla 5 — Revisión de chunks

Vista:

```txt
┌──────────────────────────────┐
│ Chunk 1                      │
│ Página 1 | 650 tokens        │
│                              │
│ Contenido...                 │
│                              │
│ [Editar] [Aprobar] [Rechazar]│
└──────────────────────────────┘
```

Funciones:

```txt
- editar contenido
- aprobar chunk
- rechazar chunk
- ver página/sección
- buscar dentro de chunks
- marcar sensible
```

Acción global:

```txt
[Aprobar documento completo]
[Rechazar]
[Pedir cambios]
```

---

## Pantalla 6 — Prueba antes de publicar

Esta pantalla es clave para vender.

Input:

```txt
Pregunta de prueba:
¿Cuáles son los requisitos de matrícula?
```

Salida:

```txt
Respuesta generada
Fuentes usadas
Chunks recuperados
Score
Advertencias
```

Botones:

```txt
[Probar pregunta]
[Marcar respuesta como correcta]
[Marcar respuesta como insuficiente]
[Publicar fuente]
```

---

## Pantalla 7 — Auditoría

Filtros:

```txt
Usuario
Acción
Fuente
Fecha
Estado
```

Columnas:

```txt
Fecha
Usuario
Acción
Entidad
Antes
Después
IP
```

Ejemplos:

```txt
Ana aprobó Política de matrícula 2026
Carlos editó Chunk 4
Admin publicó Manual Académico v2
Sistema archivó Manual Académico v1
```

---

## Pantalla 8 — Preguntas sin respuesta

Muestra preguntas donde el chat no encontró contexto suficiente.

Columnas:

```txt
Pregunta
Usuario
Área
Fecha
Resultado
Acción sugerida
```

Acciones:

```txt
Crear fuente desde pregunta
Asignar a supervisor
Marcar como no aplica
```

Esto es oro porque convierte fallos del chat en backlog de conocimiento.

---

## Diseño visual sugerido

Estilo:

```txt
- limpio
- institucional
- claro para supervisores no técnicos
- estados con colores
- tablas legibles
- botones de acción obvios
```

No hagas una UI saturada. El supervisor debe entenderla en 30 segundos.

---

## Componentes

```txt
KnowledgeStatusBadge
SourceTable
SourceFilters
UploadSourceForm
ExtractedTextPreview
ChunkReviewCard
ReviewChecklist
AuditTimeline
TestQuestionPanel
JobStatusCard
```

---

## Contratos API usados por frontend

```txt
GET    /knowledge/sources
POST   /knowledge/sources
GET    /knowledge/sources/:id
POST   /knowledge/sources/:id/submit-review
POST   /knowledge/sources/:id/review
POST   /knowledge/sources/:id/publish
POST   /knowledge/sources/:id/archive
GET    /knowledge/sources/:id/chunks
PATCH  /knowledge/chunks/:id
POST   /knowledge/chunks/:id/approve
POST   /knowledge/chunks/:id/reject
POST   /knowledge/test-question
GET    /knowledge/audit
```

---

## Resultado esperado de la fase

```txt
- Panel admin navegable
- Carga de fuentes desde UI
- Revisión de texto y chunks
- Aprobación/publicación desde UI
- Prueba de preguntas antes de publicar
- Auditoría visible
```

## Plazo

```txt
Tiempo máximo: 2 días para MVP visual funcional.
```
