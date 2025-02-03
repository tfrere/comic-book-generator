import json
import random
from pathlib import Path
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate

from core.generators.base_generator import BaseGenerator
from services.mistral_client import MistralClient

class UniverseGenerator(BaseGenerator):
    """Générateur pour les univers alternatifs."""

    def __init__(self, mistral_client: MistralClient):
        self.styles_data = self._load_universe_styles()
        super().__init__(mistral_client, is_universe_generator=True)

    def _create_prompt(self) -> ChatPromptTemplate:

        system_template = """You are a creative writing assistant specialized in comic book universes.
"""

        human_template = """

- main character: {hero}
- Genre: {genre}
- Historical epoch: {epoch}

Describe the first segment of the story. in 30 words. Where is the main character, what is he doing? HE has to do something banal. You have to describe the first action.
"""

        return ChatPromptTemplate(
            messages=[
                SystemMessagePromptTemplate.from_template(system_template),
                HumanMessagePromptTemplate.from_template(human_template)
            ]
        )

    def _load_universe_styles(self):
        """Charge les styles, genres et époques depuis le fichier JSON."""
        try:
            current_dir = Path(__file__).parent.parent
            styles_path = current_dir / "styles" / "universe_styles.json"
            
            if not styles_path.exists():
                raise FileNotFoundError(f"Universe styles file not found at {styles_path}")
                
            with open(styles_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            raise ValueError(f"Failed to load universe styles: {str(e)}")

    def _get_random_artist(self, style):
        """Sélectionne un artiste aléatoire parmi les références du style."""
        if "references" not in style:
            return None
        reference = random.choice(style["references"])
        return reference["artist"]

    def _get_random_elements(self):
        """Get random elements from the universe styles."""
        # Get random style
        style = random.choice(self.styles_data["styles"])
        genre = random.choice(self.styles_data["genres"])
        epoch = random.choice(self.styles_data["epochs"])
        macguffin = random.choice(self.styles_data["macguffins"])
        hero_full = random.choice(self.styles_data["hero"])
        
        # Get artist and works
        artist_ref = random.choice(style["references"])
        artist = artist_ref["artist"]
        works = ", ".join(artist_ref["works"])
        
        # Split hero description properly
        hero_name = hero_full.split(',')[0].strip()
        hero_desc = hero_full.strip()

        return style, genre, epoch, macguffin, hero_name, hero_desc, artist, works

    def _custom_parser(self, response_content: str) -> str:
        """Parse la réponse. Dans ce cas, on retourne simplement le texte."""
        return response_content.strip()

    async def generate(self):
        """Generate a new universe."""
        style, genre, epoch, macguffin, hero_name, hero_desc, artist, works = self._get_random_elements()
        
        # Create the universe prompt
        response = await super().generate(
            style_name=style["name"],
            style_description=style["description"],
            artists=artist,
            works=works,
            genre=genre,
            epoch=epoch,
            macguffin=macguffin,
            hero=hero_name
        )
        
        return response, style, genre, epoch, macguffin, hero_name, hero_desc 