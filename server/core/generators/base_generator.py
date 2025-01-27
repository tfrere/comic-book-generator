from typing import Any, TypeVar, Type
from pydantic import BaseModel
from langchain.prompts import ChatPromptTemplate
from services.mistral_client import MistralClient

T = TypeVar('T', bound=BaseModel)

class BaseGenerator:
    """Classe de base pour tous les générateurs de contenu."""
    
    def __init__(self, mistral_client: MistralClient):
        self.mistral_client = mistral_client
        self.prompt = self._create_prompt()
    
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
        return await self.mistral_client.generate(
            messages=messages,
            custom_parser=self._custom_parser
        ) 