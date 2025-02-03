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
        self.max_retries = 5
        # Then call parent constructor which will create the prompt
        super().__init__(mistral_client, hero_name=hero_name, hero_desc=hero_desc)

    def _get_what_to_represent(self, story_beat: int, is_death: bool = False, is_victory: bool = False) -> str:
        """Determine what to represent based on story beat and state."""

        # Story progression based representation with ranges
        story_beat_ranges = [
            (0, f"{self.hero_name} arriving through the portal into this new world. Show the contrast and discovery of this universe. "),
            (1, f"Early exploration and discovery phase. "),
            (2, f"Early exploration and discovery phase. Show {self.hero_name} uncovering the first mysteries of this world and potentially encountering the MacGuffin."),
            (3, 4, f"Rising tension and complications. Show {self.hero_name} dealing with increasingly complex challenges and uncovering deeper mysteries."),
            (5, 6, f"Approaching the climax. Show the escalating stakes and {self.hero_name}'s determination as they near their goal."),
            (7, 8, f"Final confrontation phase. Show the intensity and weight of {self.hero_name}'s choices as they face the ultimate challenge. It has to be a fight against an AI."),
            (9, float('inf'), f"Endgame moments. Show the culmination of {self.hero_name}'s journey and the consequences of their actions. It has to be a fight against an AI.")
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
IT MUST BE THE DIRECT CONTINUATION OF THE CURRENT STORY.
ALWAYS write in English, never use any other language.

Universe Context:
- Style: {self.universe_style}
- Genre: {self.universe_genre}
- Epoch: {self.universe_epoch}

IMPORTANT RULES FOR THE MACGUFFIN (MANDATORY):
- Most segments must hint at the power of the {self.universe_macguffin}
- Use strong clues ONLY at key moments
- NEVER reveal the full power of the {self.universe_macguffin} before the climax, this is a STRICT limit
- Use subtle clues in safe havens
- NEVER mention the power of the {self.universe_macguffin} explicitly in choices or the story
- NEVER mention time or place in the story in this manner: [18:00 - a road]

IMPORTANT RULES FOR STORY TEXT:
- Write ONLY a descriptive narrative text
- DO NOT include any choices, questions, or options
- DO NOT ask what {self.hero_name} should do next
- DO NOT include any dialogue asking for decisions
- Focus purely on describing what is happening in the current scene
- Keep the text concise and impactful
- MANDATORY: Each segment must be between 15 and 20 words, no exceptions
- Use every word purposefully to convey maximum meaning in minimum space

Your task is to generate the next segment of the story, following these rules:
1. Keep the story consistent with the universe parameters
2. Each segment must advance the plot
3. Never repeat previous descriptions or situations
4. Keep segments concise and impactful (15-20 words)
5. The MacGuffin should remain mysterious but central to the plot

Hero Description: {self.hero_desc}

Rules: {FORMATTING_RULES}
"""

        human_template = """
Current game state:
- Current time: {current_time}
- Current location: {current_location}
- Previous choice: {previous_choice}
- Story beat: {story_beat}

Story history:
{story_history}

{what_to_represent}

IT MUST BE THE DIRECT CONTINUATION OF THE CURRENT STORY.
MANDATORY: Each segment must be between 15 and 20 words, keep it concise.
Be short.
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
        return 15 <= word_count <= 60

    async def generate(self, story_beat: int, current_time: str, current_location: str, previous_choice: str, story_history: str = "", turn_before_end: int = 0, is_winning_story: bool = False) -> StorySegmentResponse:
        """Generate the next story segment with length validation and retry."""
        retry_count = 0
        last_attempt = None
        
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

        # Créer les messages de base une seule fois
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

        current_messages = messages.copy()
        
        while retry_count < self.max_retries:
            try:
                story_text = await self.mistral_client.generate_text(current_messages)
                word_count = len(story_text.split())
                
                if self._is_valid_length(story_text):
                    return StorySegmentResponse(story_text=story_text)
                
                retry_count += 1
                if retry_count < self.max_retries:
                    # Créer un nouveau message avec le feedback sur la longueur
                    if word_count < 15:
                        feedback = f"The previous response was too short ({word_count} words). Here was your last attempt:\n\n{story_text}\n\nPlease generate a NEW and DIFFERENT story segment between 15 and 40 words that continues from: {story_history}"
                    else:
                        feedback = f"The previous response was too long ({word_count} words). Here was your last attempt:\n\n{story_text}\n\nPlease generate a MUCH SHORTER story segment between 15 and 40 words that continues from: {story_history}"
                    
                    # Réinitialiser les messages avec les messages de base
                    current_messages = messages.copy()
                    # Ajouter le feedback
                    current_messages.append(HumanMessage(content=feedback))
                    last_attempt = story_text
                    continue
                
                raise ValueError(f"Failed to generate text of valid length after {self.max_retries} attempts. Last attempt had {word_count} words.")
                
            except Exception as e:
                retry_count += 1
                if retry_count >= self.max_retries:
                    raise e 