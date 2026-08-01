# Checklist — Demo vendible del RAG supervisado

## Fallo

Si muestras solo “chat con PDF”, te van a comparar con cualquier wrapper barato de IA.

## Por qué duele

El valor no está en que el bot responda. El valor está en que la institución controle qué sabe, quién lo aprobó, cuándo vence y de dónde salió cada respuesta.

## Acción

Muestra gobierno de conocimiento, no magia.

---

## Historia de demo

```txt
"Este módulo permite que Olan AI Gateway responda usando únicamente conocimiento aprobado por la institución. Los documentos pasan por revisión humana, versionado, vigencia y publicación antes de ser usados por el chat."
```

---

## Guion de demo

### 1. Crear fuente

```txt
Voy a cargar una política institucional.
```

Mostrar:

```txt
- título
- área
- vigencia
- responsable
- archivo
```

### 2. Procesar

```txt
El sistema no publica de inmediato. Primero extrae texto y genera chunks.
```

Mostrar:

```txt
- texto extraído
- chunks
- warnings
```

### 3. Revisar

```txt
El supervisor revisa y aprueba.
```

Mostrar:

```txt
- checklist
- aprobar/rechazar
- comentarios
```

### 4. Publicar

```txt
Aprobar no significa publicar. Publicar habilita el uso en chat.
```

Mostrar:

```txt
- estado ready_to_publish
- botón publicar
- estado published
```

### 5. Preguntar

```txt
Ahora el chat responde con fuentes.
```

Mostrar:

```txt
- respuesta
- fuentes
- página/sección
- score
```

### 6. Archivar

```txt
Si la fuente se archiva, el chat deja de usarla.
```

Mostrar:

```txt
- archivar
- repetir pregunta
- respuesta sin contexto suficiente
```

---

## Frases comerciales fuertes

```txt
No entrenamos el modelo con cualquier documento.
Gobernamos la base de conocimiento.
La IA responde solo con información aprobada.
Cada respuesta queda trazable.
Cada fuente tiene vigencia, versión y responsable.
El supervisor decide qué sabe la IA.
```

---

## Preguntas que te van a hacer

### ¿La IA aprende sola?

Respuesta:

```txt
No. Aprende de forma controlada a través de una base de conocimiento supervisada. Nada entra al chat sin aprobación.
```

### ¿Qué pasa si suben un documento malo?

Respuesta:

```txt
Queda en revisión. No se publica hasta que un supervisor lo apruebe.
```

### ¿Qué pasa si cambia una política?

Respuesta:

```txt
Se crea una nueva versión. La anterior queda archivada y se conserva trazabilidad.
```

### ¿Puede citar fuentes?

Respuesta:

```txt
Sí. Cada respuesta muestra la fuente, sección y página usada.
```

### ¿Puede usar documentos vencidos?

Respuesta:

```txt
No. El retrieval filtra por vigencia y estado published.
```

### ¿Esto entrena el modelo?

Respuesta:

```txt
No es fine-tuning. Es RAG supervisado: recuperación de conocimiento aprobado en tiempo de consulta.
```

---

## Checklist técnico antes de vender

```txt
[ ] /knowledge/sources funciona
[ ] extracción funciona
[ ] chunks visibles
[ ] aprobación funciona
[ ] embeddings se generan solo después de aprobar
[ ] publicación funciona
[ ] /knowledge/search filtra published
[ ] /chat/rag responde con fuentes
[ ] archived deja de responder
[ ] auditoría registra acciones
[ ] panel admin permite demo completa
```

---

## Checklist visual

```txt
[ ] estados claros
[ ] botones entendibles
[ ] tabla legible
[ ] fuentes visibles
[ ] errores visibles
[ ] demo sin consola abierta
```

---

## Lo que no debes prometer todavía

```txt
- aprende automáticamente sin revisión
- reemplaza al personal administrativo
- nunca se equivoca
- entiende cualquier PDF escaneado
- integra todas las fuentes externas desde el día 1
```

---

## Cierre de demo

```txt
Esto no es un chatbot con documentos. Es un sistema de conocimiento institucional supervisado, donde la IA solo responde con información aprobada, vigente y trazable.
```
