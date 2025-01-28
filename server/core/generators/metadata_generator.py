import json
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate

from core.generators.base_generator import BaseGenerator
from core.prompts.text_prompts import METADATA_GENERATOR_PROMPT
from api.models import StoryMetadataResponse

class MetadataGenerator(BaseGenerator):
    """Générateur pour les métadonnées de l'histoire."""

    def _create_prompt(self) -> ChatPromptTemplate:
        human_template = """Story text: {story_text}
Current time: {current_time}
Current location: {current_location}
Story beat: {story_beat}
{error_feedback}

Generate the metadata following the format specified."""

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
            is_ending = data.get('is_victory', False) or data.get('is_death', False)
            choices = data.get('choices', [])
            
            # Si c'est une fin, forcer les choix à être vides
            if is_ending:
                data['choices'] = []
            # Sinon, vérifier qu'il y a entre 1 et 4 choix
            elif not (1 <= len(choices) <= 4):
                raise ValueError('For normal progression, must have between 1 and 4 choices')
            
            return StoryMetadataResponse(**data)
        except json.JSONDecodeError:
            raise ValueError('Invalid JSON format. Please provide a valid JSON object.')
        except ValueError as e:
            raise ValueError(str(e))

    async def generate(self, story_text: str, current_time: str, current_location: str, story_beat: int, error_feedback: str = "") -> StoryMetadataResponse:
        """Surcharge de generate pour inclure le error_feedback par défaut."""
        return await super().generate(
            story_text=story_text,
            current_time=current_time,
            current_location=current_location,
            story_beat=story_beat,
            error_feedback=error_feedback
        ) 