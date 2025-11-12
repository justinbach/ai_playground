# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS base

ENV NODE_ENV=production
WORKDIR /app

# Install only production deps
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Copy app source
COPY . .

# The server listens on PORT (Render sets this)
EXPOSE 3001

CMD ["node", "index.js"]
