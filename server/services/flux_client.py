import os
import aiohttp
from typing import Optional

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
                      guidance_scale: float = 9.0) -> Optional[bytes]:
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
                print(f"Response content type: {response.headers.get('content-type', 'unknown')}")
                
                if response.status == 200:
                    content = await response.read()
                    content_length = len(content)
                    print(f"Received successful response with content length: {content_length}")
                    if isinstance(content, bytes):
                        print("Response content is bytes (correct)")
                    else:
                        print(f"Warning: Response content is {type(content)}")
                    return content
                else:
                    error_content = await response.text()
                    print(f"Error from Flux API: {response.status}")
                    print(f"Response content: {error_content}")
                    return None
                
        except Exception as e:
            print(f"Error in FluxClient.generate_image: {str(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return None
            
    async def close(self):
        if self._session:
            await self._session.close()
            self._session = None