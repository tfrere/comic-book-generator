import asyncio
import json
import logging
from typing import TypeVar, Type, Optional, Callable
from pydantic import BaseModel
from langchain_mistralai.chat_models import ChatMistralAI
from langchain.schema import SystemMessage, HumanMessage
from langchain.schema.messages import BaseMessage

T = TypeVar('T', bound=BaseModel)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

class MistralAPIError(Exception):
    """Base class for Mistral API errors"""
    pass

class MistralRateLimitError(MistralAPIError):
    """Raised when hitting rate limits"""
    pass

class MistralParsingError(MistralAPIError):
    """Raised when response parsing fails"""
    pass

class MistralValidationError(MistralAPIError):
    """Raised when response validation fails"""
    pass

class MistralClient:
    def __init__(self, api_key: str, model_name: str = "mistral-large-latest", max_tokens: int = 1000):
        logger.info(f"Initializing MistralClient with model: {model_name}, max_tokens: {max_tokens}")
        self.model = ChatMistralAI(
            mistral_api_key=api_key,
            model=model_name,
            max_tokens=max_tokens
        )
        self.fixing_model = ChatMistralAI(
            mistral_api_key=api_key,
            model=model_name,
            max_tokens=max_tokens
        )
        
        # Pour gérer le rate limit
        self.last_call_time = 0
        self.min_delay = 1  # 1 seconde minimum entre les appels
        self.max_retries = 5
        self.backoff_factor = 2  # For exponential backoff
        self.max_backoff = 30  # Maximum backoff time in seconds
    
    async def _wait_for_rate_limit(self):
        """Attend le temps nécessaire pour respecter le rate limit."""
        current_time = asyncio.get_event_loop().time()
        time_since_last_call = current_time - self.last_call_time
        
        if time_since_last_call < self.min_delay:
            delay = self.min_delay - time_since_last_call
            logger.debug(f"Rate limit: waiting for {delay:.2f} seconds")
            await asyncio.sleep(delay)
        
        self.last_call_time = asyncio.get_event_loop().time()

    async def _handle_api_error(self, error: Exception, retry_count: int) -> float:
        """Handle API errors and return wait time for retry"""
        wait_time = min(self.backoff_factor ** retry_count, self.max_backoff)
        
        if "rate limit" in str(error).lower():
            logger.warning(f"Rate limit hit, waiting {wait_time}s before retry")
            raise MistralRateLimitError(str(error))
        elif "403" in str(error):
            logger.error("Authentication error - invalid API key or quota exceeded")
            raise MistralAPIError("Authentication failed")
        
        return wait_time

    async def _generate_with_retry(
        self,
        messages: list[BaseMessage],
        response_model: Optional[Type[T]] = None,
        custom_parser: Optional[Callable[[str], T]] = None,
        error_feedback: str = None
    ) -> T | str:
        retry_count = 0
        last_error = None
        
        while retry_count < self.max_retries:
            try:
                logger.info(f"Attempt {retry_count + 1}/{self.max_retries}")
                
                current_messages = messages.copy()
                if error_feedback and retry_count > 0:
                    if isinstance(last_error, MistralParsingError):
                        # For parsing errors, add structured format reminder
                        current_messages.append(HumanMessage(content="Please ensure your response is in valid JSON format."))
                    elif isinstance(last_error, MistralValidationError):
                        # For validation errors, add the specific feedback
                        current_messages.append(HumanMessage(content=f"Previous error: {error_feedback}. Please try again."))
                
                await self._wait_for_rate_limit()
                try:
                    response = await self.model.ainvoke(current_messages)
                    content = response.content
                    logger.debug(f"Raw response: {content[:100]}...")
                except Exception as api_error:
                    wait_time = await self._handle_api_error(api_error, retry_count)
                    retry_count += 1
                    if retry_count < self.max_retries:
                        await asyncio.sleep(wait_time)
                        continue
                    raise

                # Si pas de parsing requis, retourner le contenu brut
                if not response_model and not custom_parser:
                    return content

                # Parser la réponse
                try:
                    if custom_parser:
                        return custom_parser(content)
                    
                    # Essayer de parser avec le modèle Pydantic
                    data = json.loads(content)
                    return response_model(**data)
                except json.JSONDecodeError as e:
                    last_error = MistralParsingError(f"Invalid JSON format: {str(e)}")
                    logger.error(f"JSON parsing error: {str(e)}")
                    raise last_error
                except Exception as e:
                    last_error = MistralValidationError(str(e))
                    logger.error(f"Validation error: {str(e)}")
                    raise last_error

            except (MistralParsingError, MistralValidationError) as e:
                logger.error(f"Error on attempt {retry_count + 1}/{self.max_retries}: {str(e)}")
                last_error = e
                retry_count += 1
                if retry_count < self.max_retries:
                    wait_time = min(self.backoff_factor ** retry_count, self.max_backoff)
                    logger.info(f"Waiting {wait_time} seconds before retry...")
                    await asyncio.sleep(wait_time)
                    continue
                
                logger.error(f"Failed after {self.max_retries} attempts. Last error: {str(last_error)}")
                raise Exception(f"Failed after {self.max_retries} attempts. Last error: {str(last_error)}")
    
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

    async def generate_text(self, messages: list[BaseMessage]) -> str:
        """
        Génère une réponse textuelle simple sans structure JSON.
        Utile pour la génération de texte narratif ou descriptif.
        
        Args:
            messages: Liste des messages pour le modèle
            
        Returns:
            str: Le texte généré
        """
        retry_count = 0
        last_error = None
        
        while retry_count < self.max_retries:
            try:
                logger.info(f"Attempt {retry_count + 1}/{self.max_retries}")
                
                await self._wait_for_rate_limit()
                response = await self.model.ainvoke(messages)
                return response.content.strip()
                
            except Exception as e:
                logger.error(f"Error on attempt {retry_count + 1}/{self.max_retries}: {str(e)}")
                retry_count += 1
                if retry_count < self.max_retries:
                    wait_time = 2 * retry_count
                    logger.info(f"Waiting {wait_time} seconds before retry...")
                    await asyncio.sleep(wait_time)
                    continue
                
                logger.error(f"Failed after {self.max_retries} attempts. Last error: {last_error or str(e)}")
                raise Exception(f"Failed after {self.max_retries} attempts. Last error: {last_error or str(e)}") 