from typing import List, Dict
from core.constants import GameConfig
from services.mistral_client import MistralClient
from api.models import StoryResponse, Choice
from core.generators.story_segment_generator import StorySegmentGenerator
from core.generators.image_prompt_generator import ImagePromptGenerator
from core.generators.metadata_generator import MetadataGenerator
from core.game_state import GameState
import random
from core.constants import GameConfig

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
            self.turn_before_end = random.randint(GameConfig.MIN_SEGMENTS_BEFORE_END, GameConfig.MAX_SEGMENTS_BEFORE_END)
            self.is_winning_story = random.random() < GameConfig.WINNING_STORY_CHANCE
            self.mistral_client = MistralClient(api_key=api_key, model_name=model_name)
            self.image_prompt_generator = None  # Will be initialized with the first universe style
            self.metadata_generator = MetadataGenerator(self.mistral_client)
            self.segment_generators: Dict[str, StorySegmentGenerator] = {}
            self._initialized = True

    def create_segment_generator(self, session_id: str, style: dict, genre: str, epoch: str, base_story: str, macguffin: str):
        """Create a new StorySegmentGenerator adapted to the specified universe for a given session."""
        # print(f"Creating StorySegmentGenerator for session {session_id} in StoryGenerator singleton")
        
        try:
            # Get the first artist from the style references
            artist_style = f"{style['references'][0]['artist']} comic panel"
            
            # Initialize image prompt generator if not already done
            if self.image_prompt_generator is None:
                self.image_prompt_generator = ImagePromptGenerator(self.mistral_client, artist_style=artist_style)
            
            self.segment_generators[session_id] = StorySegmentGenerator(
                self.mistral_client,
                universe_style=style["name"],
                universe_genre=genre,
                universe_epoch=epoch,
                universe_story=base_story,
                universe_macguffin=macguffin
            )
            # print(f"Current StorySegmentGenerators in StoryGenerator: {list(self.segment_generators.keys())}")
        except KeyError as e:
            print(f"Error accessing style data: {e}")
            print(f"Style object received: {style}")
            raise ValueError(f"Invalid style format: {str(e)}")
        except Exception as e:
            print(f"Unexpected error in create_segment_generator: {str(e)}")
            raise

    def get_segment_generator(self, session_id: str) -> StorySegmentGenerator:
        """Get the StorySegmentGenerator associated with a session."""
        # print(f"Getting StorySegmentGenerator for session {session_id} from StoryGenerator singleton")
        # print(f"Current StorySegmentGenerators in StoryGenerator: {list(self.segment_generators.keys())}")
        if session_id not in self.segment_generators:
            raise RuntimeError(f"No story segment generator found for session {session_id}. Generate a universe first.")
        return self.segment_generators[session_id]

    async def generate_story_segment(self, session_id: str, game_state: GameState, previous_choice: str) -> StoryResponse:
        """Generate a story segment."""
        segment_generator = self.get_segment_generator(session_id)
        story_history = game_state.format_history()
        
        # Generate story text first
        segment_response = await segment_generator.generate(
            story_beat=game_state.story_beat,
            current_time=game_state.current_time,
            current_location=game_state.current_location,
            previous_choice=previous_choice,
            story_history=story_history,
            turn_before_end=self.turn_before_end,
            is_winning_story=self.is_winning_story
        )

        # print(f"Generated story text: {segment_response}")
        
        # Then get metadata using the new story text
        metadata_response = await self.metadata_generator.generate(
            story_text=segment_response.story_text,
            current_time=game_state.current_time,
            current_location=game_state.current_location,
            story_beat=game_state.story_beat,
            turn_before_end=self.turn_before_end,
            is_winning_story=self.is_winning_story
        )
        # print(f"Generated metadata_response: {metadata_response}")
        
        # Generate image prompts
        prompts_response = await self.image_prompt_generator.generate(
            story_text=segment_response.story_text,
            time=metadata_response.time,
            location=metadata_response.location,
            is_death=metadata_response.is_death,
            is_victory=metadata_response.is_victory,
            turn_before_end=self.turn_before_end,
            is_winning_story=self.is_winning_story
        )
        # print(f"Generated image prompts: {prompts_response}")
        
        # Create choices
        choices = [
            Choice(id=i, text=choice_text)
            for i, choice_text in enumerate(metadata_response.choices, 1)
        ]
        
        response = StoryResponse(
            story_text=segment_response.story_text,
            choices=choices,
            time=metadata_response.time,
            location=metadata_response.location,
            raw_choices=metadata_response.choices,
            image_prompts=prompts_response.image_prompts,
            is_first_step=(game_state.story_beat == GameConfig.STORY_BEAT_INTRO),
            is_death=metadata_response.is_death,
            is_victory=metadata_response.is_victory
        )
        
        return response 