# ACoreAI Web

App web Vite + React + TypeScript para ACoreAI.

Esta interfaz es una superficie reutilizable para asistentes empresariales conectados al conocimiento privado administrado por ACoreAI. Las decisiones de producto y el ciclo de fuentes controladas están definidos en [`../../docs/DIRECCION_PRODUCTO.md`](../../docs/DIRECCION_PRODUCTO.md).

## Requisitos

- Node 20.x
- `acoreai-gateway` disponible

## Inicio

```bash
nvm use 20
npm install
cp .env.example .env
npm run dev
```

Usuario demo:

- `programador11@acoreai.edu.co`
- `123465`

El frontend no compila `AI_GATEWAY_KEY` ni ninguna key `VITE_*`. En desarrollo usa `/ai` y Vite proxyea al gateway; en Docker/Nginx usa rutas relativas (`/api`, `/health`) y el proxy server-side inyecta la key.

## Entornos

- Desarrollo (`npm run dev`): el navegador llama a `/ai/...` en `localhost:5175`, y Vite proxyea al gateway definido por `VITE_AI_GATEWAY_MODE`, `VITE_AI_GATEWAY_LOCAL_URL` o `VITE_AI_GATEWAY_PUBLIC_URL`.
- Producción (`npm run build`): el bundle usa rutas relativas. El contenedor `acoreai-web` proxyea `/api` al gateway interno y agrega `x-ai-gateway-key` desde `AI_GATEWAY_KEY`.
- Después del login, la web manda `Authorization: Bearer <token>` en chat y conversaciones para que el gateway use el usuario y rol reales.

No pongas `AI_GATEWAY_KEY` en variables `VITE_*`: todo lo que empieza por `VITE_` queda visible para el navegador.
