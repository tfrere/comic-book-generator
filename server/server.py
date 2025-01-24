from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from elevenlabs import generate, set_api_key
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from typing import List
import httpx

# Load environment variables
load_dotenv()

# Configure Elevenlabs
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID")
MODEL_ID = os.getenv("ELEVENLABS_MODEL_ID", "eleven_monolingual_v1")
ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1"

set_api_key(ELEVENLABS_API_KEY)

app = FastAPI(title="Mon API FastAPI")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextToSpeechRequest(BaseModel):
    text: str

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]

@app.get("/")
async def read_root():
    return {"message": "Bienvenue sur l'API FastAPI!"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.post("/text-to-speech")
async def text_to_speech(request: TextToSpeechRequest):
    try:
        audio = generate(
            text=request.text,
            voice=VOICE_ID,
            model=MODEL_ID
        )
        return {"audio": audio}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        # Préparer le dernier message
        last_message = request.messages[-1].content

        # Headers pour l'API Elevenlabs
        headers = {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
        }

        # Appeler l'API Elevenlabs pour la génération de texte
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{ELEVENLABS_API_URL}/text-generation",
                headers=headers,
                json={
                    "text": last_message,
                    "model_id": MODEL_ID
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=500, 
                    detail="Erreur lors de l'appel à l'API Elevenlabs Text Generation"
                )
            
            response_data = response.json()
            response_text = response_data["text"]

            # Générer l'audio avec la réponse
            audio = generate(
                text=response_text,
                voice=VOICE_ID,
                model=MODEL_ID
            )
            
            return {
                "text": response_text,
                "audio": audio
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True) 