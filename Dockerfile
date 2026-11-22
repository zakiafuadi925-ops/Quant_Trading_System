# Node.js Production Backend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/trading_data ./trading_data
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/api ./api

EXPOSE 3002

CMD ["npm", "start"]
