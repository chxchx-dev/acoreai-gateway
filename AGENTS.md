# Guía de trabajo para agentes

Este archivo es la entrada común para cualquier agente que trabaje en el
repositorio. Las reglas del producto viven en `docs/`; este archivo sólo fija
el orden de lectura, los límites y la definición de terminado.

## Orden de lectura

1. `docs/ai/PROJECT_STATE.md` para el estado operativo actual.
2. El workflow correspondiente en `docs/ai/workflows/`.
3. `docs/RULES.md` y la documentación del módulo afectado.
4. El rol aplicable en `docs/ai/agents/`.
5. Código, contratos, migraciones y pruebas como evidencia efectiva.

No cargues toda la documentación para una tarea local. Si existe una
contradicción, prevalece el comportamiento comprobado por código, contratos,
migraciones y pruebas; después se corrige el documento obsoleto y se registra
una decisión cuando sea relevante.

## Límites

- Implementa el slice mínimo y conserva la arquitectura modular por dominio.
- No mezcles reglas de negocio con controllers, Prisma, MongoDB u Ollama.
- No inventes modelos, agentes adicionales ni cambios de infraestructura sin
  una necesidad explícita.
- Los agentes de revisión no editan por defecto.
- La configuración privada, credenciales y preferencias locales sólo las
  proporciona el entorno de ejecución. No se crean, versionan ni describen
  plantillas o archivos locales para esa configuración.
- No expongas secretos en código, logs, bundles del frontend, documentación ni
  resultados de pruebas.

## Terminado

Una tarea está terminada cuando:

- el cambio y sus casos negativos relevantes están implementados;
- las pruebas proporcionales al riesgo pasan;
- se actualizaron contrato, decisión, riesgo, backlog o documentación si
  corresponde;
- `bash docs/ai/scripts/doctor.sh` y `git diff --check` pasan;
- se reportan comandos no ejecutados, dependencias externas o riesgos abiertos.

## Comandos de verificación

Usa, según el alcance:

```bash
pnpm lint
pnpm build
pnpm test
pnpm doctor
git diff --check
```

Para roles, usa las definiciones de `docs/ai/agents/`. `CLAUDE.md` es sólo el
adaptador de Claude Code y debe seguir este archivo; no contiene una segunda
copia de estas reglas.
