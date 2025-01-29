import json
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate

from core.generators.base_generator import BaseGenerator
from api.models import StorySegmentResponse
from services.mistral_client import MistralClient
from core.prompts.hero import HERO_DESCRIPTION
from core.prompts.formatting_rules import FORMATTING_RULES
from core.prompts.story_beats import STORY_BEATS
import random

class StorySegmentGenerator(BaseGenerator):
    """Generator for story segments based on game state and universe context."""

    def __init__(self, mistral_client: MistralClient, universe_style: str = None, universe_genre: str = None, universe_epoch: str = None, universe_story: str = None, universe_macguffin: str = None):
        super().__init__(mistral_client)
        self.universe_style = universe_style
        self.universe_genre = universe_genre
        self.universe_epoch = universe_epoch
        self.universe_story = universe_story
        self.universe_macguffin = universe_macguffin

    def _create_prompt(self) -> ChatPromptTemplate:
        system_template = """
You are a descriptive narrator for a comic book. Your ONLY task is to write the next segment of the story.
ALWAYS write in English, never use any other language.
IMPORTANT: Your response MUST be 15 words or less.

{STORY_BEATS}

IMPORTANT RULES FOR THE MACGUFFIN (MANDATORY):
- Most segments must hint at the power of the MacGuffin ({universe_macguffin})
- Use strong clues ONLY at key moments
- NEVER reveal the full power of the MacGuffin before the climax, this is a STRICT limit
- Use subtle clues in safe havens
- NEVER mention the power of the MacGuffin explicitly in choices or the story
- NEVER mention time or place in the story in this manner: [18:00 - a road]

IMPORTANT RULES FOR STORY TEXT:
- Write ONLY a descriptive narrative text
- DO NOT include any choices, questions, or options
- DO NOT ask what Sarah should do next
- DO NOT include any dialogue asking for decisions
- Focus purely on describing what is happening in the current scene
- Keep the text concise and impactful

Your task is to generate the next segment of the story, following these rules:
1. Keep the story consistent with the universe parameters
2. Each segment must advance the plot
3. Never repeat previous descriptions or situations
4. Keep segments concise and impactful (max 15 words)
5. The MacGuffin should remain mysterious but central to the plot

Hero: {HERO_DESCRIPTION}

Rules: {FORMATTING_RULES}

You must return a JSON object with the following format:
{{
    "story_text": "Your story segment here"
}}
"""

        human_template = """
Story history:
{story_history}

Current game state :
- Current time: {current_time}
- Current location: {current_location}
- Previous choice: {previous_choice}
- Story beat: {story_beat}

{is_end}
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

    async def generate(self, story_beat: int, current_time: str, current_location: str, previous_choice: str, story_history: str = "", turn_before_end: int = 0, is_winning_story: bool = False) -> StorySegmentResponse:
        """Generate the next story segment."""

        what_to_represent =" this is a victory !" if is_winning_story else "this is a death !"
        is_end = f"Generate the END of the story. {what_to_represent} in 35 words. THIS IS MANDATORY." if story_beat == turn_before_end  else "Generate the next segment of the story in 25 words."
        
        return await super().generate(
            HERO_DESCRIPTION=HERO_DESCRIPTION,
            FORMATTING_RULES=FORMATTING_RULES,
            STORY_BEATS=STORY_BEATS,
            story_beat=story_beat,
            current_time=current_time,
            current_location=current_location,
            previous_choice=previous_choice,
            story_history=story_history,
            is_end=is_end,
            universe_style=self.universe_style,
            universe_genre=self.universe_genre,
            universe_epoch=self.universe_epoch,
            universe_story=self.universe_story,
            universe_macguffin=self.universe_macguffin
        ) 