from core.constants import GameConfig
from typing import List
from api.models import StoryResponse

class GameState:
    def __init__(self):
        self.story_beat = GameConfig.STORY_BEAT_INTRO
        self.story_history: List[StoryResponse] = []
        self.current_time = GameConfig.STARTING_TIME
        self.current_location = GameConfig.STARTING_LOCATION
        # Universe information
        self.universe_style = None
        self.universe_genre = None
        self.universe_epoch = None
        self.universe_story = None
        
    def reset(self):
        """Reset game state while keeping universe information."""
        # Save universe info
        universe_style = self.universe_style
        universe_genre = self.universe_genre
        universe_epoch = self.universe_epoch
        universe_story = self.universe_story
        
        # Reset game state
        self.story_beat = GameConfig.STORY_BEAT_INTRO
        self.story_history = []
        self.current_time = GameConfig.STARTING_TIME
        self.current_location = GameConfig.STARTING_LOCATION
        
        # Restore universe info
        self.universe_style = universe_style
        self.universe_genre = universe_genre
        self.universe_epoch = universe_epoch
        self.universe_story = universe_story
        
    def set_universe(self, style: str, genre: str, epoch: str, base_story: str):
        """Configure the game universe."""
        self.universe_style = style
        self.universe_genre = genre
        self.universe_epoch = epoch
        self.universe_story = base_story
        
    def has_universe(self) -> bool:
        """Check if universe is configured."""
        return all([
            self.universe_style is not None,
            self.universe_genre is not None,
            self.universe_epoch is not None,
            self.universe_story is not None
        ])

    def format_history(self) -> str:
        """Format story history for the prompt.
        Returns only the last 4 segments of the story (or less if not available)."""
        if not self.story_history:
            return ""
            
        # Ne prendre que les 3 derniers segments
        last_segments = self.story_history[-4:] if len(self.story_history) > 4 else self.story_history
            
        segments = []
        for story_response in last_segments:
            # Commencer par le choix précédent s'il existe
            segment_parts = []
            if story_response.previous_choice and story_response.previous_choice != "none":
                segment_parts.append(f"[Previous choice: {story_response.previous_choice}]")
            
            # Ajouter le texte de l'histoire
            segment_parts.append(story_response.story_text)
            
            # Ajouter les choix disponibles s'ils existent
            if story_response.choices:
                choices_text = "\nAvailable choices were:"
                for choice in story_response.choices:
                    choices_text += f"\n- {choice.text}"
                segment_parts.append(choices_text)
            
            # Joindre toutes les parties avec des sauts de ligne
            segments.append("\n".join(segment_parts))
        
        # Ajouter une indication si on a tronqué l'historique
        if len(self.story_history) > 4:
            segments.insert(0, f"[...{len(self.story_history) - 4} earlier segments omitted...]")
        
        return "\n\n---\n\n".join(segments)

    def add_to_history(self, story_response: StoryResponse):
        """Add a story response to history."""
        self.story_history.append(story_response)
        self.current_time = story_response.time
        self.current_location = story_response.location 