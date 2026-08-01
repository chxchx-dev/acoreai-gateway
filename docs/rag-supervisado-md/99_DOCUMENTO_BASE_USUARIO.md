Fallo: **quieres “alimentar el RAG”, pero el error sería meter documentos directo a la base vectorial sin control humano.** Eso crea una IA con basura indexada, datos duplicados, información vieja y respuestas falsas con cara de seguridad. 🧨

Por qué duele: **un RAG no es una carpeta de archivos. Es una fuente de conocimiento gobernada.** Si nadie revisa qué entra, qué versión está activa, qué documento está vencido y qué fuente tiene prioridad, terminas con un sistema que responde mezclando información nueva con documentos viejos. Eso mata la confianza del MVP.

Acción: construye el flujo así, sin excusas:

```txt
Fuente nueva
   ↓
Carga en zona de revisión
   ↓
Extracción de texto
   ↓
Limpieza y división en chunks
   ↓
Revisión humana
   ↓
Aprobación
   ↓
Generación de embeddings
   ↓
Publicación en la base vectorial
   ↓
Chat responde usando solo conocimiento aprobado
```

---

# Paso a paso para alimentar un RAG con data actualizada

## 1. Define las fuentes permitidas

No dejes que cualquiera suba cualquier cosa.

Para un MVP, permite estas fuentes:

```txt
1. PDF
2. TXT / MD
3. DOCX
4. Excel / CSV
5. URLs autorizadas
6. Preguntas y respuestas manuales
7. Documentos internos escritos desde el panel
```

Cada fuente debe tener metadata obligatoria:

```json
{
  "titulo": "Política de matrícula 2026",
  "tipo": "PDF",
  "area": "Académica",
  "fuente": "manual interno",
  "fecha_documento": "2026-07-02",
  "fecha_vencimiento": "2026-12-31",
  "responsable": "Coordinación Académica",
  "prioridad": "alta",
  "estado": "pendiente_revision"
}
```

Fallo: **si no guardas metadata, después no sabrás qué dato es válido.**

Por qué duele: cuando la IA dé una respuesta mala, no podrás auditar de dónde salió.

Acción: desde el día 1, todo documento debe tener responsable, fecha, estado y versión.

---

## 2. Crea una “zona de revisión”, no publiques directo

La carga inicial no debe ir directo a `knowledge_chunks`.

Debe ir primero a una tabla de documentos en espera:

```txt
knowledge_sources
```

Estados recomendados:

```txt
draft
pending_review
approved
rejected
published
archived
expired
```

Flujo correcto:

```txt
Usuario sube documento
   ↓
Sistema lo marca como pending_review
   ↓
Supervisor revisa
   ↓
Supervisor aprueba o rechaza
   ↓
Solo lo aprobado se indexa
```

Esto es lo que hace que tu MVP se vea serio. No es solo “subir PDFs”. Es **gobernanza de conocimiento**.

---

## 3. Extrae el texto y muéstralo antes de indexar

Cuando suban un PDF, DOCX o Excel, no generes embeddings de una vez.

Primero extraes texto y lo muestras en el panel:

```txt
Documento original:
politica_matricula_2026.pdf

Texto extraído:
"Los estudiantes tendrán plazo hasta..."

Estado:
Pendiente de revisión
```

El supervisor debe poder ver:

```txt
- Nombre del documento
- Texto extraído
- Páginas detectadas
- Errores de extracción
- Fecha del documento
- Categoría
- Responsable
- Vista previa de chunks
```

Fallo: **si indexas texto mal extraído, entrenas tu RAG con ruido.**

Por qué duele: una tabla rota, un PDF escaneado o texto cortado puede generar respuestas absurdas.

Acción: antes de aprobar, el supervisor debe validar que el texto quedó bien.

---

## 4. Divide en chunks después de limpiar

No partas el texto a lo bruto.

Regla MVP:

```txt
Chunk size: 500 a 900 tokens
Overlap: 100 a 150 tokens
Top K en búsqueda: 5 a 8 chunks
```

