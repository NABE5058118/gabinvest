FROM node:22-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate --binary-targets=debian-openssl-3.0.x
RUN npm run build

FROM node:22-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl curl ca-certificates && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /app/uploads

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY package*.json ./

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
