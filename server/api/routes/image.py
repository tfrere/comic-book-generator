from fastapi import APIRouter, Header
from typing import Optional
import base64

from services.flux_client import FluxClient
from api.models import ImageGenerationRequest

router = APIRouter()

def get_image_router(flux_client: FluxClient):
    @router.post("/generate-image")
    async def generate_image(
        request: ImageGenerationRequest,
        x_session_id: Optional[str] = Header(None)
    ):
        try:
            print(f"Generating image with dimensions: {request.width}x{request.height}")
            print(f"Using prompt: {request.prompt}")

            image_bytes = await flux_client.generate_image(
                prompt=request.prompt,
                width=request.width,
                height=request.height
            )
            
            if image_bytes:
                if isinstance(image_bytes, str):
                    image_bytes = image_bytes.encode('utf-8')
                base64_image = base64.b64encode(image_bytes).decode('utf-8').strip('"')
                return {"success": True, "image_base64": base64_image}
            else:
                return {"success": False, "error": "Failed to generate image"}

        except Exception as e:
            print(f"Error generating image: {str(e)}")
            return {"success": False, "error": str(e)}
    
    return router 