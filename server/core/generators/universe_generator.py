import json
import random
from pathlib import Path
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate

from core.generators.base_generator import BaseGenerator
from core.prompts.system import STORY_RULES

class UniverseGenerator(BaseGenerator):
    """Générateur pour les univers alternatifs."""

    def _create_prompt(self) -> ChatPromptTemplate:
        system_template = """You are a creative writing assistant specialized in comic book universes.
Your task is to rewrite a story while keeping its exact structure and beats, but transposing it into a different universe."""

        human_template = """Transform the following story into a new universe with these parameters:
- Visual style: {style_name} (inspired by artists like {artists} with works such as {works})
Style description: {style_description}

- Genre: {genre}
- Historical epoch: {epoch}

IMPORTANT INSTRUCTIONS:
1. Keep the exact same story structure
2. Keep the same dramatic tension and progression
3. Only change the setting, atmosphere, and universe-specific elements to match the new parameters
4. Keep Sarah as the main character, but adapt her role to fit the new universe
5. The MacGuffin should still be central to the plot, but its nature can change to fit the new universe

Base story to transform:
{base_story}"""

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

    def _get_random_elements(self):
        """Récupère un style, un genre et une époque aléatoires."""
        data = self._load_universe_styles()
        
        if not all(key in data for key in ["styles", "genres", "epochs"]):
            raise ValueError("Missing required sections in universe_styles.json")
            
        style = random.choice(data["styles"])
        genre = random.choice(data["genres"])
        epoch = random.choice(data["epochs"])
        
        return style, genre, epoch

    def _custom_parser(self, response_content: str) -> str:
        """Parse la réponse. Dans ce cas, on retourne simplement le texte."""
        return response_content.strip()

    async def generate(self) -> str:
        """Génère un nouvel univers basé sur des éléments aléatoires."""
        style, genre, epoch = self._get_random_elements()
        base_story = STORY_RULES

        # Préparer les listes d'artistes et d'œuvres
        artists = ", ".join([ref["artist"] for ref in style["references"]])
        works = ", ".join([work for ref in style["references"] for work in ref["works"]])

        return await super().generate(
            style_name=style["name"],
            artists=artists,
            works=works,
            style_description=style["description"],
            genre=genre,
            epoch=epoch,
            base_story=base_story
        ) 