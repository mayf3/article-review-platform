FROM node:22-alpine AS build

WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV FRONTEND_DIR=/app/client/dist
ENV NODE_OPTIONS=--max-old-space-size=256

COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist/client ./dist/client
COPY --from=build /app/src ./src
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000
# Serve API + static frontend using tsx
CMD ["npx", "tsx", "src/server/index.ts"]
