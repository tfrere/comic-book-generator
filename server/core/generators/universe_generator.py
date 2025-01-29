import json
import random
from pathlib import Path
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate

from core.generators.base_generator import BaseGenerator

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
- Object of the quest: {macguffin}

IMPORTANT INSTRUCTIONS:
1. Keep the exact same story structure
2. Keep the same dramatic tension and progression
3. Only change the setting, atmosphere, and universe-specific elements to match the new parameters
4. Keep Sarah as the main character, but adapt her role to fit the new universe
5. The there is always a central object to the plot, but its nature can change to fit the new universe ( it can be a person, a place, an object, etc.)

CONSTANT PART: 
You are Sarah, an AI hunter traveling through parallel worlds. Your mission is to track down an AI that moves from world to world to avoid destruction.
The story begins with Sarah arriving in a new world by the portal.

VARIABLE PART:

You are a steampunk adventure story generator. You create a branching narrative about Sarah, a seeker of ancient truths.
You narrate an epic where Sarah must navigate through industrial and mysterious lands. It's a comic book story.

In a world where steam and intrigue intertwine, Sarah embarks on a quest to discover the origins of a powerful MacGuffin she inherited. Legends say it holds the key to a forgotten realm.

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

    def _get_random_elements(self):
        """Récupère un style, un genre, une époque et un MacGuffin aléatoires."""
        data = self._load_universe_styles()
        
        if not all(key in data for key in ["styles", "genres", "epochs", "macguffins"]):
            raise ValueError("Missing required sections in universe_styles.json")
            
        style = random.choice(data["styles"])
        genre = random.choice(data["genres"])
        epoch = random.choice(data["epochs"])
        macguffin = random.choice(data["macguffins"])
        
        return style, genre, epoch, macguffin

    def _custom_parser(self, response_content: str) -> str:
        """Parse la réponse. Dans ce cas, on retourne simplement le texte."""
        return response_content.strip()

    async def generate(self) -> str:
        """Génère un nouvel univers basé sur des éléments aléatoires."""
        style, genre, epoch, macguffin = self._get_random_elements()

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
            macguffin=macguffin
        ) 