# Builder
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev=false || npm install
COPY . .
RUN npm run build

# Runner
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.output ./.output
RUN npm ci --omit=dev || npm install --omit=dev
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
