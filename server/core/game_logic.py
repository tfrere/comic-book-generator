from pydantic import BaseModel, Field
from typing import List, Tuple
from langchain.output_parsers import PydanticOutputParser, OutputFixingParser
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate
import os
import asyncio

from core.constants import GameConfig
from core.prompts.system import SARAH_DESCRIPTION
from core.prompts.cinematic import CINEMATIC_SYSTEM_PROMPT
from core.prompts.image_style import IMAGE_STYLE_PREFIX
from services.mistral_client import MistralClient
from api.models import StoryTextResponse, StoryPromptsResponse, StoryMetadataResponse, StoryResponse, Choice
from core.story_generators import TextGenerator, ImagePromptsGenerator, MetadataGenerator

# Game constants
MAX_RADIATION = 4
STARTING_TIME = "18:00"  # Game starts at sunset
STARTING_LOCATION = "Outskirts of New Haven"

def enrich_prompt_with_sarah_description(prompt: str) -> str:
    """Add Sarah's visual description to prompts that mention her."""
    if "sarah" in prompt.lower() and SARAH_DESCRIPTION not in prompt:
        return f"{prompt} {SARAH_DESCRIPTION}"
    return prompt

def format_image_prompt(prompt: str, time: str, location: str) -> str:
    """Add style prefix and metadata to image prompt."""
    metadata = f"[{time} - {location}] "
    return f"{IMAGE_STYLE_PREFIX}{metadata}{prompt}"

class GameState:
    def __init__(self):
        self.story_beat = GameConfig.STORY_BEAT_INTRO
        self.radiation_level = 0
        self.story_history = []
        self.current_time = GameConfig.STARTING_TIME
        self.current_location = GameConfig.STARTING_LOCATION
        
    def reset(self):
        self.story_beat = GameConfig.STORY_BEAT_INTRO
        self.radiation_level = 0
        self.story_history = []
        self.current_time = GameConfig.STARTING_TIME
        self.current_location = GameConfig.STARTING_LOCATION
        
    def add_to_history(self, segment_text: str, choice_made: str, image_prompts: List[str], time: str, location: str):
        self.story_history.append({
            "segment": segment_text,
            "choice": choice_made,
            "image_prompts": image_prompts,
            "time": time,
            "location": location
        })
        self.current_time = time
        self.current_location = location

# Story output structure
class StoryLLMResponse(BaseModel):
    story_text: str = Field(description="The next segment of the story. No more than 12 words THIS IS MANDATORY. ")
    choices: List[str] = Field(description="One or two possible choices for the player. Each choice should be a clear path to folow in the story", min_items=1, max_items=2)
    is_victory: bool = Field(description="Whether this segment ends in Sarah's victory", default=False)
    is_death: bool = Field(description="Whether this segment ends in Sarah's death", default=False)
    radiation_increase: int = Field(description="How much radiation this segment adds (0-3)", ge=0, le=3, default=1)
    image_prompts: List[str] = Field(description="List of 1 to 4 comic panel descriptions that illustrate the key moments of the scene", min_items=1, max_items=4)
    time: str = Field(description="Current in-game time in 24h format (HH:MM). Time passes realistically based on actions.", default=STARTING_TIME)
    location: str = Field(description="Current location, using bold for proper nouns (e.g., 'Inside Vault 15', 'Streets of New Haven').", default=STARTING_LOCATION)

# Story generator
class StoryGenerator:
    def __init__(self, api_key: str, model_name: str = "mistral-small"):
        self.mistral_client = MistralClient(api_key=api_key, model_name=model_name)
        self.text_generator = TextGenerator(self.mistral_client)
        self.prompts_generator = ImagePromptsGenerator(self.mistral_client)
        self.metadata_generator = MetadataGenerator(self.mistral_client)

    def _format_story_history(self, game_state: GameState) -> str:
        """Formate l'historique de l'histoire pour le prompt."""
        if not game_state.story_history:
            return ""
            
        segments = []
        for entry in game_state.story_history:
            segments.append(entry['segment'])
        
        story_history = "\n\n---\n\n".join(segments)
        return story_history

    async def generate_story_segment(self, game_state: GameState, previous_choice: str) -> StoryResponse:
        """Génère un segment d'histoire complet en plusieurs étapes."""
        # 1. Générer le texte de l'histoire initial
        story_history = self._format_story_history(game_state)
        text_response = await self.text_generator.generate(
            story_beat=game_state.story_beat,
            radiation_level=game_state.radiation_level,
            current_time=game_state.current_time,
            current_location=game_state.current_location,
            previous_choice=previous_choice,
            story_history=story_history
        )
        
        # 2. Générer les métadonnées
        metadata_response = await self.metadata_generator.generate(
            story_text=text_response.story_text,
            current_time=game_state.current_time,
            current_location=game_state.current_location,
            story_beat=game_state.story_beat
        )
        
        # 3. Vérifier si c'est une fin (mort ou victoire)
        is_radiation_death = game_state.radiation_level + metadata_response.radiation_increase >= GameConfig.MAX_RADIATION
        is_ending = is_radiation_death or metadata_response.is_death or metadata_response.is_victory
        
        if is_ending:
            # Regénérer le texte avec le contexte de fin
            ending_type = "victory" if metadata_response.is_victory else "death"
            text_response = await self.text_generator.generate_ending(
                story_beat=game_state.story_beat,
                ending_type=ending_type,
                current_scene=text_response.story_text,
                story_history=story_history
            )
            if is_radiation_death:
                metadata_response.is_death = True
            
            # Ne générer qu'une seule image pour la fin
            prompts_response = await self.prompts_generator.generate(text_response.story_text)
            if len(prompts_response.image_prompts) > 1:
                prompts_response.image_prompts = [prompts_response.image_prompts[0]]
        else:
            # Si ce n'est pas une fin, générer les prompts normalement
            prompts_response = await self.prompts_generator.generate(text_response.story_text)
        
        # 4. Créer la réponse finale
        choices = [] if is_ending else [
            Choice(id=i, text=choice_text)
            for i, choice_text in enumerate(metadata_response.choices, 1)
        ]
        
        response = StoryResponse(
            story_text=text_response.story_text,
            choices=choices,
            is_victory=metadata_response.is_victory,
            is_death=metadata_response.is_death,
            radiation_level=game_state.radiation_level,
            radiation_increase=metadata_response.radiation_increase,
            time=metadata_response.time,
            location=metadata_response.location,
            raw_choices=metadata_response.choices,
            image_prompts=[format_image_prompt(prompt, metadata_response.time, metadata_response.location) 
                          for prompt in prompts_response.image_prompts],
            is_first_step=(game_state.story_beat == GameConfig.STORY_BEAT_INTRO)
        )
        
        return response

    async def transform_story_to_art_prompt(self, story_text: str) -> str:
        return await self.mistral_client.transform_prompt(story_text, CINEMATIC_SYSTEM_PROMPT)

    def process_radiation_death(self, segment: StoryLLMResponse) -> StoryLLMResponse:
        segment.is_death = True
        segment.story_text += "\n\nThe end... ?"
        return segment 