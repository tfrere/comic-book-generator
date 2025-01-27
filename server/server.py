from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from dotenv import load_dotenv

# Import local modules
from core.game_logic import StoryGenerator
from core.session_manager import SessionManager
from services.flux_client import FluxClient
from api.routes.chat import get_chat_router
from api.routes.image import get_image_router
from api.routes.speech import get_speech_router

# Load environment variables
load_dotenv()

# API configuration
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
STATIC_FILES_DIR = os.getenv("STATIC_FILES_DIR", "../client/dist")
HF_API_KEY = os.getenv("HF_API_KEY")
ELEVEN_LABS_API_KEY = os.getenv("ELEVEN_LABS_API_KEY")
IS_DOCKER = os.getenv("IS_DOCKER", "false").lower() == "true"

app = FastAPI(title="Echoes of Influence")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        f"http://localhost:{API_PORT}",
        "https://huggingface.co",
        "https://*.hf.space",
        "https://mistral-ai-game-jam-dont-lookup.hf.space"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
mistral_api_key = os.getenv("MISTRAL_API_KEY")
if not mistral_api_key:
    raise ValueError("MISTRAL_API_KEY environment variable is not set")

session_manager = SessionManager()
story_generator = StoryGenerator(api_key=mistral_api_key)
flux_client = FluxClient(api_key=HF_API_KEY)

# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

# Register route handlers
app.include_router(get_chat_router(session_manager, story_generator), prefix="/api")
app.include_router(get_image_router(flux_client), prefix="/api")
app.include_router(get_speech_router(), prefix="/api")

@app.on_event("startup")
async def startup_event():
    """Initialize components on startup"""
    pass

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on shutdown"""
    # Clean up expired sessions
    session_manager.cleanup_expired_sessions()
    
    # Close API clients
    await flux_client.close()

# Mount static files (this should be after all API routes)
if IS_DOCKER:
    # En mode Docker (HF Space), on monte les fichiers statiques avec des types MIME spécifiques
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_FILES_DIR, "assets"), html=False), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Si le chemin pointe vers un fichier JavaScript
        if full_path.endswith('.js'):
            return FileResponse(
                os.path.join(STATIC_FILES_DIR, full_path),
                media_type='application/javascript'
            )
        # Si le chemin pointe vers un fichier CSS
        elif full_path.endswith('.css'):
            return FileResponse(
                os.path.join(STATIC_FILES_DIR, full_path),
                media_type='text/css'
            )
        # Pour tous les autres chemins, servir index.html
        return FileResponse(
            os.path.join(STATIC_FILES_DIR, "index.html"),
            media_type='text/html'
        )
else:
    # En local, on monte simplement à la racine
    app.mount("/", StaticFiles(directory=STATIC_FILES_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host=API_HOST, port=API_PORT, reload=True) 