FROM node:22-bookworm-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
RUN npm run build

FROM python:3.11-slim-bookworm
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8000
# Use CPU wheels: this application does not require a GPU.
RUN pip install --no-cache-dir torch==2.8.0 torchaudio==2.8.0 --index-url https://download.pytorch.org/whl/cpu
COPY requirements-voice.txt ./
RUN pip install --no-cache-dir -r requirements-voice.txt
COPY voice_api ./voice_api
COPY --from=frontend /app/dist ./dist
RUN useradd --create-home --uid 10001 game && mkdir /app/data && chown game:game /app/data
USER game
EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn voice_api.web:app --host 0.0.0.0 --port \"${PORT}\""]
