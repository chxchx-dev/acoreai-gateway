# Decisiones de arquitectura y gobierno

## ADR-001 — Gobierno común y configuración fuera del repositorio

- **Estado:** aceptada
- **Fecha:** 2026-08-31
- **Contexto:** el repositorio tenía un playbook genérico y plantillas de
  configuración que podían inducir a copiar secretos o mantener instrucciones
  divergentes entre herramientas.
- **Decisión:** `AGENTS.md` será la entrada común; `docs/` será la fuente
  canónica; los roles y workflows vivirán bajo `docs/ai/`; `CLAUDE.md` sólo
  adaptará las reglas comunes. La configuración privada será responsabilidad
  del entorno de ejecución y no se crearán ni documentarán plantillas locales.
- **Motivo:** reduce ambigüedad, evita duplicación y elimina la posibilidad de
  que ejemplos versionados se interpreten como configuración segura.
- **Consecuencia:** los operadores deben provisionar la configuración fuera
  del repositorio; el doctor comprueba que no reaparezcan plantillas retiradas.
