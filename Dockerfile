# ---- Build stage: Angular frontend ----
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build --prod

# ---- Build stage: Node backend ----
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app

# Copy backend files
COPY --from=backend-builder /app/backend .

# Copy built Angular assets
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port (Render will set PORT env)
ENV PORT=3000
EXPOSE $PORT

# Start the server
CMD ["node", "src/server.js"]
