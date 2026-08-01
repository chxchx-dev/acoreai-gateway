# Fase 1 — Arquitectura del RAG supervisado

## Fallo

Querer meter RAG dentro del `/chat` como si fuera un helper más es arquitectura floja. Eso funciona para una demo de YouTube, no para un producto de Olan.

## Por qué duele

Si mezclas carga de archivos, extracción, aprobación, embeddings y chat en un solo flujo, después no podrás auditar errores, reintentar procesos, versionar documentos ni demostrar control ante un cliente.

## Acción

Separa el sistema en módulos claros desde el día 1.

---

## Objetivo de la fase

Diseñar la arquitectura base de `olan-ai-gateway` para soportar:

```txt
- Ingesta de fuentes
- Extracción de texto
- Chunking
- Revisión humana
- Aprobación
- Publicación
- Búsqueda vectorial
- Chat con contexto aprobado
- Auditoría completa
```

---

## Arquitectura conceptual

```txt
                 ┌──────────────────────┐
                 │      Admin Web       │
                 │ Centro Conocimiento  │
                 └──────────┬───────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│                 Olan AI Gateway                      │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Knowledge    │  │ Ingestion    │  │ Review     │ │
│  │ Sources      │  │ Pipeline     │  │ Workflow   │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
│         │                 │                │        │
│         ▼                 ▼                ▼        │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Embeddings   │  │ Vector       │  │ Audit      │ │
│  │ Service      │  │ Search       │  │ Logs       │ │
│  └──────┬───────┘  └──────┬───────┘  └────────────┘ │
│         │                 │                         │
│         ▼                 ▼                         │
│  ┌───────────────────────────────────────────────┐  │
│  │             Chat RAG Service                  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌────────────────────────────────────┐
        │ PostgreSQL + pgvector + Redis      │
        └────────────────────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │ Ollama Local     │
                  └──────────────────┘
```

---

## Módulos backend recomendados en NestJS

```txt
src/
  modules/
    auth/
    tenants/
    knowledge/
      sources/
      chunks/
      reviews/
      versions/
      publishing/
      audit/
    ingestion/
      extractors/
      chunkers/
      processors/
    embeddings/
    retrieval/
    chat/
    admin/
    health/
```

---

## Responsabilidad de cada módulo

### `knowledge/sources`

Gestiona la fuente principal.

```txt
- crear fuente
- editar metadata
- cambiar estado
- listar fuentes
- consultar detalle
- asociar archivo original
```

### `ingestion`

Procesa archivos o fuentes externas.

```txt
- extraer texto
- limpiar texto
- detectar idioma
- detectar páginas/secciones
- dividir chunks
- calcular tokens aproximados
- preparar vista previa
```

### `reviews`

Controla aprobación humana.

```txt
- enviar a revisión
- aprobar
- rechazar
- pedir cambios
- comentar
- registrar reviewer
```

### `embeddings`

Genera vectores después de aprobación.

```txt
- validar modelo embedding
- generar embedding por chunk
- guardar dimensión
- reintentar fallos
- marcar chunks indexados
```

### `retrieval`

Busca conocimiento aprobado.

```txt
- búsqueda vectorial
- filtros por tenant
- filtros por estado
- filtros por vigencia
- filtros por área
- ranking por prioridad y similitud
```

### `chat`

Responde al usuario final usando contexto.

```txt
- recibir pregunta
- generar embedding de pregunta
- recuperar chunks publicados
- construir prompt
- llamar al modelo
- devolver respuesta con fuentes
```

---

## Flujo principal

```txt
1. Uploader registra fuente.
2. Sistema guarda metadata.
3. Sistema extrae texto.
4. Sistema genera chunks en estado draft/pending_review.
5. Supervisor revisa.
6. Supervisor aprueba.
7. Sistema genera embeddings.
8. Admin publica.
9. Chat usa solo chunks published.
```

---

## Flujo de errores

No ocultes los errores. Muéstralos en el panel.

```txt
- extracción fallida
- archivo corrupto
- documento sin texto
- OCR requerido
- chunks vacíos
- embedding fallido
- modelo Ollama no disponible
- dimensión de vector incompatible
```

Cada fallo debe quedar en:

```txt
knowledge_processing_jobs
knowledge_audit_logs
```

---

## Decisión importante: jobs asíncronos

No hagas extracción ni embeddings dentro de la request principal.

### Incorrecto

```txt
POST /knowledge/sources
  → sube archivo
  → extrae texto
  → genera chunks
  → crea embeddings
  → responde tarde o falla
```

### Correcto

```txt
POST /knowledge/sources
  → registra fuente
  → crea job
  → responde rápido

Worker:
  → procesa extracción
  → procesa chunks
  → espera revisión
```

---

## Componentes mínimos para MVP

```txt
Backend:
- KnowledgeSourceController
- KnowledgeChunkController
- KnowledgeReviewController
- KnowledgePublishController
- RagChatController

Workers:
- ExtractTextJob
- ChunkTextJob
- GenerateEmbeddingsJob

DB:
- PostgreSQL
- pgvector
- Redis para cola
```

---

## Resultado esperado de la fase

Al terminar esta fase debes tener:

```txt
- Diagrama de flujo definido
- Módulos NestJS creados
- Estados de fuente definidos
- Contrato de endpoints definido
- Separación clara entre revisión y publicación
```

## Plazo

```txt
Tiempo máximo: 1 día.
```

Si te demoras más, estás diseñando de más y construyendo de menos.
