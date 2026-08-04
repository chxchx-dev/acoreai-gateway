FROM node:20.19.5-alpine3.22

RUN apk add --no-cache openssl postgresql-client
RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY web/app/package.json web/app/pnpm-lock.yaml ./web/app/
RUN pnpm --dir web/app install --frozen-lockfile

COPY prisma ./prisma
RUN pnpm prisma:generate

COPY tsconfig.json tsconfig.build.json nest-cli.json jest.config.ts ./
COPY src ./src
COPY test ./test
COPY scripts ./scripts
COPY web/app ./web/app

CMD ["pnpm", "run", "test:e2e:docker"]
