# Stage 1: Build React Frontend
FROM node:20-alpine AS build-frontend
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Build Python Backend
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies for document processing
RUN apt-get update && apt-get install -y \
    libxml2-dev \
    libxslt-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY backend.py .
COPY reconstructor.py .
COPY core_processor.py .
COPY .env .

# Copy built frontend from Stage 1
COPY --from=build-frontend /app/dist ./dist

# Environment variables
ENV PORT=5000
ENV FLASK_ENV=production

EXPOSE 5000

CMD ["python", "backend.py"]
