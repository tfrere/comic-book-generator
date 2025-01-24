from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
from game_logic import GameState, StoryGenerator, MAX_RADIATION

# Load environment variables
load_dotenv()

# API configuration
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))

app = FastAPI(title="Echoes of Influence")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        f"http://localhost:{API_PORT}",  # API port
        "https://huggingface.co",  # HF main domain
        "https://*.hf.space",      # HF Spaces domains
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize game components
game_state = GameState()
story_generator = StoryGenerator(api_key=os.getenv("MISTRAL_API_KEY"))

class Choice(BaseModel):
    id: int
    text: str

class StoryResponse(BaseModel):
    story_text: str
    choices: List[Choice]
    is_death: bool = False
    radiation_level: int

class ChatMessage(BaseModel):
    message: str
    choice_id: Optional[int] = None

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
        # Handle restart
        if chat_message.message.lower() == "restart":
            game_state.reset()
            previous_choice = "none"
        else:
            previous_choice = f"Choice {chat_message.choice_id}" if chat_message.choice_id else "none"

        # Generate story segment
        story_segment = story_generator.generate_story_segment(game_state, previous_choice)
        
        # Update radiation level
        game_state.radiation_level += story_segment.radiation_increase
        
        # Check for radiation death
        if game_state.radiation_level >= MAX_RADIATION:
            story_segment = story_generator.process_radiation_death(story_segment)
        
        # Only increment story beat if not dead
        if not story_segment.is_death:
            game_state.story_beat += 1

        # Convert to response format
        choices = [] if story_segment.is_death else [
            Choice(id=i, text=choice.strip())
            for i, choice in enumerate(story_segment.choices, 1)
        ]

        return StoryResponse(
            story_text=story_segment.story_text,
            choices=choices,
            is_death=story_segment.is_death,
            radiation_level=game_state.radiation_level
        )

    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Mount static files (this should be after all API routes)
app.mount("/", StaticFiles(directory="../client/dist", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host=API_HOST, port=API_PORT, reload=True) 