# Riesgos abiertos

| Riesgo | Impacto | Control actual | Próximo paso |
| --- | --- | --- | --- |
| Filtros de área, idioma y permisos incompletos en alguna ruta RAG | Exposición de conocimiento | chunks aprobados, publicados y vigentes | Auditar cada ruta RAG y agregar pruebas negativas |
| Dependencias externas sin colas o circuit breakers | Fallos y latencia en ingestión/embeddings | timeouts y health checks | Incorporar reintentos acotados y circuit breakers |
| Cobertura desigual de políticas, publicación y autenticación | Regresiones de seguridad | smoke, e2e y guards existentes | Ampliar unitarias e integración |
| Configuración privada provisionada de forma inconsistente | Arranques fallidos o secretos expuestos | validación Joi y doctor documental | Estandarizar el provisionamiento del despliegue |
