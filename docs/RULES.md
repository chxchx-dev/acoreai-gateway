# Reglas transversales

## Fuente de verdad

1. Código, contratos, migraciones y pruebas.
2. Esta documentación vigente.
3. `AGENTS.md` y sus adaptadores.
4. Backlog, propuestas y referencias históricas.

Una contradicción se corrige explícitamente; no se resuelve escogiendo un
documento en silencio.

## Cambios de código

- Mantén TypeScript estricto y límites hexagonales.
- Todo endpoint nuevo valida DTOs, autenticación/autorización y errores
  negativos cuando corresponda.
- Los cambios de persistencia incluyen migración y pruebas compatibles.
- El conocimiento no aprobado, vencido, sustituido o sin permiso no entra en
  la recuperación normal.
- No expongas claves internas ni datos sensibles en el frontend, logs,
  fixtures, commits o documentación.
- Los cambios de release, seguridad, permisos, tenancy o datos requieren
  evidencia operativa además de compilación.

## Configuración privada

La configuración de despliegue y las credenciales se inyectan fuera del
repositorio. Está prohibido crear, versionar o documentar plantillas, ejemplos,
nombres de archivos, valores o procedimientos para configuración local
privada. El código puede leer la configuración que el runtime ya recibió,
pero no debe convertirla en documentación pública.

Esta regla es deliberada: evita que una plantilla se convierta en una fuente
de secretos falsos, reduce divergencias entre entornos y mantiene la
responsabilidad de configuración en el orquestador.

## Limpieza y archivos

- No conserves builds, caches, respaldos ni estado local en Git.
- Los documentos activos deben ser cortos y tener un único responsable.
- Archiva sólo evidencia que explique una decisión; elimina borradores y
  checklists cerrados sin valor histórico.
