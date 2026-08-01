# Estructura recomendada de código

## Fallo

Si tiras todo en un módulo `rag`, vas a crear una caja negra imposible de mantener.

## Por qué duele

El RAG tiene varias responsabilidades: ingesta, revisión, embeddings, búsqueda, chat, auditoría y panel. Mezclarlas rompe escalabilidad y claridad.

## Acción

Usa estructura modular dentro de `olan-ai-gateway`.

---

## Backend NestJS

```txt
src/
  main.ts
  app.module.ts

  config/
    env.schema.ts
    ollama.config.ts
    rag.config.ts

  common/
    decorators/
    guards/
    interceptors/
    filters/
    utils/

  modules/
    auth/
    tenants/

    knowledge/
      knowledge.module.ts

      sources/
        sources.controller.ts
        sources.service.ts
        dto/
        entities/

      versions/
        versions.service.ts

      chunks/
        chunks.controller.ts
        chunks.service.ts
        dto/

      reviews/
        reviews.controller.ts
        reviews.service.ts
        dto/

      publishing/
        publishing.controller.ts
        publishing.service.ts

      audit/
        audit.service.ts

    ingestion/
      ingestion.module.ts
      processors/
        extract-text.processor.ts
        chunk-text.processor.ts
      extractors/
        pdf.extractor.ts
        text.extractor.ts
        docx.extractor.ts
        csv.extractor.ts
      chunkers/
        recursive-text.chunker.ts
      normalizers/
        text-normalizer.ts

    embeddings/
      embeddings.module.ts
      embeddings.service.ts
      ollama-embeddings.client.ts

    retrieval/
      retrieval.module.ts
      retrieval.service.ts
      ranking.service.ts

    chat/
      chat.module.ts
      rag-chat.controller.ts
      rag-chat.service.ts
      prompt-builder.service.ts

    jobs/
      queues.module.ts
      queue.constants.ts

    health/
      health.controller.ts
```

---

## Frontend admin

```txt
apps/admin/
  src/
    main.tsx
    app/
      router.tsx
      providers.tsx

    layout/
      AdminLayout.tsx
      Sidebar.tsx
      Topbar.tsx

    features/
      auth/
      dashboard/

      knowledge/
        api/
          knowledge.api.ts
        components/
          SourceTable.tsx
          SourceStatusBadge.tsx
          UploadSourceForm.tsx
          ExtractedTextPreview.tsx
          ChunkReviewCard.tsx
          ReviewChecklist.tsx
          TestQuestionPanel.tsx
          AuditTimeline.tsx
        pages/
          KnowledgeListPage.tsx
          KnowledgeCreatePage.tsx
          KnowledgeDetailPage.tsx
          KnowledgeReviewPage.tsx
          KnowledgeTestPage.tsx

      audit/
      settings/

    shared/
      components/
      hooks/
      lib/
      types/
```

---

## Variables de entorno

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/olan_ai_gateway
REDIS_URL=redis://localhost:6379

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_CHAT_MODEL=llama3.2:3b
OLLAMA_FAST_MODEL=llama3.2:1b
OLLAMA_EMBEDDING_MODEL=embeddinggemma

RAG_TOP_K=6
RAG_MIN_SCORE=0.35
RAG_CHUNK_SIZE=700
RAG_CHUNK_OVERLAP=120

KNOWLEDGE_STORAGE_DRIVER=local
KNOWLEDGE_STORAGE_PATH=./storage/knowledge
```

---

## Convenciones de endpoints

```txt
/knowledge/sources
/knowledge/sources/:id
/knowledge/sources/:id/chunks
/knowledge/sources/:id/review
/knowledge/sources/:id/publish
/knowledge/sources/:id/archive
/knowledge/search
/chat/rag
/knowledge/audit
```

---

## Reglas de código

```txt
- Controllers delgados.
- Services con reglas de negocio.
- Processors para jobs pesados.
- SQL vectorial aislado en RetrievalService.
- Prompts fuera del controller.
- Auditoría en cada transición de estado.
- Tenant guard obligatorio.
- Validación DTO con class-validator o Zod.
```

---

## Resultado esperado

```txt
- Código separable
- Fácil de probar
- Fácil de mostrar
- Listo para crecer sin rehacer todo
```
