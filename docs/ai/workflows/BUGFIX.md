# Workflow: bugfix

1. Reproduce el fallo con una prueba o comando mínimo.
2. Demuestra la causa en la capa responsable; no tapes el síntoma en otra
   capa.
3. Agrega una regresión que falle antes del arreglo y pase después.
4. Revisa efectos en permisos, persistencia, contrato y observabilidad.
5. Ejecuta doctor, `git diff --check` y las validaciones relevantes.

Entrega: reproducción, causa, corrección, regresión y evidencia.
