from typing import List, Dict, Any
from core.constants import GameConfig

class GameState:
    """Gère l'état du jeu pour une partie."""
    
    def __init__(self):
        self.story_beat = GameConfig.STORY_BEAT_INTRO
        self.radiation_level = 0
        self.story_history = []
        self.current_time = GameConfig.STARTING_TIME
        self.current_location = GameConfig.STARTING_LOCATION
        
    def reset(self):
        """Réinitialise l'état du jeu."""
        self.__init__()
        
    def add_to_history(self, segment_text: str, choice_made: str, image_prompts: List[str], time: str, location: str):
        """Ajoute un segment à l'historique et met à jour l'état."""
        self.story_history.append({
            "segment": segment_text,
            "choice": choice_made,
            "image_prompts": image_prompts,
            "time": time,
            "location": location
        })
        self.current_time = time
        self.current_location = location
        
    def format_history(self) -> str:
        """Formate l'historique pour le prompt."""
        if not self.story_history:
            return ""
            
        segments = []
        for entry in self.story_history:
            segments.append(entry['segment'])
        
        return "\n\n---\n\n".join(segments)
        
    def is_radiation_death(self, additional_radiation: int) -> bool:
        """Vérifie si le niveau de radiation serait fatal."""
        return self.radiation_level + additional_radiation >= GameConfig.MAX_RADIATION
        
    def add_radiation(self, amount: int):
        """Ajoute de la radiation au compteur."""
        self.radiation_level += amount 