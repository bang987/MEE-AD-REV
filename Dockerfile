# ============================================
# Stage 1: Build Frontend (Next.js Standalone)
# ============================================
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY src/frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY src/frontend/ ./

# Set API URL for build (backend runs on localhost:8000 in same container)
ENV NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Build with standalone output
RUN npm run build

# ============================================
# Stage 2: Final Image (Python + Node Runtime)
# ============================================
FROM python:3.12-slim

# Install system dependencies for PaddleOCR and Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend requirements and install Python dependencies
COPY src/backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Pre-download PaddleOCR models (to avoid download on first request)
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(use_angle_cls=True, lang='korean', show_log=False)"

# Copy backend source
COPY src/backend/ ./backend/

# Copy frontend standalone build
COPY --from=frontend-builder /app/frontend/.next/standalone ./frontend/
COPY --from=frontend-builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=frontend-builder /app/frontend/public ./frontend/public

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create directories for file uploads and data
RUN mkdir -p /app/backend/uploads /app/backend/data

# Environment variables (can be overridden at runtime)
ENV PYTHONUNBUFFERED=1
ENV DEBUG=false
ENV PORT=8080

# Expose port (Railway uses PORT env var)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start both services
ENTRYPOINT ["/docker-entrypoint.sh"]
