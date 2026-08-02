# Arquitectura del `src`

Este gateway usa un monolito modular con arquitectura hexagonal. La idea es escalar primero con limites internos claros y despues extraer modulos a servicios separados cuando el trafico o el equipo lo requieran.

## Dirección del sistema

El código implementa la base técnica de **ACoreAI: una plataforma modular para construir asistentes empresariales conectados a conocimiento privado**. La prioridad arquitectónica es proteger y hacer trazable el ciclo de conocimiento: cargar, revisar, versionar, publicar y consultar información empresarial con fuentes controladas. Las reglas completas viven en [`DIRECCION_PRODUCTO.md`](DIRECCION_PRODUCTO.md).

## Estructura

```txt
src/
├── application/          # Casos de uso, puertos y contratos
├── config/               # Configuracion y validacion de entorno
├── domain/               # Reglas puras de negocio
├── infrastructure/       # Adapters externos, base de datos, observabilidad
├── interfaces/http/      # Controllers, DTOs, guards, filters, interceptors
├── modules/              # Modulos funcionales del producto
├── app.module.ts
└── main.ts
```

## Regla principal

Los controladores HTTP no deben contener logica de negocio. Deben validar entrada, resolver contexto de autenticacion y delegar en servicios/casos de uso.

Todo código nuevo debe justificar cómo ayuda a los asistentes empresariales, al ciclo de conocimiento privado o a una capacidad transversal reutilizable. Las funcionalidades auxiliares no deben convertir el gateway en un producto aislado o en un chatbot genérico.

## Capas

- `modules/*`: capacidades del sistema como `chat`, `auth`, `rag`, `translate`, `tts`, `stt`, `conversations` y `ai-orchestrator`.
- `application/*`: contratos y casos de uso que conectan controladores con servicios de dominio.
- `domain/*`: reglas puras, politicas y tipos que no dependen de Nest, HTTP ni base de datos.
- `infrastructure/*`: Prisma, MongoDB, adaptadores hacia Ollama, vector store y metricas.
- `interfaces/http/*`: adaptador de entrada HTTP. Aqui viven controllers, DTOs y guards.

## Reglas de escalabilidad

1. Un modulo solo exporta lo que otros modulos necesitan.
2. La IA pasa por `modules/ai-orchestrator`.
3. Ollama queda en `modules/ollama` como infraestructura interna.
4. PostgreSQL y MongoDB se acceden desde `infrastructure/database`.
5. Los imports internos usan `src/*` para evitar rutas relativas largas.
6. Si un modulo empieza a crecer demasiado, se divide por subcarpetas `application`, `domain`, `infrastructure` e `interfaces` dentro del propio modulo.
7. Si un modulo requiere escalar de forma independiente, se puede extraer a `services/*` manteniendo sus contratos.

## Donde poner codigo nuevo

- Nuevo endpoint: `src/interfaces/http/controllers`.
- Nuevo DTO: `src/interfaces/http/dto/<modulo>`.
- Nueva regla de negocio pura: `src/domain`.
- Nuevo servicio funcional: `src/modules/<modulo>`.
- Nueva integracion externa: `src/infrastructure`.
- Nuevo flujo IA: `src/modules/ai-orchestrator`.
