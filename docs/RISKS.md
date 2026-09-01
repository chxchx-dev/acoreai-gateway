# Riesgos abiertos

| Riesgo | Impacto | Control actual | Próximo paso |
| --- | --- | --- | --- |
| La ruta RAG heredada podía recuperar contenido sin filtros de publicación, vigencia o permisos | Exposición de conocimiento | Mitigado parcialmente: `RagService` ahora delega en `KnowledgeSearchService`, que exige fuente, versión y chunk publicados y vigentes; el almacén heredado queda fuera de la recuperación normal | Completar `BL-01` y retirar el almacén heredado cuando no tenga consumidores |
| Los filtros de área, idioma y permisos pueden ser incompletos en alguna ruta RAG | Exposición entre áreas o usuarios | Área e idioma son filtros; el `userId` se registra, pero no existe una ACL por usuario/área en el modelo actual | Decidir el alcance de ACL y cubrirlo en `BL-01` y `BL-03` |
| Ingesta y embeddings dependen de trabajo en proceso | Trabajos perdidos al reiniciar y capacidad limitada | Se registran `KnowledgeProcessingJob`; `setImmediate` desacopla el request y embeddings reintenta localmente hasta dos veces | Diseñar cola durable, backoff y circuit breaker en `BL-04` |
| Cobertura desigual de políticas, publicación, autenticación y streaming | Regresiones de seguridad o contrato | Smoke tests de auth/chat/publicación y un E2E principal | Ampliar unitarias e integración en `BL-03` |
| Contratos de chat todavía parcialmente distintos entre HTTP y streaming RAG | Respuestas o persistencia inconsistentes | `/api/chat/rag` ya usa `ChatService`; el streaming general puede activar RAG | Cerrar la consolidación y probar streaming en `BL-02` y `BL-03` |
| No hay una medición reproducible de calidad RAG | Cambios que mejoran una ruta pueden empeorar respuestas o groundedness | Se guardan búsquedas, fuentes y respuestas | Crear dataset, métricas y línea base en `BL-05` |
| Configuración privada provisionada de forma inconsistente | Arranques fallidos o secretos expuestos | Validación de configuración en runtime y doctor documental | Mantener provisionamiento fuera del repositorio y revisar en cada release |
