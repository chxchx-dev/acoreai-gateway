# Fase 2 — Modelo de datos con PostgreSQL + pgvector

## Fallo

Tu RAG no se controla con buenas intenciones. Se controla con estados, tablas, relaciones, vigencias, versiones y auditoría.

## Por qué duele

Si no modelas bien la data, después no podrás responder preguntas simples como: “¿quién aprobó este dato?”, “¿qué versión estaba activa?”, “¿por qué el chat respondió eso?” o “¿qué documento originó esa respuesta?”.

## Acción

Implementa un modelo de datos explícito. No guardes chunks como texto suelto.

---

## Estados oficiales

### Fuente

```txt
draft
pending_extraction
extracted
chunked
pending_review
needs_changes
approved
embedding_pending
embedding_failed
ready_to_publish
published
rejected
archived
expired
```

### Chunk

```txt
draft
pending_review
approved
rejected
published
archived
expired
```

### Job

```txt
queued
running
completed
failed
cancelled
```

---

## Tablas mínimas

```txt
knowledge_sources
knowledge_source_versions
knowledge_chunks
knowledge_reviews
knowledge_processing_jobs
knowledge_audit_logs
knowledge_search_logs
knowledge_answer_sources
```

---

## SQL base

> Ajusta nombres al estándar actual de tu proyecto.

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL,
  area TEXT,
  language TEXT DEFAULT 'es',
  priority INT DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'draft',
  file_url TEXT,
  original_filename TEXT,
  mime_type TEXT,
  checksum TEXT,
  current_version INT DEFAULT 1,
  valid_from DATE,
  valid_until DATE,
  uploaded_by UUID,
  reviewed_by UUID,
  published_by UUID,
  reviewed_at TIMESTAMP,
  published_at TIMESTAMP,
  archived_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Versiones

```sql
CREATE TABLE knowledge_source_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  version INT NOT NULL,
  title TEXT NOT NULL,
  extracted_text TEXT,
  text_hash TEXT,
  change_summary TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source_id, version)
);
```

---

## Chunks

La dimensión del vector depende del modelo de embeddings. No la inventes.

Ejemplo si tu modelo genera 768 dimensiones:

```sql
CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  version_id UUID REFERENCES knowledge_source_versions(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  normalized_content TEXT,
  content_hash TEXT,
  embedding VECTOR(768),
  embedding_model TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  page_start INT,
  page_end INT,
  section_title TEXT,
  tokens_count INT,
  priority INT DEFAULT 50,
  valid_from DATE,
  valid_until DATE,
  approved_by UUID,
  approved_at TIMESTAMP,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source_id, version_id, chunk_index)
);
```

Si usas `embeddinggemma`, valida la dimensión real con una llamada de prueba antes de crear la columna final. En producción, bloquea un modelo de embedding por tenant o por sistema para no mezclar dimensiones.

---

## Reviews

```sql
CREATE TABLE knowledge_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  version_id UUID REFERENCES knowledge_source_versions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  decision TEXT NOT NULL,
  comments TEXT,
  checklist JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

Checklist sugerido:

```json
{
  "texto_extraido_correcto": true,
  "vigencia_confirmada": true,
  "sin_datos_sensibles": true,
  "sin_contradicciones": true,
  "categoria_correcta": true,
  "fuente_confiable": true
}
```

---

## Jobs de procesamiento

```sql
CREATE TABLE knowledge_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  source_id UUID REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  version_id UUID REFERENCES knowledge_source_versions(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INT DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Tipos de job:

```txt
extract_text
chunk_text
generate_embeddings
detect_duplicates
compare_versions
validate_expiration
```

---

## Auditoría

```sql
CREATE TABLE knowledge_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  user_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Acciones mínimas:

```txt
source.created
source.updated
source.submitted_review
source.approved
source.rejected
source.published
source.archived
chunk.edited
chunk.approved
chunk.rejected
embedding.generated
chat.source_used
```

---

## Logs de búsqueda

```sql
CREATE TABLE knowledge_search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  top_k INT,
  result_count INT,
  latency_ms INT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Fuentes usadas en respuestas

```sql
CREATE TABLE knowledge_answer_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  chat_message_id UUID,
  source_id UUID NOT NULL,
  chunk_id UUID NOT NULL,
  score NUMERIC,
  title TEXT,
  page_start INT,
  page_end INT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Índices recomendados

```sql
CREATE INDEX idx_sources_tenant_status
ON knowledge_sources(tenant_id, status);

CREATE INDEX idx_sources_validity
ON knowledge_sources(valid_from, valid_until);

CREATE INDEX idx_chunks_tenant_status
ON knowledge_chunks(tenant_id, status);

CREATE INDEX idx_chunks_source_version
ON knowledge_chunks(source_id, version_id);

CREATE INDEX idx_chunks_validity
ON knowledge_chunks(valid_from, valid_until);
```

Índice vectorial ejemplo:

```sql
CREATE INDEX idx_chunks_embedding_hnsw
ON knowledge_chunks
USING hnsw (embedding vector_cosine_ops);
```

Para un MVP pequeño puedes empezar sin índice vectorial y agregarlo cuando tengas volumen real. No optimices antes de tener data.

---

## Prisma recomendado

Usa Prisma para:

```txt
- sources
- versions
- reviews
- jobs
- audit logs
- permisos
```

Usa SQL crudo para:

```txt
- consultas vectoriales
- índices pgvector
- operaciones específicas con VECTOR
```

Ejemplo conceptual con `$queryRaw`:

```ts
const rows = await prisma.$queryRaw`
  SELECT id, source_id, content, title, page_start,
         1 - (embedding <=> ${queryEmbedding}::vector) AS score
  FROM knowledge_chunks
  WHERE tenant_id = ${tenantId}
    AND status = 'published'
    AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
  ORDER BY embedding <=> ${queryEmbedding}::vector
  LIMIT ${topK};
`;
```

---

## Resultado esperado de la fase

```txt
- Migraciones creadas
- Estados definidos
- Auditoría lista
- Versionado listo
- Tablas listas para panel admin
- Base preparada para búsqueda vectorial
```

## Plazo

```txt
Tiempo máximo: 1 día.
```
