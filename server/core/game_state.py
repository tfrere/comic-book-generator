from core.constants import GameConfig
from typing import List

class GameState:
    def __init__(self):
        self.story_beat = GameConfig.STORY_BEAT_INTRO
        self.story_history = []
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
        """Format story history for the prompt."""
        if not self.story_history:
            return ""
            
        segments = []
        for entry in self.story_history:
            segment = entry['segment']
            if entry['player_choice']:
                segment += f"\n[Choix du joueur: {entry['player_choice']}]"
            segments.append(segment)
        
        return "\n\n---\n\n".join(segments)

    def add_to_history(self, segment_text: str, choice_made: str, image_prompts: List[str], time: str, location: str):
        """Add a segment to history with essential information."""
        self.story_history.append({
            "segment": segment_text,
            "player_choice": choice_made,
            "time": time,
            "location": location,
            "image_prompts": image_prompts
        })
        self.current_time = time
        self.current_location = location 