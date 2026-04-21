# ========================================
# Dockerfile cho backend Node.js
# Deploy lên Google Cloud Run
# ========================================

# Stage 1: Base image — Node 20 Alpine (nhẹ)
FROM node:20-alpine AS base
WORKDIR /app

# Copy package files trước (tận dụng Docker layer cache)
COPY package*.json ./

# ---- Production dependencies only ----
FROM base AS deps
RUN npm ci --only=production

# ---- Final image ----
FROM node:20-alpine AS runner
WORKDIR /app

# Chạy với user non-root (bảo mật)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy dependencies từ stage deps
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY --chown=appuser:appgroup src/ ./src/
COPY --chown=appuser:appgroup package.json ./

# Cloud Run tự inject PORT qua env var
EXPOSE 3001

# Health check (Cloud Run dùng để kiểm tra container sẵn sàng)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s CMD \
  wget -qO- http://localhost:${PORT:-3001}/health || exit 1

CMD ["node", "src/app.js"]
