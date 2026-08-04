FROM node:20.19.5-alpine3.22 AS builder

WORKDIR /app

RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY index.html tsconfig.json tsconfig.node.json vite.config.ts ./
COPY public ./public
COPY src ./src
RUN pnpm build

FROM nginx:1.27.5-alpine3.21

RUN addgroup -S app && adduser -S app -G app
RUN sed -i 's#^pid .*#pid /tmp/nginx.pid;#' /etc/nginx/nginx.conf

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html
RUN chown -R app:app \
    /usr/share/nginx/html \
    /var/cache/nginx \
    /var/run \
    /var/log/nginx \
    /etc/nginx/conf.d \
    /etc/nginx/templates

USER app

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
