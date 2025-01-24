from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
import requests
import base64
import time
import random

# Choose import based on environment
if os.getenv("DOCKER_ENV"):
    from server.game.game_logic import GameState, StoryGenerator, MAX_RADIATION
else:
    from game.game_logic import GameState, StoryGenerator, MAX_RADIATION

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

class Choice(BaseModel):
    id: int
    text: str

class StoryResponse(BaseModel):
    story_text: str
    choices: List[Choice]
    is_death: bool = False
    is_victory: bool = False
    radiation_level: int

class ChatMessage(BaseModel):
    message: str
    choice_id: Optional[int] = None

class ImageGenerationRequest(BaseModel):
    prompt: str
    negative_prompt: Optional[str] = None
    width: Optional[int] = 1024
    height: Optional[int] = 1024

class ImageGenerationResponse(BaseModel):
    success: bool
    image_base64: Optional[str] = None
    error: Optional[str] = None

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
        story_segment = story_generator.generate_story_segment(game_state, previous_choice)
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

        response = StoryResponse(
            story_text=story_segment.story_text,
            choices=choices,
            is_death=is_death,
            is_victory=story_segment.is_victory,
            radiation_level=game_state.radiation_level
        )
        print("Sending response:", response)
        return response

    except Exception as e:
        import traceback
        print(f"Error in chat_endpoint: {str(e)}")
        print("Traceback:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-image", response_model=ImageGenerationResponse)
async def generate_image(request: ImageGenerationRequest):
    try:
        if not HF_API_KEY:
            return ImageGenerationResponse(
                success=False,
                error="HF_API_KEY is not configured in .env file"
            )

        # Transform the prompt into an artistic prompt
        original_prompt = request.prompt
        # Remove prefix for transformation
        story_text = original_prompt.replace("moebius style scene: ", "").strip()
        art_prompt = await story_generator.transform_story_to_art_prompt(story_text)
        # Reapply prefix
        final_prompt = f"moebius style scene: {art_prompt}"
        print("Original prompt:", original_prompt)
        print("Transformed art prompt:", final_prompt)
        
        # Paramètres de retry
        max_retries = 3
        retry_delay = 1  # secondes
        
        for attempt in range(max_retries):
            try:
                # Appel à l'endpoint HF avec authentification
                response = requests.post(
                    "https://tvsk4iu4ghzffi34.us-east-1.aws.endpoints.huggingface.cloud",
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "image/jpeg",
                        "Authorization": f"Bearer {HF_API_KEY}"
                    },
                    json={
                        "inputs": final_prompt,
                        "parameters": {
                            "guidance_scale": 9.0,  # Valeur du Comic Factory
                            "width": request.width or 1024,
                            "height": request.height or 1024,
                            "negative_prompt": "manga, anime, american comic, grayscale, monochrome, photo, painting, 3D render"
                        }
                    }
                )

                print(f"Attempt {attempt + 1} - API Response status:", response.status_code)
                print("API Response headers:", dict(response.headers))

                if response.status_code == 503:
                    if attempt < max_retries - 1:
                        print(f"Service unavailable, retrying in {retry_delay} seconds...")
                        time.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                        continue
                    else:
                        return ImageGenerationResponse(
                            success=False,
                            error="Service is currently unavailable after multiple retries"
                        )

                if response.status_code != 200:
                    error_msg = response.text if response.text else "Unknown error"
                    print("Error response:", error_msg)
                    return ImageGenerationResponse(
                        success=False,
                        error=f"API error: {error_msg}"
                    )

                # L'API renvoie directement l'image en binaire
                image_bytes = response.content
                base64_image = base64.b64encode(image_bytes).decode('utf-8')
                
                print("Base64 image length:", len(base64_image))
                
                return ImageGenerationResponse(
                    success=True,
                    image_base64=f"data:image/jpeg;base64,{base64_image}"
                )

            except requests.exceptions.RequestException as e:
                if attempt < max_retries - 1:
                    print(f"Request failed, retrying in {retry_delay} seconds... Error: {str(e)}")
                    time.sleep(retry_delay)
                    retry_delay *= 2
                    continue
                else:
                    raise

    except Exception as e:
        print("Error in generate_image:", str(e))
        return ImageGenerationResponse(
            success=False,
            error=f"Error generating image: {str(e)}"
        )

# Mount static files (this should be after all API routes)
app.mount("/", StaticFiles(directory=STATIC_FILES_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.server:app", host=API_HOST, port=API_PORT, reload=True) 