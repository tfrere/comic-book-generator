from pydantic import BaseModel, Field
from typing import List, Tuple
from langchain.output_parsers import PydanticOutputParser, OutputFixingParser
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate
import os
import asyncio

from core.prompts.system import SARAH_DESCRIPTION
from core.prompts.cinematic import CINEMATIC_SYSTEM_PROMPT
from core.prompts.image_style import IMAGE_STYLE_PREFIX
from services.mistral_client import MistralClient
from api.models import StoryTextResponse, StoryPromptsResponse, StoryMetadataResponse
from core.story_generators import TextGenerator, ImagePromptsGenerator, MetadataGenerator

# Game constants
MAX_RADIATION = 10
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
        self.story_beat = 0
        self.radiation_level = 0
        self.story_history = []
        self.current_time = STARTING_TIME
        self.current_location = STARTING_LOCATION
        
    def reset(self):
        self.story_beat = 0
        self.radiation_level = 0
        self.story_history = []
        self.current_time = STARTING_TIME
        self.current_location = STARTING_LOCATION
        
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
    story_text: str = Field(description="The next segment of the story. No more than 12 words THIS IS MANDATORY. Use bold formatting (like this) ONLY for proper nouns (like Sarah, hospital) and important locations.")
    choices: List[str] = Field(description="Exactly two possible choices for the player", min_items=2, max_items=2)
    is_victory: bool = Field(description="Whether this segment ends in Sarah's victory", default=False)
    radiation_increase: int = Field(description="How much radiation this segment adds (0-3)", ge=0, le=3, default=1)
    image_prompts: List[str] = Field(description="List of 1 to 4 comic panel descriptions that illustrate the key moments of the scene", min_items=1, max_items=4)
    is_last_step: bool = Field(description="Whether this is the last step (victory or death)", default=False)
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

    async def generate_story_segment(self, game_state: GameState, previous_choice: str) -> StoryLLMResponse:
        """Génère un segment d'histoire complet en plusieurs étapes."""
        # 1. Générer le texte de l'histoire
        story_history = self._format_story_history(game_state)
        text_response = await self.text_generator.generate(
            story_beat=game_state.story_beat,
            radiation_level=game_state.radiation_level,
            current_time=game_state.current_time,
            current_location=game_state.current_location,
            previous_choice=previous_choice,
            story_history=story_history
        )
        
        # 2. Générer les prompts d'images et les métadonnées en parallèle
        prompts_task = self.prompts_generator.generate(text_response.story_text)
        metadata_task = self.metadata_generator.generate(
            story_text=text_response.story_text,
            current_time=game_state.current_time,
            current_location=game_state.current_location,
            story_beat=game_state.story_beat
        )
        
        prompts_response, metadata_response = await asyncio.gather(prompts_task, metadata_task)
        
        # 3. Combiner les résultats
        response = StoryLLMResponse(
            story_text=text_response.story_text,
            choices=metadata_response.choices,
            is_victory=metadata_response.is_victory,
            radiation_increase=metadata_response.radiation_increase,
            image_prompts=[format_image_prompt(prompt, metadata_response.time, metadata_response.location) 
                          for prompt in prompts_response.image_prompts],
            is_last_step=metadata_response.is_last_step,
            time=metadata_response.time,
            location=metadata_response.location
        )
        
        # 4. Post-processing
        if game_state.story_beat == 0:
            response.radiation_increase = 0
            response.is_last_step = False
            
        # Vérifier la mort par radiation
        is_death = game_state.radiation_level + response.radiation_increase >= MAX_RADIATION
        if is_death or response.is_victory:
            response.is_last_step = True
            if len(response.image_prompts) > 1:
                response.image_prompts = [response.image_prompts[0]]
                
        return response

    async def transform_story_to_art_prompt(self, story_text: str) -> str:
        return await self.mistral_client.transform_prompt(story_text, CINEMATIC_SYSTEM_PROMPT)

    def process_radiation_death(self, segment: StoryLLMResponse) -> StoryLLMResponse:
        segment.is_death = True
        segment.story_text += "\n\nThe end... ?"
        return segment 