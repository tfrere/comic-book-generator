import os
import requests
import asyncio
from typing import Optional
from langchain_mistralai.chat_models import ChatMistralAI
from langchain.schema import SystemMessage, HumanMessage

class MistralClient:
    def __init__(self, api_key: str):
        self.chat_model = ChatMistralAI(
            mistral_api_key=api_key,
            model="ft:ministral-3b-latest:82f3f89c:20250125:12222969",
            temperature=0.7
        )
        
        # Pour le fixing parser
        self.fixing_model = ChatMistralAI(
            mistral_api_key=api_key,
            model="ft:ministral-3b-latest:82f3f89c:20250125:12222969",
            temperature=0.1
        )
        
        # Pour gérer le rate limit
        self.last_call_time = 0
        self.min_delay = 1  # 1 seconde minimum entre les appels
    
    async def _wait_for_rate_limit(self):
        """Attend le temps nécessaire pour respecter le rate limit."""
        current_time = asyncio.get_event_loop().time()
        time_since_last_call = current_time - self.last_call_time
        
        if time_since_last_call < self.min_delay:
            await asyncio.sleep(self.min_delay - time_since_last_call)
        
        self.last_call_time = asyncio.get_event_loop().time()
    
    async def generate_story(self, messages) -> str:
        """Génère une réponse à partir d'une liste de messages."""
        try:
            await self._wait_for_rate_limit()
            response = self.chat_model.invoke(messages)
            return response.content
        except Exception as e:
            print(f"Error in Mistral API call: {str(e)}")
            raise

    async def transform_prompt(self, story_text: str, system_prompt: str) -> str:
        """Transforme un texte d'histoire en prompt artistique."""
        try:
            await self._wait_for_rate_limit()
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=f"Transform into a short prompt: {story_text}")
            ]
            response = self.chat_model.invoke(messages)
            return response.content
        except Exception as e:
            print(f"Error transforming prompt: {str(e)}")
            return story_text

class FluxClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.endpoint = os.getenv("FLUX_ENDPOINT")
    
    def generate_image(self, 
                      prompt: str, 
                      width: int, 
                      height: int,
                      num_inference_steps: int = 30,
                      guidance_scale: float = 9.0) -> Optional[bytes]:
        """Génère une image à partir d'un prompt."""
        try:
            # Ensure dimensions are multiples of 8
            width = (width // 8) * 8
            height = (height // 8) * 8
            
            print(f"Sending request to Hugging Face API: {self.endpoint}")
            print(f"Headers: Authorization: Bearer {self.api_key[:4]}...")
            print(f"Request body: {prompt[:100]}...")
            
            response = requests.post(
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
                        "negative_prompt": "speech bubble, caption, subtitle"
                    }
                }
            )
            
            print(f"Response status code: {response.status_code}")
            print(f"Response headers: {response.headers}")
            print(f"Response content type: {response.headers.get('content-type', 'unknown')}")
            
            if response.status_code == 200:
                content_length = len(response.content)
                print(f"Received successful response with content length: {content_length}")
                if isinstance(response.content, bytes):
                    print("Response content is bytes (correct)")
                else:
                    print(f"Warning: Response content is {type(response.content)}")
                return response.content
            else:
                print(f"Error from Flux API: {response.status_code}")
                print(f"Response content: {response.content}")
                return None
                
        except Exception as e:
            print(f"Error in FluxClient.generate_image: {str(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return None 