Ejemplo de chunk guardado:

```json
{
  "source_id": "doc_123",
  "chunk_index": 4,
  "title": "Política de matrícula 2026",
  "content": "El plazo máximo para realizar matrícula ordinaria será...",
  "page": 3,
  "area": "Académica",
  "version": 1,
  "status": "approved",
  "valid_from": "2026-01-01",
  "valid_until": "2026-12-31"
}
```

Fallo: **si no manejas versión y vigencia, tu RAG se vuelve un cementerio de documentos viejos.**

Por qué duele: el usuario preguntará por una política actual y la IA puede responder con una política pasada.

Acción: cada chunk debe heredar fecha, versión y vigencia del documento original.

---

## 5. Crea aprobación humana por chunk o por documento

Para MVP puedes empezar con aprobación por documento.

Pero lo ideal es permitir esto:

```txt
Aprobar documento completo
Aprobar solo algunos chunks
Editar chunk antes de aprobar
Eliminar chunks basura
Marcar chunk como sensible
Marcar chunk como obsoleto
```

Ejemplo de panel:

```txt
Documento: Reglamento Académico 2026
Estado: Pendiente revisión

Chunks detectados: 42

[✓] Chunk 1 aprobado
[✓] Chunk 2 aprobado
[✗] Chunk 3 eliminado por ruido
[editar] Chunk 4 corregido manualmente
```

Fallo: **si el humano solo sube archivos pero no revisa chunks, no está supervisando nada.**

Por qué duele: eso es fingir control. El modelo seguirá tragando basura.

Acción: para el MVP, mínimo exige botón de aprobar/rechazar documento y vista previa de chunks.

---

## 6. Genera embeddings solo después de aprobar

Este orden es obligatorio:

```txt
Subir documento
Extraer texto
Chunking
Revisión humana
Aprobación
Embeddings
Publicación
```

No este:

```txt
Subir documento
Embeddings automáticos
Chat ya responde
```

Eso es peligroso.

Para server normalito usa:

```txt
PostgreSQL + pgvector
Ollama embeddings
Modelo: nomic-embed-text o embeddinggemma
```

Tabla simple:

```sql
CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY,
  source_id UUID NOT NULL,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  title TEXT,
  area TEXT,
  source_type TEXT,
  version INT,
  status TEXT,
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 7. Usa búsqueda con filtros, no solo similitud

No basta con buscar el vector más parecido.

Filtra por:

```txt
status = published
valid_until >= hoy
area permitida
tenant_id correcto
idioma correcto
prioridad de fuente
```

Consulta conceptual:

```sql
SELECT content, title, source_id
FROM knowledge_chunks
WHERE status = 'published'
AND valid_until >= CURRENT_DATE
ORDER BY embedding <-> :query_embedding
LIMIT 8;
```

Fallo: **si buscas en todo sin filtros, vas a mezclar documentos vencidos, borradores y basura.**

Por qué duele: el chat puede responder con información que nunca fue aprobada.

Acción: el endpoint `/chat` solo debe consultar chunks con estado `published`.

---

# Cómo crear una fuente de conocimiento supervisada

Tu sistema debe tener un módulo llamado algo así:

```txt
Knowledge Center
Centro de Conocimiento
Base de Conocimiento
Fuentes Supervisadas
```

No lo llames simplemente “subir archivos”. Eso suena pobre.

## Roles mínimos

```txt
Admin
- Crea categorías
- Gestiona usuarios
- Publica o archiva conocimiento

Supervisor
- Revisa documentos
- Aprueba o rechaza
- Edita chunks
- Define vigencia

Uploader
- Sube documentos
- No puede publicar

Usuario final
- Solo pregunta al chat
```

---

## Pantallas mínimas del panel

### 1. Bandeja de fuentes

```txt
Nombre                     Estado              Responsable       Fecha
Política 2026              Pendiente revisión  Coordinación      2026-07-02
Manual comercial           Publicado           Ventas            2026-06-20
FAQ estudiantes            Rechazado           Soporte           2026-06-15
```

### 2. Detalle del documento

```txt
Título
Tipo de fuente
Área
Responsable
Fecha de vigencia
Archivo original
Texto extraído
Vista previa de chunks
```

### 3. Revisión de chunks

```txt
Chunk 1
Contenido...
[Editar] [Aprobar] [Eliminar]

