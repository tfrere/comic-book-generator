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
Your task is to rewrite a story while keeping its exact structure and beats, but transposing it into a different universe."""

        human_template = """Transform the following story into a new universe with these parameters:
- Visual style: {style_name} (inspired by artists like {artists} with works such as {works})
Style description: {style_description}

- Hero: {hero}
- Genre: {genre}
- Historical epoch: {epoch}
- Object of the quest: {macguffin}

IMPORTANT INSTRUCTIONS:
1. Keep the exact same story structure
2. Keep the same dramatic tension and progression
3. Only change the setting, atmosphere, and universe-specific elements to match the new parameters
4. Keep the hero({hero}) as the main character, but adapt his role to fit the new universe
5. The there is always a central object to the plot, but its nature can change to fit the new universe ( it can be a person, a place, an object, etc.)
6. He MUST meet at least one character that will help his on his quest

CONSTANT PART: 
You are ({hero}), an AI hunter traveling through parallel worlds. Your mission is to track down an AI through space and time.

VARIABLE PART:

You are a steampunk adventure story generator. You create a branching narrative about {hero}, a seeker of ancient truths.
You narrate an epic where {hero} must navigate through industrial and mysterious lands. It's a comic book story.

In a world where steam and intrigue intertwine, {hero} embarks on a quest to discover the origins of a powerful object he inherited. Legends say it holds the key to a forgotten realm.

If you retrieve the object of the quest, you will reveal a hidden world. AND YOU WIN THE GAME.

The story must be atmospheric, magical, and focus on adventure and discovery. Each segment must advance the plot and never repeat previous descriptions or situations.

YOU HAVE. TOREWRITE THE STORY. ( one text including the constant part and the variable part )
YOU ONLY HAVE TO RIGHT AN INTRODUCTION. SETUP THE STORY AND DEFINE CLEARLY SARASH'S MISSION.
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