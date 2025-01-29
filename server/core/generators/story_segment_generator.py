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
    "story_text": "Your story segment here (15 words)"
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
You must return a JSON object with the following format:
{{
    "story_text": "Your story segment here (15 words)"
}}
"""
        return ChatPromptTemplate(
            messages=[
                SystemMessagePromptTemplate.from_template(system_template),
                HumanMessagePromptTemplate.from_template(human_template)
            ]
        )

    def _custom_parser(self, response_content: str) -> StorySegmentResponse:
        """Parse response and handle errors."""
        
        try:
            # Clean up escaped characters
            cleaned_response = response_content.replace("\\_", "_").strip()
            
            # If the response is a plain string (with or without quotes), convert it to proper JSON
            if cleaned_response.startswith('"') and cleaned_response.endswith('"'):
                cleaned_response = cleaned_response[1:-1]  # Remove surrounding quotes
            
            if not cleaned_response.startswith('{'):
                # Convert plain text to proper JSON format
                cleaned_response = json.dumps({"story_text": cleaned_response})
            
            # Try to parse as JSON
            data = json.loads(cleaned_response)
            return StorySegmentResponse(**data)
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Error parsing response: {str(e)}")
            raise ValueError(
                "Response must be a valid JSON object with 'story_text' field. "
                "Example: {'story_text': 'Your story segment here'}"
            )

    async def generate(self, story_beat: int, current_time: str, current_location: str, previous_choice: str, story_history: str = "") -> StorySegmentResponse:
        """Generate the next story segment."""

        is_end = "Generate the END of the story. Reminder: 30 words." if story_beat >= random.randint(5, 10) else "Generate the next segment of the story. REMINDER: 15 words."
        
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