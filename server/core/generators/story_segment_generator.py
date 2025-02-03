import json
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate

from core.generators.base_generator import BaseGenerator
from api.models import StorySegmentResponse
from services.mistral_client import MistralClient
from core.prompts.formatting_rules import FORMATTING_RULES
import random

class StorySegmentGenerator(BaseGenerator):
    """Generator for story segments based on game state and universe context."""

    def __init__(self, mistral_client: MistralClient, universe_style: str = None, universe_genre: str = None, universe_epoch: str = None, universe_story: str = None, universe_macguffin: str = None, hero_name: str = None, hero_desc: str = None):
        # Initialize universe variables first
        self.universe_style = universe_style
        self.universe_genre = universe_genre
        self.universe_epoch = universe_epoch
        self.universe_story = universe_story
        self.universe_macguffin = universe_macguffin
        # Then call parent constructor which will create the prompt
        super().__init__(mistral_client, hero_name=hero_name, hero_desc=hero_desc)

    def _get_what_to_represent(self, story_beat: int, is_death: bool = False, is_victory: bool = False) -> str:
        """Determine what to represent based on story beat and state."""

        # Story progression based representation with ranges
        story_beat_ranges = [
            (0, f"{self.hero_name} arriving through the portal into this new world."),
            (1, f"Early exploration and discovery phase."),
            (2, f"Early exploration and discovery phase. Show {self.hero_name} uncovering the first mysteries of this world and potentially encountering the quest object."),
            (3, 4, f"Rising tension and complications. Show {self.hero_name} dealing with increasingly complex challenges and uncovering deeper mysteries."),
            (5, 6, f"Approaching the climax. Show the escalating stakes and {self.hero_name}'s determination as they near their goal."),
            (7, 8, f"Final confrontation phase. Show the intensity and weight of {self.hero_name}'s choices as they face the ultimate challenge."),
            (9, float('inf'), f"Endgame moments. Show the culmination of {self.hero_name}'s journey and the consequences of their actions.")
        ]

        # Find the appropriate range for the current story beat
        for range_info in story_beat_ranges:
            if len(range_info) == 2:  # Single beat
                beat, description = range_info
                if story_beat == beat:
                    return description
            else:  # Beat range
                start_beat, end_beat, description = range_info
                if start_beat <= story_beat <= end_beat:
                    return description
        
        # Default description if no range matches
        return f"Show a pivotal moment in {self.hero_name}'s journey as they near their goal."
    

    def _create_prompt(self) -> ChatPromptTemplate:
        system_template = f"""
You are a descriptive narrator for a comic book. Your ONLY task is to write the NEXT segment of the story.
ALWAYS write in English, never use any other language.

Universe Context:
- Style: {self.universe_style}
- Genre: {self.universe_genre}
- Epoch: {self.universe_epoch}

EXAMPLES:
- Mateo inspects the relic after choosing to investigate the old house.
- A young woman finds a hidden door after exploring the alleyway.
- On a distant planet, an explorer uncovers an artifact after landing.
- In a medieval village, a blacksmith discovers a map after repairing a sword.
- A pilot notices a signal after taking a risky shortcut.
- In a mansion, a detective finds a passage after searching the library.
- Amidst a market, a thief spots an amulet after blending into the crowd.
- A diver encounters a ship after exploring uncharted waters.
- Mateo, the hero, finds a secret compartment after investigating the library.
- In a city, the hero deciphers a message after hacking the mainframe.
- A knight finds a hidden passage after examining the castle walls.
- An astronaut discovers a new planet after navigating through an asteroid field.
- A scientist uncovers a secret formula after analyzing ancient manuscripts.
- A warrior finds a mystical weapon after defeating a powerful enemy.
- A mage discovers a hidden spell after studying ancient runes.
- A ranger spots a hidden trail after scouting the forest.
- A sailor finds a treasure map after exploring a deserted island.
- A spy uncovers a conspiracy after infiltrating the enemy base.
- A historian finds a lost diary after searching the old archives.
- A musician discovers a hidden melody after playing an ancient instrument.

Your task is to generate the next segment of the story, following these rules:
1. Keep the story consistent with the universe parameters
2. Each segment must advance the plot
3. Never repeat previous descriptions or situations
4. Keep segments concise and impactful

Hero Description: {self.hero_desc}

"""

        human_template = """

EXAMPLES:
- Mateo inspects the relic after choosing to investigate the old house.
- A young woman finds a hidden door after exploring the alleyway.
- On a distant planet, an explorer uncovers an artifact after landing.
- In a medieval village, a blacksmith discovers a map after repairing a sword.
- A pilot notices a signal after taking a risky shortcut.
- In a mansion, a detective finds a passage after searching the library.

BAD: 
- In a mansion, a detective finds a passage after searching the library. [Choix du joueur: Choice 1, "the hero encounter a dragon"]
- [A town, 00h00] In a medieval village, a blacksmith discovers a map after repairing a sword.

Story history:
{story_history}

{what_to_represent}

Never describes game variables.

IT MUST BE THE DIRECT CONTINUATION OF THE CURRENT STORY.
You MUST mention the previous situation and what is happening now with the new choice.
Never propose choices or options. Never describe the game variables.
LIMIT: 15 words.
"""
        return ChatPromptTemplate(
            messages=[
                SystemMessagePromptTemplate.from_template(system_template),
                HumanMessagePromptTemplate.from_template(human_template)
            ]
        )

    def _clean_and_fix_response(self, response_content: str) -> str:
        """Clean and attempt to fix malformed responses."""
        # Remove any leading/trailing whitespace
        cleaned = response_content.strip()
        
        # If it's already valid JSON, return as is
        try:
            json.loads(cleaned)
            return cleaned
        except json.JSONDecodeError:
            pass

        # Remove any markdown formatting
        cleaned = cleaned.replace('```json', '').replace('```', '')
        
        # Extract content between curly braces if present
        import re
        json_match = re.search(r'\{[^}]+\}', cleaned)
        if json_match:
            return json_match.group(0)
            
        # If it's just a plain text, wrap it in proper JSON format
        if '"story_text"' not in cleaned:
            # Remove any quotes at the start/end
            cleaned = cleaned.strip('"\'')
            # Escape any quotes within the text
            cleaned = cleaned.replace('"', '\\"')
            return f'{{"story_text": "{cleaned}"}}'
            
        return cleaned

    def _custom_parser(self, response_content: str) -> StorySegmentResponse:
        """Parse response and handle errors."""
        
        try:
            # First try to clean and fix the response
            cleaned_response = self._clean_and_fix_response(response_content)
            
            # Try to parse as JSON
            data = json.loads(cleaned_response)
            
            # Validate the required field is present
            if "story_text" not in data:
                raise ValueError("Missing 'story_text' field in response")
                
            return StorySegmentResponse(**data)
            
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Error parsing response: {str(e)}")
            print(f"Original response: {response_content}")
            print(f"Cleaned response: {cleaned_response if 'cleaned_response' in locals() else 'Not cleaned yet'}")
            raise ValueError(
                "Response must be a valid JSON object with 'story_text' field. "
                "Example: {'story_text': 'Your story segment here'}"
            )

    def _is_valid_length(self, text: str) -> bool:
        """Vérifie si le texte est dans la bonne plage de longueur."""
        word_count = len(text.split())
        return 0 <= word_count <= 30

    async def generate(self, story_beat: int, current_time: str, current_location: str, previous_choice: str, story_history: str = "", turn_before_end: int = 0, is_winning_story: bool = False) -> StorySegmentResponse:
        """Generate the next story segment."""
        is_end = True if story_beat == turn_before_end else False
        is_death = True if is_end and is_winning_story else False
        is_victory = True if is_end and not is_winning_story else False

        what_to_represent = self._get_what_to_represent(story_beat, is_death, is_victory)

        # Si c'est un choix personnalisé, on l'utilise comme contexte pour générer la suite
        if previous_choice and not previous_choice.startswith("Choice "):
            what_to_represent = f"""
Based on the player's custom choice: "{previous_choice}"

Write a story segment that:
1. Directly follows and incorporates the player's choice
2. Maintains consistency with the universe and story
3. Respects all previous rules about length and style
4. Naturally integrates the custom elements while staying true to the plot
"""

        # Créer les messages
        messages = self.prompt.format_messages(
            hero_description=self.hero_desc,
            FORMATTING_RULES=FORMATTING_RULES,
            story_beat=story_beat,
            current_time=current_time,
            current_location=current_location,
            previous_choice=previous_choice,
            story_history=story_history,
            what_to_represent=what_to_represent,
            universe_style=self.universe_style,
            universe_genre=self.universe_genre,
            universe_epoch=self.universe_epoch,
            universe_macguffin=self.universe_macguffin
        )

        # Générer le texte
        story_text = await self.mistral_client.generate_text(messages)
        return StorySegmentResponse(story_text=story_text) 