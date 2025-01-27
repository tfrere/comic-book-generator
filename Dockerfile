FROM node:18 as client-build
WORKDIR /app
COPY client/package*.json ./
RUN npm install
COPY client/ ./
ENV VITE_API_URL=https://mistral-ai-game-jam-dont-lookup.hf.space
RUN mkdir -p dist && npm run build

FROM python:3.10-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 -

# Copy project files
COPY . .

# Configure Poetry
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --only main --no-root

# Create non-root user
RUN useradd -m -u 1000 user

# Copy and install Python dependencies
COPY server/pyproject.toml server/poetry.lock* ./
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --only main --no-root

# Copy server code
COPY server/ ./server/

# Copy client build
COPY --from=client-build /app/dist ./static

# Environment variables
ENV API_HOST=0.0.0.0 \
    API_PORT=7860 \
    STATIC_FILES_DIR=static \
    DOCKER_ENV=true

# Create cache directory and set permissions
RUN mkdir -p /app/cache && chown -R user:user /app/cache

# Switch to non-root user
USER user

EXPOSE 7860

# Start the server
CMD ["poetry", "run", "python", "server/server.py"]