Chunk 2
Contenido...
[Editar] [Aprobar] [Eliminar]
```

### 4. Prueba antes de publicar

Antes de publicar, el supervisor debe probar preguntas:

```txt
Pregunta de prueba:
¿Cuál es el plazo de matrícula ordinaria?

Respuesta generada:
...

Fuentes usadas:
- Política de matrícula 2026, página 3
```

### 5. Historial de cambios

```txt
Documento actualizado por: Ana Pérez
Fecha: 2026-07-02
Cambio: Se reemplazó versión 1 por versión 2
Motivo: Nueva política institucional
```

---

# Estados correctos del conocimiento

Usa este flujo:

```txt
draft
   ↓
pending_review
   ↓
approved
   ↓
published
   ↓
archived / expired
```

También necesitas:

```txt
rejected
needs_changes
```

Ejemplo real:

```txt
Documento subido: Manual de admisiones 2026
Estado: pending_review

Supervisor revisa:
- Texto correcto
- Fecha vigente
- Sin información sensible
- No contradice documentos activos

Resultado:
published
```

---

# Cómo actualizar data sin romper lo anterior

Fallo: **actualizar no significa borrar y volver a subir todo.**

Por qué duele: pierdes trazabilidad. No sabrás qué versión respondió qué cosa.

Acción: usa versionado.

Ejemplo:

```txt
Manual Comercial v1
Estado: archived

Manual Comercial v2
Estado: published
```

Cuando subes una nueva versión:

```txt
1. Se carga como pending_review
2. Se compara contra la versión anterior
3. Supervisor revisa diferencias
4. Si aprueba, se publica v2
5. v1 pasa a archived
```

Vista de diferencias:

```txt
Antes:
"El descuento máximo será del 10%"

Ahora:
"El descuento máximo será del 15% con aprobación comercial"
```

Esto es oro para una demo. Se ve empresarial. 🔥

---

# Cómo mantener la data actualizada automáticamente

Puedes tener tres mecanismos:

## 1. Actualización manual

Una persona sube documentos.

```txt
Bueno para MVP
Barato
Controlado
```

## 2. Actualización programada

El sistema revisa fuentes cada cierto tiempo:

```txt
Cada día a las 2:00 a.m.
Cada semana
Cada mes
```

Fuentes posibles:

```txt
URLs
Carpetas internas
Google Drive
OneDrive
APIs
RSS
Bases de datos
```

Flujo:

```txt
Sistema detecta cambio
   ↓
Crea nueva versión
   ↓
Marca como pending_review
   ↓
Supervisor aprueba
   ↓
