import asyncio
from langchain_mistralai.chat_models import ChatMistralAI
from langchain.schema import SystemMessage, HumanMessage
from langchain.schema.messages import BaseMessage

# Available Mistral models:
# - mistral-tiny     : Fastest, cheapest, good for testing
# - mistral-small    : Good balance of speed and quality
# - mistral-medium   : Better quality, slower than small
# - mistral-large    : Best quality, slowest and most expensive
# Pricing: https://docs.mistral.ai/platform/pricing/

class MistralClient:
    def __init__(self, api_key: str, model_name: str = "mistral-small"):
        self.model = ChatMistralAI(
            mistral_api_key=api_key,
            model=model_name,
            max_tokens=1000
        )
        self.fixing_model = ChatMistralAI(
            mistral_api_key=api_key,
            model=model_name,
            max_tokens=1000
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
    
    async def generate_story(self, messages: list[BaseMessage]) -> str:
        """Génère une réponse à partir d'une liste de messages."""
        try:
            await self._wait_for_rate_limit()
            response = await self.model.ainvoke(messages)
            return response.content
        except Exception as e:
            print(f"Error in Mistral API call: {str(e)}")
            raise

    async def transform_prompt(self, story_text: str, art_prompt: str) -> str:
        """Transforme un texte d'histoire en prompt artistique."""
        try:
            await self._wait_for_rate_limit()
            response = await self.model.ainvoke([{
                "role": "system",
                "content": art_prompt
            }, {
                "role": "user",
                "content": f"Transform this story text into a comic panel description:\n{story_text}"
            }])
            return response.content
        except Exception as e:
            print(f"Error transforming prompt: {str(e)}")
            return story_text 