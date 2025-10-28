# ───────────────────────────────
# 🏗️ STAGE 1 : BUILD
# ───────────────────────────────
FROM node:18-alpine AS builder

RUN apk add --no-cache git python3 make g++

WORKDIR /app

# Clone widjis OpenProject MCP repo
RUN git clone https://github.com/widjis/mcp-openproject.git ./mcp-openproject

# Install MCP server dependencies
WORKDIR /app/mcp-openproject
RUN npm ci --include=dev
RUN npm run build

# Build FastMCP proxy
WORKDIR /app
COPY package.json package-lock.json* ./
COPY tsconfig.json ./
COPY src ./src

RUN npm ci --include=dev
RUN npm run build

# Prune to production only
RUN npm prune --production


# ───────────────────────────────
# 🚀 STAGE 2 : RUNTIME
# ───────────────────────────────
FROM node:18-alpine

RUN apk add --no-cache dumb-init wget

WORKDIR /app

# Copy from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/mcp-openproject ./mcp-openproject

ENV NODE_ENV=production
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=60s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1

ENTRYPOINT ["dumb-init", "node", "dist/index.js"]

