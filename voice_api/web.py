"""Serve the built game and voice API together for internet hosting."""

from pathlib import Path

from fastapi.staticfiles import StaticFiles

from .main import app

DIST_DIR = Path(__file__).resolve().parent.parent / "dist"
if not (DIST_DIR / "index.html").is_file():
    raise RuntimeError("Game build is missing. Run npm ci && npm run build first.")

# Register after the API routes so /api/pitch and /health remain accessible.
# Only dist is public; source code and environment files are never served.
app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="game")
