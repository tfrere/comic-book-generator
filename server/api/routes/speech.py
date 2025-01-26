from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import aiohttp
import base64
import os

from api.models import TextToSpeechRequest

router = APIRouter()

def get_speech_router():
    ELEVEN_LABS_API_KEY = os.getenv("ELEVEN_LABS_API_KEY")

    @router.post("/text-to-speech")
    async def text_to_speech(
        request: TextToSpeechRequest,
        x_session_id: Optional[str] = Header(None)
    ):
        """Endpoint pour convertir du texte en audio via ElevenLabs"""
        try:
            if not ELEVEN_LABS_API_KEY:
                raise HTTPException(status_code=500, detail="ElevenLabs API key not configured")

            # Nettoyer le texte des balises markdown
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
                        audio_base64 = base64.b64encode(audio_content).decode('utf-8')
                        return {"success": True, "audio_base64": audio_base64}
                    else:
                        error_text = await response.text()
                        raise HTTPException(status_code=response.status, detail=error_text)

        except Exception as e:
            print(f"Error in text_to_speech: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return router 