Se publica
```

## 3. Actualización asistida por IA

La IA ayuda a detectar:

```txt
- Documento duplicado
- Información contradictoria
- Fecha vencida
- Texto sensible
- Cambios importantes
- Posibles preguntas que responde el documento
```

Pero no publiques automático al inicio.

Fallo: **automatizar publicación desde el día 1 es irresponsable.**

Por qué duele: una fuente mala puede contaminar todo el sistema.

Acción: para MVP usa IA como asistente de revisión, no como juez final.

---

# Endpoints recomendados

## Cargar fuente

```http
POST /knowledge/sources
```

```json
{
  "title": "Manual académico 2026",
  "area": "Académica",
  "sourceType": "pdf",
  "validFrom": "2026-01-01",
  "validUntil": "2026-12-31"
}
```

## Extraer texto

```http
POST /knowledge/sources/:id/extract
```

## Generar chunks

```http
POST /knowledge/sources/:id/chunk
```

## Enviar a revisión

```http
POST /knowledge/sources/:id/submit-review
```

## Aprobar

```http
POST /knowledge/sources/:id/approve
```

## Publicar

```http
POST /knowledge/sources/:id/publish
```

## Archivar

```http
POST /knowledge/sources/:id/archive
```

## Buscar conocimiento

```http
POST /knowledge/search
```

## Chat con RAG

```http
POST /chat
```

---

# Tablas mínimas

```txt
users
knowledge_sources
knowledge_chunks
knowledge_reviews
knowledge_versions
knowledge_audit_logs
chat_sessions
chat_messages
```

## knowledge_sources

```txt
id
tenant_id
title
description
source_type
file_url
area
status
version
valid_from
valid_until
uploaded_by
reviewed_by
published_by
created_at
updated_at
```

## knowledge_chunks

```txt
id
source_id
tenant_id
chunk_index
content
embedding
status
page
section_title
tokens_count
created_at
updated_at
```

## knowledge_reviews

```txt
id
source_id
reviewer_id
status
comments
reviewed_at
```

## knowledge_audit_logs

```txt
id
entity_type
entity_id
action
old_value
new_value
user_id
created_at
```

---

# Prompt para que el chat use solo conocimiento aprobado

```txt
Eres un asistente especializado.

Responde únicamente usando el CONTEXTO APROBADO.

Reglas:
1. No inventes información.
2. Si el contexto no contiene la respuesta, di:
   "No tengo información suficiente en la base de conocimiento aprobada."
3. Prioriza documentos recientes.
4. No uses documentos vencidos.
5. Cita las fuentes usadas.
6. Si hay conflicto entre fuentes, indica el conflicto y prioriza la fuente más reciente o de mayor prioridad.

CONTEXTO:
{{chunks}}

PREGUNTA:
{{question}}
```

---

# MVP en 7 días

Fallo: **si intentas construir el sistema perfecto, vas a abandonar otro proyecto más.**

Por qué duele: ya sabes investigar, pero lo que te mide es lo que entregas funcionando. No seas coleccionista de conocimiento.

Acción: este es el plan cerrado:

## Día 1

```txt
Crear tablas:
- knowledge_sources
- knowledge_chunks
- knowledge_reviews
- knowledge_audit_logs
```

Crear endpoint:

```txt
POST /knowledge/sources
```

Resultado del día: puedes registrar una fuente.

## Día 2

```txt
Subida de archivos PDF/TXT/MD
Extracción de texto
Guardar texto bruto
```

Resultado del día: puedes subir un documento y ver texto extraído.

## Día 3

```txt
Chunking
Vista previa de chunks
Edición básica de chunks
```

Resultado del día: el supervisor puede revisar fragmentos.

## Día 4

```txt
Aprobar / rechazar documento
Publicar documento
Generar embeddings solo si está aprobado
```

Resultado del día: solo lo aprobado entra al RAG.

## Día 5

```txt
Endpoint /knowledge/search
Búsqueda vectorial con filtros:
- tenant
- published
- vigente
```

Resultado del día: puedes buscar conocimiento aprobado.

## Día 6

```txt
Endpoint /chat
Prompt con contexto
Respuesta con fuentes
```

Resultado del día: chat funcional con RAG.

## Día 7

```txt
Panel admin básico:
- Subir fuente
- Revisar
- Aprobar
- Publicar
- Probar preguntas
- Ver fuentes usadas
```

Resultado del día: MVP vendible.

---

# Veredicto

Fallo: **tu RAG no debe ser “una IA que aprende documentos”; debe ser un sistema de conocimiento con revisión, vigencia, versiones y trazabilidad.**

Por qué duele: sin eso, solo construyes un chatbot maquillado que puede responder mentiras con documentos viejos.

Acción: hoy construye únicamente esto:

```txt
1. Tabla knowledge_sources
2. Tabla knowledge_chunks
3. Estado pending_review
4. Estado published
5. Botón aprobar
6. Embeddings solo después de aprobar
7. Chat que solo consulta published
```

Plazo real: **7 días para MVP funcional**.
Todo lo demás después. Primero control. Después automatización. 🚀
