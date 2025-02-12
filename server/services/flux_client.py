import os
import aiohttp
from typing import Optional, Tuple

class FluxClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.endpoint = os.getenv("FLUX_ENDPOINT")
        self._session = None
    
    async def _get_session(self):
        if self._session is None:
            self._session = aiohttp.ClientSession()
        return self._session
    
    async def generate_image(self, 
                      prompt: str, 
                      width: int, 
                      height: int,
                      num_inference_steps: int = 5,
                      guidance_scale: float = 9.0) -> Tuple[Optional[bytes], Optional[str]]:
        """Génère une image à partir d'un prompt."""
        try:
            # Ensure dimensions are multiples of 8
            width = (width // 8) * 8
            height = (height // 8) * 8
            
            print(f"Sending request to Hugging Face API: {self.endpoint}")
            print(f"Headers: Authorization: Bearer {self.api_key[:4]}...")
            print(f"Request body: {prompt[:100]}...")

            session = await self._get_session()
            async with session.post(
                self.endpoint,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Accept": "image/jpeg"
                },
                json={
                    "inputs": prompt,
                    "parameters": {
                        "num_inference_steps": num_inference_steps,
                        "guidance_scale": guidance_scale,
                        "width": width,
                        "height": height,
                        "negative_prompt": "Bubbles, text, caption. Do not include bright or clean clothing."
                    }
                }
            ) as response:
                print(f"Response status code: {response.status}")
                print(f"Response headers: {response.headers}")
                
                # Vérifier si le modèle est en cours d'initialisation
                if response.status == 503:
                    error_content = await response.text()
                    if "currently loading" in error_content.lower() or "initializing" in error_content.lower():
                        return None, "initializing"
                    return None, "unavailable"
                
                if response.status == 200:
                    content = await response.read()
                    return content, None
                else:
                    error_content = await response.text()
                    print(f"Error from Flux API: {response.status}")
                    print(f"Response content: {error_content}")
                    return None, error_content
                
        except Exception as e:
            print(f"Error in FluxClient.generate_image: {str(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return None, str(e)
            
    async def close(self):
        if self._session:
            await self._session.close()
            self._session = None

    async def check_health(self) -> Tuple[bool, Optional[str]]:
        """
        Vérifie la disponibilité du service Flux en tentant de générer une petite image.
        
        Returns:
            Tuple[bool, Optional[str]]: (is_healthy, status)
            - is_healthy: True si le service est disponible
            - status: "healthy", "initializing", ou message d'erreur
        """
        try:
            # Test simple prompt pour générer une petite image
            test_image, status = await self.generate_image(
                prompt="test image, simple circle",
                width=64,  # Petite image pour le test
                height=64,
                num_inference_steps=1  # Minimum d'étapes pour être rapide
            )
            
            if test_image is not None:
                return True, "healthy"
            elif status == "initializing":
                return False, "initializing"
            else:
                return False, status or "unavailable"
                
        except Exception as e:
            print(f"Health check failed: {str(e)}")
            return False, str(e)