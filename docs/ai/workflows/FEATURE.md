# Workflow: feature

1. Delimita el slice, consumidores, permisos y criterio de aceptación.
2. Lee el estado, reglas y arquitectura del módulo afectado.
3. Implementa dominio, puertos, adapter, interfaz y pruebas sólo donde
   aplique.
4. Prueba el camino feliz y los casos negativos de seguridad o datos.
5. Sincroniza contrato, decisión, riesgo o backlog si cambió alguno.
6. Ejecuta doctor, `git diff --check` y las validaciones proporcionales.

Entrega: resumen, archivos relevantes, pruebas ejecutadas, resultado y
pendientes explícitos.
