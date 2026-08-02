# Dirección de producto de ACoreAI

## Posicionamiento

**ACoreAI es una plataforma modular de inteligencia artificial para construir asistentes empresariales conectados a conocimiento privado.**

Esta definición es la regla principal para las decisiones de producto, arquitectura, documentación y experiencia de usuario del repositorio.

## Problema que resolvemos

Las empresas poseen manuales, políticas, procedimientos y documentación dispersa, pero sus equipos no pueden consultarlos rápidamente ni verificar qué información está vigente.

El problema no es únicamente encontrar un documento. También es necesario saber:

- quién es responsable de la información;
- qué versión está vigente;
- si el contenido fue revisado y aprobado;
- qué fuentes sustentan la respuesta del asistente;
- cuándo cambió la información y quién lo autorizó.

## Solución

ACoreAI permite cargar, revisar, versionar, publicar y consultar conocimiento empresarial mediante asistentes de IA con fuentes controladas.

El flujo de conocimiento debe conservar esta intención:

```text
fuente → extracción → versionado → revisión humana → aprobación
       → embeddings → publicación → recuperación con citas
       → respuesta del asistente con trazabilidad
```

ACoreAI no debe presentarse como un chatbot genérico ni como un sistema que aprende autónomamente de cualquier archivo cargado. La propuesta de valor es una capa confiable entre el conocimiento privado de una organización y sus equipos.

## Reglas de producto

1. **El conocimiento privado es el centro del producto.** Chat, RAG, administración, auditoría, automatización y clientes deben reforzar este flujo.
2. **Toda respuesta empresarial debe poder justificarse.** Cuando una respuesta use conocimiento privado, debe conservar o exponer sus fuentes según el contrato del endpoint.
3. **La publicación requiere control.** El contenido no publicado, vencido, reemplazado o sin permisos no puede entrar en la recuperación normal.
4. **La versión vigente debe ser explícita.** Las fuentes deben conservar historial, estado, fechas de validez y trazabilidad de cambios.
5. **La supervisión humana es una capacidad, no un obstáculo.** Revisión, aprobación, auditoría y roles son parte del producto principal.
6. **La plataforma debe ser modular y reutilizable.** La base compartida debe permitir crear asistentes empresariales para distintos sectores sin duplicar el gateway.
7. **La privacidad es una restricción de diseño.** Las credenciales, documentos y respuestas privadas deben permanecer protegidos por entorno, identidad, permisos y políticas de acceso.
8. **Las capacidades auxiliares son extensiones.** Voz, traducción, educación, aventura y otras experiencias pueden existir, pero no deben desplazar el núcleo de asistentes empresariales y conocimiento controlado.

## Reglas de arquitectura

- Los módulos de conocimiento deben permanecer separados de los clientes y de la marca de un producto concreto.
- Los casos de uso deben expresar flujos de negocio: ingesta, revisión, versionado, publicación, búsqueda, respuesta fundamentada y auditoría.
- Las integraciones con modelos, bases de datos, almacenamiento y proveedores externos deben estar detrás de puertos y adapters.
- La arquitectura debe permitir cambiar el modelo, el proveedor de embeddings o el almacenamiento sin reescribir las reglas de conocimiento.
- Las respuestas generadas no sustituyen a la fuente original: el sistema debe conservar la relación entre respuesta, chunks recuperados, versión y fuente.
- Los nuevos endpoints y pantallas deben declarar qué problema empresarial resuelven y qué parte del ciclo de conocimiento soportan.

## Criterio para nuevas funcionalidades

Antes de incorporar una funcionalidad, debe poder responderse afirmativamente al menos una de estas preguntas:

- ¿Ayuda a conectar un asistente con conocimiento privado?
- ¿Mejora la calidad, vigencia, seguridad o trazabilidad del conocimiento?
- ¿Facilita la administración y supervisión por parte de una empresa?
- ¿Es una capacidad transversal reutilizable por varios asistentes empresariales?

Si la respuesta es no, la funcionalidad debe justificarse como una extensión aislada y no debe convertirse en el centro de la plataforma.

## Lenguaje recomendado

Usar de forma consistente:

- **asistente empresarial** en lugar de chatbot genérico;
- **Centro de Conocimiento** o **conocimiento privado** en lugar de documentos sueltos;
- **fuente, versión, revisión, publicación y vigencia** para describir el ciclo documental;
- **respuesta fundamentada** o **respuesta con fuentes** cuando exista contexto recuperado;
- **plataforma modular** para describir ACoreAI como base reutilizable.

Evitar prometer entrenamiento automático, conocimiento sin control, respuestas siempre correctas o acceso ilimitado a documentos privados.

## Estado objetivo

El repositorio actual ya contiene el gateway modular, el RAG supervisado, el panel administrativo, el versionado de fuentes, la publicación, la auditoría y los adapters de infraestructura necesarios para avanzar hacia este objetivo. Las próximas iteraciones deben priorizar la consolidación de ese flujo antes de ampliar capacidades periféricas.
