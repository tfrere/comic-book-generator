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
from lorem.text import TextLorem
from contextlib import asynccontextmanager


lorem = TextLorem(wsep='-', srange=(2,3), words="A B C D".split())


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

async def get_test_image(client_id: str, width=1024, height=1024):
    """Get a random image from Lorem Picsum"""
    # Build the Lorem Picsum URL with blur and grayscale effects
    url = f"https://picsum.photos/{width}/{height}?grayscale&blur=2"
    
    session = await get_client_session(client_id)
    async with session.get(url) as response:
        if response.status == 200:
            image_bytes = await response.read()
            return base64.b64encode(image_bytes).decode('utf-8')
        else:
            raise Exception(f"Failed to fetch image: {response.status}")

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
            game_state.reset()
            previous_choice = "none"
        else:
            previous_choice = f"Choice {chat_message.choice_id}" if chat_message.choice_id else "none"

        print("Previous choice:", previous_choice)

        # Generate story segment
        story_segment = await story_generator.generate_story_segment(game_state, previous_choice)
        print("Generated story segment:", story_segment)
        
        # Update radiation level
        game_state.radiation_level += story_segment.radiation_increase
        print("Updated radiation level:", game_state.radiation_level)
        
        # Check for radiation death
        is_death = game_state.radiation_level >= MAX_RADIATION
        if is_death:
            story_segment.story_text += f"""

MORT PAR RADIATION: Le corps de Sarah ne peut plus supporter ce niveau de radiation ({game_state.radiation_level}/10). 
Ses cellules se désagrègent alors qu'elle s'effondre, l'esprit rempli de regrets concernant sa sœur. 
Les fournitures médicales qu'elle transportait n'atteindront jamais leur destination. 
Sa mission s'arrête ici, une autre victime du tueur invisible des terres désolées."""
            story_segment.choices = []
        
        # Check for victory condition
        if not is_death and game_state.story_beat >= 5:
            # Chance de victoire augmente avec le nombre de steps
            victory_chance = (game_state.story_beat - 4) * 0.2  # 20% de chance par step après le 5ème
            if random.random() < victory_chance:
                story_segment.is_victory = True
                story_segment.story_text = f"""Sarah l'a fait ! Elle a trouvé un bunker sécurisé avec des survivants. 
                À l'intérieur, elle découvre une communauté organisée qui a réussi à maintenir un semblant de civilisation. 
                Ils ont même un système de décontamination ! Son niveau de radiation : {game_state.radiation_level}/10.
                Elle peut enfin se reposer et peut-être un jour, reconstruire un monde meilleur.
                
                VICTOIRE !"""
                story_segment.choices = []
        
        # Only increment story beat if not dead and not victory
        if not is_death and not story_segment.is_victory:
            game_state.story_beat += 1
            print("Incremented story beat to:", game_state.story_beat)

        # Convert to response format
        choices = [] if is_death or story_segment.is_victory else [
            Choice(id=i, text=choice.strip())
            for i, choice in enumerate(story_segment.choices, 1)
        ]

        # Determine if this is the first step
        is_first_step = chat_message.message == "restart"
        
        # Determine if this is the last step (victory or death)
        is_last_step = game_state.radiation_level >= MAX_RADIATION or story_segment.is_victory

        # Return the response with the new fields
        response = StoryResponse(
            story_text=story_segment.story_text,
            choices=choices,
            radiation_level=game_state.radiation_level,
            is_victory=story_segment.is_victory,
            is_first_step=is_first_step,
            is_last_step=is_last_step
        )
        print("Sending response:", response)
        return response

    except Exception as e:
        import traceback
        print(f"Error in chat_endpoint: {str(e)}")
        print("Traceback:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-image")
async def generate_image(request: ImageGenerationRequest):
    try:
        # Transform story into art prompt
        art_prompt = await story_generator.transform_story_to_art_prompt(request.prompt)
        
        print(f"Generating image with dimensions: {request.width}x{request.height}")
        print(f"Using prompt: {art_prompt}")

        # Generate image using Flux client
        image_bytes = flux_client.generate_image(
            prompt=art_prompt,
            width=request.width,
            height=request.height
        )
        
        if image_bytes:
            print(f"Received image bytes of length: {len(image_bytes)}")
            # Ensure we're getting raw bytes and encoding them properly
            if isinstance(image_bytes, str):
                print("Warning: image_bytes is a string, converting to bytes")
                image_bytes = image_bytes.encode('utf-8')
            base64_image = base64.b64encode(image_bytes).decode('utf-8').strip('"')
            print(f"Converted to base64 string of length: {len(base64_image)}")
            print(f"First 100 chars of base64: {base64_image[:100]}")
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

@app.post("/api/test/chat")
async def test_chat_endpoint(request: Request, chat_message: ChatMessage):
    """Endpoint de test qui génère des données aléatoires"""
    try:
        client_id = request.headers.get("x-client-id", "default")
        
        # Cancel any previous chat request from this client
        await cancel_previous_request(client_id, "chat")
        
        async def generate_chat_response():
            # Générer un texte aléatoire
            story_text = f"**Sarah** {lorem.paragraph()}"
            
            # Générer un niveau de radiation aléatoire qui augmente progressivement
            radiation_level = min(10, random.randint(0, 3) + (chat_message.choice_id or 0))
            
            # Déterminer si c'est le premier pas
            is_first_step = chat_message.message == "restart"
            
            # Déterminer si c'est le dernier pas (mort ou victoire)
            is_last_step = radiation_level >= 30 or (
                not is_first_step and random.random() < 0.1  # 10% de chance de victoire
            )
            
            # Générer des choix aléatoires sauf si c'est la fin
            choices = []
            if not is_last_step:
                num_choices = 2
                for i in range(num_choices):
                    choices.append(Choice(
                        id=i+1,
                        text=f"{lorem.sentence() }"
                    ))
            
            # Construire la réponse
            return StoryResponse(
                story_text=story_text,
                choices=choices,
                radiation_level=radiation_level,
                is_victory=is_last_step and radiation_level < 30,
                is_first_step=is_first_step,
                is_last_step=is_last_step
            )
        
        # Create and store the new request
        task = asyncio.create_task(generate_chat_response())
        await store_request(client_id, "chat", task)
        
        try:
            response = await task
            return response
        except asyncio.CancelledError:
            print(f"[INFO] Chat request cancelled for client {client_id}")
            raise HTTPException(status_code=409, detail="Request cancelled")

    except Exception as e:
        print(f"[ERROR] Error in test_chat_endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/test/generate-image")
async def test_generate_image(request: Request, image_request: ImageGenerationRequest):
    """Endpoint de test qui récupère une image aléatoire"""
    try:
        client_id = request.headers.get("x-client-id", "default")
        
        print(f"[DEBUG] Client ID: {client_id}")
        print(f"[DEBUG] Raw request data: {image_request}")
        
        # Cancel any previous image request from this client
        await cancel_previous_request(client_id, "image")
        
        # Create and store the new request
        task = asyncio.create_task(get_test_image(client_id, image_request.width, image_request.height))
        await store_request(client_id, "image", task)
        
        try:
            image_base64 = await task
            return {
                "success": True,
                "image_base64": image_base64
            }
        except asyncio.CancelledError:
            print(f"[INFO] Image request cancelled for client {client_id}")
            return {
                "success": False,
                "error": "Request cancelled"
            }
            
    except Exception as e:
        print(f"[ERROR] Detailed error in test_generate_image: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

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