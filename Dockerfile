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
ENV FRONTEND_DIR=/app/frontend/dist
ENV NODE_OPTIONS=--max-old-space-size=256

COPY --from=build /app/dist ./dist
COPY --from=build /app/frontend/dist ./frontend/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

EXPOSE 3000
# Serve API + static frontend
CMD ["node", "dist/server/index.js"]
