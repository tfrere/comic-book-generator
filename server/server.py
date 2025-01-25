from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import os
from dotenv import load_dotenv
import base64
import time
import random
import asyncio
import aiohttp
from contextlib import asynccontextmanager

# Import local modules
if os.getenv("DOCKER_ENV"):
    from server.game.game_logic import GameState, StoryGenerator, MAX_RADIATION
    from server.api_clients import FluxClient
else:
    from game.game_logic import GameState, StoryGenerator, MAX_RADIATION
    from api_clients import FluxClient

# Load environment variables
load_dotenv()

# API configuration
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
STATIC_FILES_DIR = os.getenv("STATIC_FILES_DIR", "../client/dist")
HF_API_KEY = os.getenv("HF_API_KEY")
AWS_TOKEN = os.getenv("AWS_TOKEN", "VHVlIEZlYiAyNyAwOTowNzoyMiBDRVQgMjAyNA==")  # Token par défaut pour le développement
ELEVEN_LABS_API_KEY = os.getenv("ELEVEN_LABS_API_KEY")  # Nouvelle clé d'API

app = FastAPI(title="Echoes of Influence")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        f"http://localhost:{API_PORT}",  # API port
        "https://huggingface.co",  # HF main domain
        "https://*.hf.space",      # HF Spaces domains
        "https://mistral-ai-game-jam-dont-lookup.hf.space"  # Our HF Space URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize game components
game_state = GameState()

# Check for API key
mistral_api_key = os.getenv("MISTRAL_API_KEY")
if not mistral_api_key:
    raise ValueError("MISTRAL_API_KEY environment variable is not set")

story_generator = StoryGenerator(api_key=mistral_api_key)
flux_client = FluxClient(api_key=HF_API_KEY)

# Store client sessions and requests by type
client_sessions: Dict[str, aiohttp.ClientSession] = {}
client_requests: Dict[str, Dict[str, asyncio.Task]] = {}

async def get_client_session(client_id: str) -> aiohttp.ClientSession:
    """Get or create a client session"""
    if client_id not in client_sessions:
        client_sessions[client_id] = aiohttp.ClientSession()
    return client_sessions[client_id]

async def cancel_previous_request(client_id: str, request_type: str):
    """Cancel previous request if it exists"""
    if client_id in client_requests and request_type in client_requests[client_id]:
        task = client_requests[client_id][request_type]
        if not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

async def store_request(client_id: str, request_type: str, task: asyncio.Task):
    """Store a request for a client"""
    if client_id not in client_requests:
        client_requests[client_id] = {}
    client_requests[client_id][request_type] = task

class Choice(BaseModel):
    id: int
    text: str

class StoryResponse(BaseModel):
    story_text: str = Field(description="The story text with proper nouns in bold using ** markdown")
    choices: List[Choice]
    radiation_level: int = Field(description="Current radiation level from 0 to 10")
    is_victory: bool = Field(description="Whether this segment ends in Sarah's victory", default=False)
    is_first_step: bool = Field(description="Whether this is the first step of the story", default=False)
    is_last_step: bool = Field(description="Whether this is the last step (victory or death)", default=False)
    image_prompts: List[str] = Field(description="List of 1 to 3 comic panel descriptions that illustrate the key moments of the scene", min_items=1, max_items=3)

class ChatMessage(BaseModel):
    message: str
    choice_id: Optional[int] = None

class ImageGenerationRequest(BaseModel):
    prompt: str
    width: int = Field(description="Width of the image to generate")
    height: int = Field(description="Height of the image to generate")

class ImageGenerationResponse(BaseModel):
    success: bool
    image_base64: Optional[str] = None
    error: Optional[str] = None

class TextToSpeechRequest(BaseModel):
    text: str
    voice_id: str = "nPczCjzI2devNBz1zQrb"  # Default voice ID (Rachel)

class DirectImageGenerationRequest(BaseModel):
    prompt: str = Field(description="The prompt to use directly for image generation")
    width: int = Field(description="Width of the image to generate")
    height: int = Field(description="Height of the image to generate")

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "game_state": {
            "story_beat": game_state.story_beat,
            "radiation_level": game_state.radiation_level
        }
    }

