FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run db:generate
RUN npm prune --production

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/drizzle ./drizzle

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/api/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

CMD ["sh", "-c", "node scripts/migrate.js && node src/index.js"]
