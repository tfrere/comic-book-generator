import json
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate

from core.generators.base_generator import BaseGenerator
from core.prompts.formatting_rules import FORMATTING_RULES
from api.models import StoryMetadataResponse
from core.prompts.story_beats import STORY_BEATS

class MetadataGenerator(BaseGenerator):
    """Générateur pour les métadonnées de l'histoire."""

    def _create_prompt(self) -> ChatPromptTemplate:

        METADATA_GENERATOR_PROMPT = f"""
        Generate the metadata for the story segment: choices, time progression, location changes, etc.
        Be consistent with the story's tone and previous context.
        ALWAYS write in English, never use any other language.

        {FORMATTING_RULES}

        IMPORTANT RULES FOR CHOICES:
        - You MUST ALWAYS provide EXACTLY TWO choices that advance the story
        - Each choice MUST be NO MORE than 6 words - this is a HARD limit
        - Each choice should be distinct and meaningful
        - If you think of more than two options, select the two most interesting ones
        - Keep choices concise but descriptive
        - Count your words carefully for each choice
        - Choices MUST be direct continuations of the current story segment
        - Choices should reflect possible actions based on the current situation

 
        {STORY_BEATS}

        IMPORTANT:
        - After story_beat is at 5+ the next segment MUST be the end of the story.
        - THIS IS MANDATORY.

        You must return a JSON object with the following format:
        {{{{
            "is_death": false,  # Set to true for death scenes
            "is_victory": false  # Set to true for victory scenes
            "choices": ["Choice 1", "Choice 2"],  # ALWAYS exactly two choices, each max 6 words
            "time": "HH:MM",
            "location": "Location name with proper nouns in bold",
        }}}}

        """

        human_template = """
Current story segment:
{story_text}

Current game state:
- Story beat: {story_beat}
- Current time: {current_time}
- Current location: {current_location}

{is_end}

FOR CHOICES : NEVER propose to go back to the previous location or go back to the portal. NEVER.
"""


        return ChatPromptTemplate(
            messages=[
                SystemMessagePromptTemplate.from_template(METADATA_GENERATOR_PROMPT),
                HumanMessagePromptTemplate.from_template(human_template)
            ]
        )

    def _custom_parser(self, response_content: str) -> StoryMetadataResponse:
        """Parse la réponse et gère les erreurs."""
        try:
            # Essayer de parser directement le JSON
            data = json.loads(response_content)
            
            # Vérifier que les choix sont valides selon les règles
            choices = data.get('choices', [])
            
            # Vérifier qu'il y a exactement 2 choix
            if len(choices) != 2:
                raise ValueError('Must have exactly 2 choices')
            
            return StoryMetadataResponse(**data)
        except json.JSONDecodeError:
            raise ValueError('Invalid JSON format. Please provide a valid JSON object.')
        except ValueError as e:
            raise ValueError(str(e))

    async def generate(self, story_text: str, current_time: str, current_location: str, story_beat: int, error_feedback: str = "", turn_before_end: int = 0, is_winning_story: bool = False) -> StoryMetadataResponse:
        """Surcharge de generate pour inclure le error_feedback par défaut."""

        is_end = "This IS the end of the story." if story_beat == turn_before_end else ""
        return await super().generate(
            story_text=story_text,
            current_time=current_time,
            current_location=current_location,
            story_beat=story_beat,
            error_feedback=error_feedback,
            is_end=is_end,
            turn_before_end=turn_before_end,
            is_winning_story=is_winning_story
        ) 