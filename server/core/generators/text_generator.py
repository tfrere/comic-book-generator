import json
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate

from core.generators.base_generator import BaseGenerator
from core.prompts.text_prompts import TEXT_GENERATOR_PROMPT
from api.models import StoryTextResponse

class TextGenerator(BaseGenerator):
    """Générateur pour le texte principal de l'histoire."""

    def _create_prompt(self) -> ChatPromptTemplate:
        human_template = """Story beat: {story_beat}
Radiation level: {radiation_level}
Current time: {current_time}
Current location: {current_location}
Previous choice: {previous_choice}

Story history:
{story_history}

Generate the next story segment following the format specified."""

        return ChatPromptTemplate(
            messages=[
                SystemMessagePromptTemplate.from_template(TEXT_GENERATOR_PROMPT),
                HumanMessagePromptTemplate.from_template(human_template)
            ]
        )

    def _create_ending_prompt(self) -> ChatPromptTemplate:
        human_template = """Current scene: {current_scene}

Story history:
{story_history}

This is a {ending_type} ending. Generate a dramatic conclusion that fits the current situation.
The ending should feel like a natural continuation of the current scene."""

        return ChatPromptTemplate(
            messages=[
                SystemMessagePromptTemplate.from_template(TEXT_GENERATOR_PROMPT),
                HumanMessagePromptTemplate.from_template(human_template)
            ]
        )

    def _clean_story_text(self, text: str) -> str:
        """Nettoie le texte des métadonnées et autres suffixes."""
        text = text.replace("\n", " ").strip()
        text = text.split("Radiation level:")[0].strip()
        text = text.split("RADIATION:")[0].strip()
        text = text.split("[")[0].strip()  # Supprimer les métadonnées entre crochets
        return text

    def _custom_parser(self, response_content: str) -> StoryTextResponse:
        """Parse la réponse et gère les erreurs."""
        try:
            # Essayer de parser directement le JSON
            data = json.loads(response_content)
            # Nettoyer le texte avant de créer la réponse
            if 'story_text' in data:
                data['story_text'] = self._clean_story_text(data['story_text'])
            return StoryTextResponse(**data)
        except (json.JSONDecodeError, ValueError):
            # Si le parsing échoue, extraire le texte directement
            cleaned_text = self._clean_story_text(response_content.strip())
            return StoryTextResponse(story_text=cleaned_text)

    async def generate_ending(self, ending_type: str, current_scene: str, story_history: str) -> StoryTextResponse:
        """Génère un texte de fin approprié."""
        prompt = self._create_ending_prompt()
        messages = prompt.format_messages(
            ending_type=ending_type,
            current_scene=current_scene,
            story_history=story_history
        )
        
        return await self.mistral_client.generate(
            messages=messages,
            custom_parser=self._custom_parser
        ) 