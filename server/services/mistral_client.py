import asyncio
import json
from typing import TypeVar, Type, Optional, Callable
from pydantic import BaseModel
from langchain_mistralai.chat_models import ChatMistralAI
from langchain.schema import SystemMessage, HumanMessage
from langchain.schema.messages import BaseMessage

T = TypeVar('T', bound=BaseModel)

# Available Mistral models:
# - mistral-tiny     : Fastest, cheapest, good for testing
# - mistral-small    : Good balance of speed and quality
# - mistral-medium   : Better quality, slower than small
# - mistral-large    : Best quality, slowest and most expensive
#
# mistral-large-latest: currently points to mistral-large-2411.
# pixtral-large-latest: currently points to pixtral-large-2411.
# mistral-moderation-latest: currently points to mistral-moderation-2411.
# ministral-3b-latest: currently points to ministral-3b-2410.
# ministral-8b-latest: currently points to ministral-8b-2410.
# open-mistral-nemo: currently points to open-mistral-nemo-2407.
# mistral-small-latest: currently points to mistral-small-2409.
# codestral-latest: currently points to codestral-2501.
#
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
        self.max_retries = 5
    
    async def _wait_for_rate_limit(self):
        """Attend le temps nécessaire pour respecter le rate limit."""
        current_time = asyncio.get_event_loop().time()
        time_since_last_call = current_time - self.last_call_time
        
        if time_since_last_call < self.min_delay:
            await asyncio.sleep(self.min_delay - time_since_last_call)
        
        self.last_call_time = asyncio.get_event_loop().time()

    async def _generate_with_retry(
        self,
        messages: list[BaseMessage],
        response_model: Optional[Type[T]] = None,
        custom_parser: Optional[Callable[[str], T]] = None,
        error_feedback: str = None
    ) -> T | str:
        """
        Génère une réponse avec retry et parsing structuré optionnel.
        
        Args:
            messages: Liste des messages pour le modèle
            response_model: Classe Pydantic pour parser la réponse
            custom_parser: Fonction de parsing personnalisée
            error_feedback: Feedback d'erreur à ajouter au prompt en cas de retry
        """
        retry_count = 0
        last_error = None
        
        while retry_count < self.max_retries:
            try:
                # Ajouter le feedback d'erreur si présent
                current_messages = messages.copy()
                if error_feedback and retry_count > 0:
                    current_messages.append(HumanMessage(content=f"Previous error: {error_feedback}. Please try again."))
                
                # Générer la réponse
                await self._wait_for_rate_limit()
                response = await self.model.ainvoke(current_messages)
                content = response.content
                
                # Si pas de parsing requis, retourner le contenu brut
                if not response_model and not custom_parser:
                    return content
                
                # Parser la réponse
                if custom_parser:
                    return custom_parser(content)
                
                # Essayer de parser avec le modèle Pydantic
                try:
                    data = json.loads(content)
                    return response_model(**data)
                except json.JSONDecodeError as e:
                    last_error = f"Invalid JSON format: {str(e)}"
                    raise ValueError(last_error)
                except Exception as e:
                    last_error = str(e)
                    raise ValueError(last_error)
                
            except Exception as e:
                print(f"Error on attempt {retry_count + 1}/{self.max_retries}: {str(e)}")
                retry_count += 1
                if retry_count < self.max_retries:
                    await asyncio.sleep(2 * retry_count)
                    continue
                raise Exception(f"Failed after {self.max_retries} attempts. Last error: {last_error or str(e)}")
    
    async def generate(self, messages: list[BaseMessage], response_model: Optional[Type[T]] = None, custom_parser: Optional[Callable[[str], T]] = None) -> T | str:
        """Génère une réponse à partir d'une liste de messages avec parsing optionnel."""
        return await self._generate_with_retry(messages, response_model, custom_parser)

    async def transform_prompt(self, story_text: str, art_prompt: str) -> str:
        """Transforme un texte d'histoire en prompt artistique."""
        messages = [{
            "role": "system",
            "content": art_prompt
        }, {
            "role": "user",
            "content": f"Transform this story text into a comic panel description:\n{story_text}"
        }]
        try:
            return await self._generate_with_retry(messages)
        except Exception as e:
            print(f"Error transforming prompt: {str(e)}")
            return story_text 