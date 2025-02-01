from typing import Any, TypeVar, Type
from pydantic import BaseModel
from langchain.prompts import ChatPromptTemplate
from services.mistral_client import MistralClient

T = TypeVar('T', bound=BaseModel)

class BaseGenerator:
    """Classe de base pour tous les générateurs de contenu."""
    
    debug_mode = False  # Class attribute for debug mode
    
    def __init__(self, mistral_client: MistralClient, hero_name: str = None, hero_desc: str = None, is_universe_generator: bool = False):
        self.mistral_client = mistral_client
        if not is_universe_generator:
            if hero_name is None or hero_desc is None:
                raise ValueError("hero_name and hero_desc must be provided for non-universe generators")
            self.hero_name = hero_name
            self.hero_desc = hero_desc
        self.prompt = self._create_prompt()
    
    @classmethod
    def set_debug_mode(cls, enabled: bool):
        """Enable or disable debug mode for all generators."""
        cls.debug_mode = enabled
    
    def _print_debug_info(self, messages):
        """Print debug information about the prompts."""
        if self.debug_mode:
            print("\n=== DEBUG: PROMPT INFORMATION ===")
            for i, message in enumerate(messages):
                print(f"\n--- Message {i + 1} ---")
                print(f"Role: {message.type}")
                print(f"Content:\n{message.content}\n")
            print("================================\n")
    
    def _create_prompt(self) -> ChatPromptTemplate:
        """Crée le template de prompt pour ce générateur.
        À implémenter dans les classes enfants."""
        raise NotImplementedError
        
    def _custom_parser(self, response_content: str) -> T:
        """Parse la réponse du modèle.
        À implémenter dans les classes enfants."""
        raise NotImplementedError
        
    async def generate(self, **kwargs) -> T:
        """Génère du contenu en utilisant le modèle.
        
        Args:
            **kwargs: Arguments spécifiques au générateur pour formater le prompt
            
        Returns:
            Le contenu généré et parsé selon le type spécifique du générateur
        """
        messages = self.prompt.format_messages(**kwargs)
        self._print_debug_info(messages)  # Print debug info if debug mode is enabled
        return await self.mistral_client.generate(
            messages=messages,
            custom_parser=self._custom_parser
        ) 