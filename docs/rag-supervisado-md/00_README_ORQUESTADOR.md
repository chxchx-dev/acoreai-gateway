# Olan AI Gateway — RAG supervisado con aprendizaje controlado

> Fecha base: 2026-07-02  
> Objetivo: convertir `olan-ai-gateway` en un gateway de IA con RAG controlado, panel administrativo y gobierno de conocimiento.

## Fallo

Estás usando la palabra **“aprendizaje”** como si el modelo fuera a aprender solo de los documentos. Ese es el camino rápido para vender humo técnico.

## Por qué duele

Un RAG serio no entrena el modelo cada vez que subes un PDF. Lo que hace es **controlar una base de conocimiento aprobada**, recuperarla con filtros y usarla como contexto. Si no separas eso, el sistema termina respondiendo con documentos duplicados, vencidos, contradictorios o nunca aprobados.

## Acción

Construye esto por fases cerradas. No saltes al panel bonito antes de tener el flujo de aprobación funcionando.

```txt
Fuente nueva
  ↓
Carga en zona de revisión
  ↓
Extracción de texto
  ↓
Limpieza y chunking
  ↓
Revisión humana
  ↓
Aprobación
  ↓
Embeddings
  ↓
Publicación
  ↓
Chat responde usando solo conocimiento publicado
```

---

## Decisión técnica principal

### Nombre funcional

Usa uno de estos nombres dentro del producto:

```txt
Centro de Conocimiento
Knowledge Center
Fuentes Supervisadas
Base de Conocimiento Aprobada
```

No uses “subir archivos” como nombre principal. Eso suena a herramienta básica, no a módulo empresarial.

### Qué significa “aprendizaje controlado”

```txt
No es fine-tuning.
No es entrenar el modelo.
No es meter archivos directo a vectores.

Es un ciclo de gobierno:
documento → revisión → aprobación → publicación → uso en chat.
```

---

## Orden de los MD

| Orden | Archivo | Propósito |
|---:|---|---|
| 0 | `00_README_ORQUESTADOR.md` | Ruta general y criterio de ejecución |
| 1 | `01_FASE_1_ARQUITECTURA_RAG_SUPERVISADO.md` | Arquitectura del sistema |
| 2 | `02_FASE_2_MODELO_DATOS_POSTGRES_PGVECTOR.md` | Tablas, estados, versionado y SQL |
| 3 | `03_FASE_3_INGESTA_EXTRACCION_CHUNKING.md` | Carga, extracción, limpieza y chunks |
| 4 | `04_FASE_4_SUPERVISION_VERSIONADO_PUBLICACION.md` | Revisión humana, aprobación y publicación |
| 5 | `05_FASE_5_EMBEDDINGS_BUSQUEDA_CHAT_RAG.md` | Embeddings, búsqueda vectorial y endpoint chat |
| 6 | `06_FASE_6_PANEL_ADMIN_FRONTEND.md` | Sitio administrativo para gestionar data |
| 7 | `07_FASE_7_SEGURIDAD_ROLES_AUDITORIA.md` | Roles, permisos, trazabilidad y protección |
| 8 | `08_FASE_8_AUTOMATIZACION_ACTUALIZACION_CONTROLADA.md` | Fuentes programadas y cambios supervisados |
| 9 | `09_BACKLOG_MVP_7_DIAS.md` | Sprint cerrado para MVP vendible |
| 10 | `10_PROMPTS_PLANTILLAS_Y_GUARDRAILS.md` | Prompts de RAG, revisión y validación |
| 11 | `11_CHECKLIST_DEMO_VENDIBLE.md` | Checklist para mostrarlo como producto serio |

---

## Stack recomendado para Olan AI Gateway

```txt
Backend:
- NestJS
- TypeScript
- Prisma para datos relacionales
- SQL crudo para consultas pgvector complejas
- BullMQ + Redis para procesos pesados
- PostgreSQL + pgvector

IA local:
- Ollama para chat
- Ollama para embeddings
- Modelo actual sugerido: embeddinggemma
- Alternativa: nomic-embed-text

Frontend admin:
- React + Vite + TypeScript
- TailwindCSS
- React Hook Form + Zod
- TanStack Query
- Zustand opcional para estado global

Storage:
- MVP: almacenamiento local controlado
- Producción: bucket S3 compatible

Observabilidad:
- logs estructurados
- tabla de auditoría
- métricas de extracción, chunks, embeddings y respuestas
```

---

## Regla de oro

El endpoint `/chat` **nunca** debe consultar documentos en estos estados:

```txt
draft
pending_review
needs_changes
approved
rejected
archived
expired
```

Solo puede usar:

```txt
published
```

Y además debe filtrar por:

```txt
tenant_id
área permitida
vigencia
idioma
prioridad
estado
```

---

## Criterio de éxito del MVP

El MVP no está listo cuando “responde bonito”.

Está listo cuando puedes demostrar esto:

```txt
1. Subo un documento.
2. El documento queda en revisión.
3. El supervisor ve texto extraído y chunks.
4. El supervisor aprueba.
5. El sistema genera embeddings.
6. El documento queda publicado.
7. El chat responde citando esa fuente.
8. Si archivo el documento, el chat deja de usarlo.
```

## Entregable mínimo

```txt
Backend funcionando + panel admin básico + chat con fuentes citadas.
```
