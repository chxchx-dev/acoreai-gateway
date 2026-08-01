# Backlog MVP — RAG supervisado en 7 días

## Fallo

Tu riesgo no es falta de ideas. Tu riesgo es abrir veinte frentes y terminar con otro proyecto medio vivo.

## Por qué duele

Un MVP se vende cuando demuestra control de punta a punta. No cuando tiene arquitectura perfecta en papel.

## Acción

Ejecuta este sprint sin agregar funciones nuevas.

---

## Día 1 — Base de datos y módulo knowledge

### Objetivo

Tener la estructura mínima para registrar fuentes y chunks.

### Tareas

```txt
[ ] Crear módulo knowledge en NestJS
[ ] Crear migraciones PostgreSQL
[ ] Crear tabla knowledge_sources
[ ] Crear tabla knowledge_source_versions
[ ] Crear tabla knowledge_chunks
[ ] Crear tabla knowledge_reviews
[ ] Crear tabla knowledge_audit_logs
[ ] Crear enums/constantes de estados
[ ] Crear endpoints base GET/POST sources
```

### Entregable

```txt
Puedes crear una fuente con metadata.
```

---

## Día 2 — Carga y extracción

### Objetivo

Subir archivos y extraer texto.

### Tareas

```txt
[ ] Implementar multipart upload
[ ] Guardar archivo original
[ ] Calcular checksum
[ ] Crear job extract-text
[ ] Extraer TXT/MD
[ ] Extraer PDF con texto
[ ] Guardar extracted_text en version
[ ] Mostrar warnings básicos
```

### Entregable

```txt
Puedes subir un documento y ver el texto extraído.
```

---

## Día 3 — Chunking y edición

### Objetivo

Generar chunks revisables.

### Tareas

```txt
[ ] Crear servicio chunker
[ ] Configurar chunk_size y overlap
[ ] Crear chunks en estado pending_review
[ ] Crear endpoint GET chunks
[ ] Crear endpoint PATCH chunk
[ ] Crear endpoint reject chunk
[ ] Crear endpoint approve chunk
```

### Entregable

```txt
Supervisor puede revisar y editar chunks.
```

---

## Día 4 — Revisión y publicación

### Objetivo

Control humano real.

### Tareas

```txt
[ ] Crear endpoint submit-review
[ ] Crear endpoint review approved/rejected/needs_changes
[ ] Guardar checklist
[ ] Crear endpoint publish
[ ] Crear endpoint archive
[ ] Auditar cambios
[ ] Validar que solo ready_to_publish pueda publicar
```

### Entregable

```txt
Un documento puede pasar de pending_review a published.
```

---

## Día 5 — Embeddings y búsqueda

### Objetivo

Buscar solo conocimiento publicado.

### Tareas

```txt
[ ] Conectar Ollama embeddings
[ ] Validar dimensión del modelo
[ ] Crear job generate_embeddings
[ ] Guardar embedding por chunk aprobado
[ ] Crear /knowledge/search
[ ] Filtrar tenant + published + vigencia
[ ] Devolver fuentes y scores
```

### Entregable

```txt
Puedes buscar chunks publicados por similitud.
```

---

## Día 6 — Chat RAG

### Objetivo

Responder usando conocimiento aprobado.

### Tareas

```txt
[ ] Crear /chat/rag
[ ] Embedding de pregunta
[ ] Recuperar topK chunks
[ ] Construir prompt con contexto
[ ] Llamar modelo Ollama chat
[ ] Responder con fuentes
[ ] Manejar falta de contexto
[ ] Guardar logs de fuentes usadas
```

### Entregable

```txt
Chat responde con fuentes citadas.
```

---

## Día 7 — Panel admin MVP

### Objetivo

Demo vendible.

### Tareas

```txt
[ ] Crear React/Vite admin
[ ] Login o protección básica
[ ] Dashboard
[ ] Bandeja de fuentes
[ ] Formulario nueva fuente
[ ] Detalle documento
[ ] Vista texto extraído
[ ] Vista chunks
[ ] Aprobar/rechazar/publicar
[ ] Pantalla prueba pregunta
```

### Entregable

```txt
Puedes demostrar el ciclo completo desde UI.
```

---

# Fuera del MVP

No metas esto en los 7 días:

```txt
OCR
Google Drive
OneDrive
notificaciones avanzadas
dashboard BI
fine-tuning
multiagente
edición colaborativa
workflows complejos
```

---

## Demo final obligatoria

```txt
1. Crear fuente "Política de matrícula 2026".
2. Subir PDF/TXT.
3. Ver extracción.
4. Ver chunks.
5. Aprobar.
6. Generar embeddings.
7. Publicar.
8. Preguntar: "¿Cuál es el plazo de matrícula?"
9. Ver respuesta con fuente.
10. Archivar documento.
11. Preguntar otra vez.
12. Ver que el chat ya no lo usa.
```

## Cierre

Si al día 7 no puedes hacer esa demo, no tienes MVP. Tienes piezas sueltas.