@app.post("/api/chat", response_model=StoryResponse)
async def chat_endpoint(chat_message: ChatMessage):
    try:
        print("Received chat message:", chat_message)
        
        # Handle restart
        if chat_message.message.lower() == "restart":
            print("Handling restart - Resetting game state")
            game_state.reset()
            previous_choice = "none"
            print(f"After reset - story_beat: {game_state.story_beat}")
        else:
            previous_choice = f"Choice {chat_message.choice_id}" if chat_message.choice_id else "none"

        print("Previous choice:", previous_choice)
        print("Current story beat:", game_state.story_beat)

        # Generate story segment
        llm_response = await story_generator.generate_story_segment(game_state, previous_choice)
        print("Generated story segment:", llm_response)
        
        # Update radiation level
        game_state.radiation_level += llm_response.radiation_increase
        print("Updated radiation level:", game_state.radiation_level)
        
        # Check for radiation death
        is_death = game_state.radiation_level >= MAX_RADIATION
        if is_death:
            llm_response.choices = []
            # Pour la mort, on ne garde qu'un seul prompt d'image
            if len(llm_response.image_prompts) > 1:
                llm_response.image_prompts = [llm_response.image_prompts[0]]

        # Add segment to history (before victory check to include final state)
        game_state.add_to_history(llm_response.story_text, previous_choice, llm_response.image_prompts)

        # Check for victory condition
        if not is_death and game_state.story_beat >= 5:
            # Chance de victoire augmente avec le nombre de steps
            victory_chance = (game_state.story_beat - 4) * 0.2  # 20% de chance par step après le 5ème
            if random.random() < victory_chance:
                llm_response.is_victory = True
                llm_response.choices = []
                # Pour la victoire, on ne garde qu'un seul prompt d'image
                if len(llm_response.image_prompts) > 1:
                    llm_response.image_prompts = [llm_response.image_prompts[0]]

        # Pour la première étape, on ne garde qu'un seul prompt d'image
        if game_state.story_beat == 0 and len(llm_response.image_prompts) > 1:
            llm_response.image_prompts = [llm_response.image_prompts[0]]
        
        # Convert LLM choices to API choices format
        choices = [] if is_death or llm_response.is_victory else [
            Choice(id=i, text=choice.strip())
            for i, choice in enumerate(llm_response.choices, 1)
        ]

        # Convert LLM response to API response format
        response = StoryResponse(
            story_text=llm_response.story_text,
            choices=choices,
            radiation_level=game_state.radiation_level,
            is_victory=llm_response.is_victory,
            is_first_step=game_state.story_beat == 0,
            is_last_step=is_death or llm_response.is_victory,
            image_prompts=llm_response.image_prompts
        )
        
        # Only increment story beat if not dead and not victory
        if not is_death and not llm_response.is_victory:
            game_state.story_beat += 1
            print("Incremented story beat to:", game_state.story_beat)
            
        print("Sending response:", response)
        return response

    except Exception as e:
        import traceback
        print(f"Error in chat_endpoint: {str(e)}")
        print("Traceback:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/text-to-speech")
async def text_to_speech(request: TextToSpeechRequest):
    """Endpoint pour convertir du texte en audio via ElevenLabs"""
    try:
        if not ELEVEN_LABS_API_KEY:
            raise HTTPException(status_code=500, detail="ElevenLabs API key not configured")

        # Nettoyer le texte des balises markdown **
        clean_text = request.text.replace("**", "")

        # Appel à l'API ElevenLabs
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{request.voice_id}"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": ELEVEN_LABS_API_KEY
        }
        data = {
            "text": clean_text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=data, headers=headers) as response:
                if response.status == 200:
                    audio_content = await response.read()
                    # Convertir l'audio en base64 pour l'envoyer au client
                    audio_base64 = base64.b64encode(audio_content).decode('utf-8')
                    return {"success": True, "audio_base64": audio_base64}
                else:
                    error_text = await response.text()
                    raise HTTPException(status_code=response.status, detail=error_text)

    except Exception as e:
        print(f"Error in text_to_speech: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-image-direct")
async def generate_image_direct(request: DirectImageGenerationRequest):
    try:
        print(f"Generating image directly with dimensions: {request.width}x{request.height}")
        print(f"Using prompt: {request.prompt}")

        # Generate image using Flux client directly without transforming the prompt
        image_bytes = await flux_client.generate_image(
            prompt=request.prompt,
            width=request.width,
            height=request.height
        )
        
        if image_bytes:
            print(f"Received image bytes of length: {len(image_bytes)}")
            if isinstance(image_bytes, str):
                print("Warning: image_bytes is a string, converting to bytes")
                image_bytes = image_bytes.encode('utf-8')
            base64_image = base64.b64encode(image_bytes).decode('utf-8').strip('"')
            print(f"Converted to base64 string of length: {len(base64_image)}")
            return {"success": True, "image_base64": base64_image}
        else:
            print("No image bytes received from Flux client")
            return {"success": False, "error": "Failed to generate image"}

    except Exception as e:
        print(f"Error generating image: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return {"success": False, "error": str(e)}

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up sessions on shutdown"""
    # Cancel all pending requests
    for client_id in client_requests:
        for request_type in client_requests[client_id]:
            await cancel_previous_request(client_id, request_type)
    
    # Close all sessions
    for session in client_sessions.values():
        await session.close()

# Mount static files (this should be after all API routes)
app.mount("/", StaticFiles(directory=STATIC_FILES_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.server:app", host=API_HOST, port=API_PORT, reload=True) 