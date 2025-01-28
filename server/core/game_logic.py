from pydantic import BaseModel, Field
from typing import List, Tuple
from langchain.output_parsers import PydanticOutputParser, OutputFixingParser
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate
import os
import asyncio
from uuid import uuid4

from core.constants import GameConfig
from core.prompts.system import SARAH_DESCRIPTION
from core.prompts.cinematic import CINEMATIC_SYSTEM_PROMPT
from core.prompts.image_style import IMAGE_STYLE_PREFIX
from services.mistral_client import MistralClient
from api.models import StoryResponse, Choice
from core.generators.text_generator import TextGenerator
from core.generators.image_generator import ImageGenerator
from core.generators.metadata_generator import MetadataGenerator
from core.generators.universe_generator import UniverseGenerator

from core.constants import GameConfig

# Initialize generators with None - they will be set up when needed
universe_generator = None
image_generator = None
metadata_generator = None

def setup_generators(api_key: str, model_name: str = "mistral-small"):
    """Setup all generators with the provided API key."""
    global universe_generator, image_generator, metadata_generator
    
    mistral_client = MistralClient(api_key=api_key, model_name=model_name)
    universe_generator = UniverseGenerator(mistral_client)
    image_generator = ImageGenerator(mistral_client)
    metadata_generator = MetadataGenerator(mistral_client)

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
        # Ajout des informations d'univers
        self.universe_style = None
        self.universe_genre = None
        self.universe_epoch = None
        self.universe_story = None
        
    def reset(self):
        """Réinitialise l'état du jeu en gardant les informations de l'univers."""
        # Sauvegarder les informations de l'univers
        universe_style = self.universe_style
        universe_genre = self.universe_genre
        universe_epoch = self.universe_epoch
        universe_story = self.universe_story
        
        # Réinitialiser l'état du jeu
        self.story_beat = GameConfig.STORY_BEAT_INTRO
        self.radiation_level = 0
        self.story_history = []
        self.current_time = GameConfig.STARTING_TIME
        self.current_location = GameConfig.STARTING_LOCATION
        
        # Restaurer les informations de l'univers
        self.universe_style = universe_style
        self.universe_genre = universe_genre
        self.universe_epoch = universe_epoch
        self.universe_story = universe_story
        
    def set_universe(self, style: str, genre: str, epoch: str, base_story: str):
        """Configure l'univers du jeu."""
        self.universe_style = style
        self.universe_genre = genre
        self.universe_epoch = epoch
        self.universe_story = base_story
        
    def has_universe(self) -> bool:
        """Vérifie si l'univers est configuré."""
        return all([
            self.universe_style is not None,
            self.universe_genre is not None,
            self.universe_epoch is not None,
            self.universe_story is not None
        ])

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
    story_text: str = Field(description="The next segment of the story. No more than 15 words THIS IS MANDATORY. Never mention story beat directly. ")
    choices: List[str] = Field(description="Between one and four possible choices for the player. Each choice should be a clear path to follow in the story", min_items=1, max_items=4)
    is_victory: bool = Field(description="Whether this segment ends in Sarah's victory", default=False)
    is_death: bool = Field(description="Whether this segment ends in Sarah's death", default=False)
    radiation_increase: int = Field(description="How much radiation this segment adds (0-3)", ge=0, le=3, default=1)
    image_prompts: List[str] = Field(description="List of 1 to 4 comic panel descriptions that illustrate the key moments of the scene", min_items=1, max_items=4)
    time: str = Field(description="Current in-game time in 24h format (HH:MM). Time passes realistically based on actions.", default=GameConfig.STARTING_TIME)
    location: str = Field(description="Current location.", default=GameConfig.STARTING_LOCATION)

# Story generator
class StoryGenerator:
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            print("Creating new StoryGenerator instance")
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, api_key: str, model_name: str = "mistral-small"):
        if not self._initialized:
            print("Initializing StoryGenerator singleton")
            self.api_key = api_key
            self.model_name = model_name
            self.mistral_client = MistralClient(api_key=api_key, model_name=model_name)
            self.image_generator = ImageGenerator(self.mistral_client)
            self.metadata_generator = MetadataGenerator(self.mistral_client)
            self.text_generators = {}  # Un TextGenerator par session
            self._initialized = True

    def create_text_generator(self, session_id: str, style: str, genre: str, epoch: str, base_story: str):
        """Crée un nouveau TextGenerator adapté à l'univers spécifié pour une session donnée."""
        print(f"Creating TextGenerator for session {session_id} in StoryGenerator singleton")
        self.text_generators[session_id] = TextGenerator(
            self.mistral_client,
            universe_style=style,
            universe_genre=genre,
            universe_epoch=epoch,
            universe_story=base_story
        )
        print(f"Current TextGenerators in StoryGenerator: {list(self.text_generators.keys())}")

    def get_text_generator(self, session_id: str) -> TextGenerator:
        """Récupère le TextGenerator associé à une session."""
        print(f"Getting TextGenerator for session {session_id} from StoryGenerator singleton")
        print(f"Current TextGenerators in StoryGenerator: {list(self.text_generators.keys())}")
        if session_id not in self.text_generators:
            raise RuntimeError(f"No text generator found for session {session_id}. Generate a universe first.")
        return self.text_generators[session_id]

    def _format_story_history(self, game_state: GameState) -> str:
        """Formate l'historique de l'histoire pour le prompt."""
        if not game_state.story_history:
            return ""
            
        segments = []
        for entry in game_state.story_history:
            segments.append(entry['segment'])
        
        story_history = "\n\n---\n\n".join(segments)
        return story_history

    async def generate_story_segment(self, session_id: str, game_state: GameState, previous_choice: str) -> StoryResponse:
        """Génère un segment d'histoire complet en plusieurs étapes."""
        text_generator = self.get_text_generator(session_id)

        # 1. Générer le texte de l'histoire initial
        story_history = self._format_story_history(game_state)
        text_response = await text_generator.generate(
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
            text_response = await text_generator.generate_ending(
                story_beat=game_state.story_beat,
                ending_type=ending_type,
                current_scene=text_response.story_text,
                story_history=story_history
            )
            if is_radiation_death:
                metadata_response.is_death = True
            
            # Ne générer qu'une seule image pour la fin
            prompts_response = await self.image_generator.generate(text_response.story_text)
            if len(prompts_response.image_prompts) > 1:
                prompts_response.image_prompts = [prompts_response.image_prompts[0]]
        else:
            # Si ce n'est pas une fin, générer les prompts normalement
            prompts_response = await self.image_generator.generate(text_response.story_text)
        
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