from typing import List
from api.models import StoryResponse, Choice
from services.mistral_client import MistralClient
from core.state.game_state import GameState
from core.generators.text_generator import TextGenerator
from core.generators.image_generator import ImageGenerator
from core.generators.metadata_generator import MetadataGenerator
from core.constants import GameConfig

class StoryOrchestrator:
    """Coordonne les différents générateurs pour produire l'histoire."""
    
    def __init__(self, mistral_client: MistralClient):
        self.text_generator = TextGenerator(mistral_client)
        self.image_generator = ImageGenerator(mistral_client)
        self.metadata_generator = MetadataGenerator(mistral_client)
        
    def _is_ending(self, game_state: GameState, metadata_response) -> bool:
        """Détermine si c'est une fin de jeu."""
        return (
            game_state.is_radiation_death(metadata_response.radiation_increase) or
            metadata_response.is_death or
            metadata_response.is_victory
        )
        
    async def _handle_ending(self, game_state: GameState, text_response, metadata_response) -> StoryResponse:
        """Gère la génération d'une fin."""
        # Déterminer le type de fin
        ending_type = "victory" if metadata_response.is_victory else "death"
        
        # Regénérer le texte avec le contexte de fin
        text_response = await self.text_generator.generate_ending(
            ending_type=ending_type,
            current_scene=text_response.story_text,
            story_history=game_state.format_history()
        )
        
        # Ne générer qu'une seule image pour la fin
        prompts_response = await self.image_generator.generate(text_response.story_text)
        if len(prompts_response.image_prompts) > 1:
            prompts_response.image_prompts = [prompts_response.image_prompts[0]]
            
        return self._build_response(
            game_state=game_state,
            text_response=text_response,
            metadata_response=metadata_response,
            image_prompts=prompts_response.image_prompts,
            is_ending=True
        )
        
    def _build_response(self, game_state: GameState, text_response, metadata_response, image_prompts: List[str], is_ending: bool = False) -> StoryResponse:
        """Construit la réponse finale."""
        choices = [] if is_ending else [
            Choice(id=i, text=choice_text)
            for i, choice_text in enumerate(metadata_response.choices, 1)
        ]
        
        # Formater les prompts d'images avec le style et les métadonnées
        formatted_prompts = [
            self.image_generator.format_prompt(
                prompt=prompt,
                time=metadata_response.time,
                location=metadata_response.location
            )
            for prompt in image_prompts
        ]
        
        return StoryResponse(
            story_text=text_response.story_text,
            choices=choices,
            is_victory=metadata_response.is_victory,
            is_death=metadata_response.is_death,
            radiation_level=game_state.radiation_level,
            radiation_increase=metadata_response.radiation_increase,
            time=metadata_response.time,
            location=metadata_response.location,
            raw_choices=metadata_response.choices,
            image_prompts=formatted_prompts,
            is_first_step=(game_state.story_beat == GameConfig.STORY_BEAT_INTRO)
        )
        
    async def generate_story_segment(self, game_state: GameState, previous_choice: str) -> StoryResponse:
        """Génère un segment complet de l'histoire."""
        # 1. Générer le texte de l'histoire
        text_response = await self.text_generator.generate(
            story_beat=game_state.story_beat,
            radiation_level=game_state.radiation_level,
            current_time=game_state.current_time,
            current_location=game_state.current_location,
            previous_choice=previous_choice,
            story_history=game_state.format_history()
        )
        
        # 2. Générer les métadonnées
        metadata_response = await self.metadata_generator.generate(
            story_text=text_response.story_text,
            current_time=game_state.current_time,
            current_location=game_state.current_location,
            story_beat=game_state.story_beat
        )
        
        # 3. Vérifier si c'est une fin
        if self._is_ending(game_state, metadata_response):
            return await self._handle_ending(game_state, text_response, metadata_response)
            
        # 4. Générer les prompts d'images
        prompts_response = await self.image_generator.generate(text_response.story_text)
        
        # 5. Construire et retourner la réponse
        return self._build_response(
            game_state=game_state,
            text_response=text_response,
            metadata_response=metadata_response,
            image_prompts=prompts_response.image_prompts
        ) 