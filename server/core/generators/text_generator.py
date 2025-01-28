import json
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate

from core.generators.base_generator import BaseGenerator
from core.prompts.text_prompts import TEXT_GENERATOR_PROMPT
from api.models import StoryTextResponse
from services.mistral_client import MistralClient

class TextGenerator(BaseGenerator):
    """Générateur pour le texte de l'histoire."""

    def __init__(self, mistral_client: MistralClient, universe_style: str = None, universe_genre: str = None, universe_epoch: str = None, universe_story: str = None):
        super().__init__(mistral_client)
        self.universe_style = universe_style
        self.universe_genre = universe_genre
        self.universe_epoch = universe_epoch
        self.universe_story = universe_story

    def _create_prompt(self) -> ChatPromptTemplate:
        system_template = """You are a story generator for a comic book adventure game.
You are generating a story in the following universe:
- Style: {universe_style}
- Genre: {universe_genre}
- Historical epoch: {universe_epoch}

Base universe story:
{universe_story}

Your task is to generate the next segment of the story, following these rules:
1. Keep the story consistent with the universe parameters
2. Each segment must advance the plot
3. Never repeat previous descriptions or situations
4. Keep segments concise and impactful (max 15 words)
5. The MacGuffin should remain mysterious but central to the plot"""

        human_template = """Current game state:
- Story beat: {story_beat}
- Radiation level: {radiation_level}
- Current time: {current_time}
- Current location: {current_location}
- Previous choice: {previous_choice}

Story history:
{story_history}

Generate the next story segment."""

        return ChatPromptTemplate(
            messages=[
                SystemMessagePromptTemplate.from_template(system_template),
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

    async def generate(self, story_beat: int, radiation_level: int, current_time: str, current_location: str, previous_choice: str, story_history: str = "") -> StoryTextResponse:
        """Génère le prochain segment de l'histoire."""
        return await super().generate(
            story_beat=story_beat,
            radiation_level=radiation_level,
            current_time=current_time,
            current_location=current_location,
            previous_choice=previous_choice,
            story_history=story_history,
            universe_style=self.universe_style,
            universe_genre=self.universe_genre,
            universe_epoch=self.universe_epoch,
            universe_story=self.universe_story
        )

    async def generate_ending(self, story_beat: int, ending_type: str, current_scene: str, story_history: str) -> StoryTextResponse:
        """Génère un texte de fin approprié."""
        system_template = """You are a story generator for a comic book adventure game.
You are generating a story in the following universe:
- Style: {universe_style}
- Genre: {universe_genre}
- Historical epoch: {universe_epoch}

Base universe story:
{universe_story}

Your task is to generate an epic {ending_type} ending for the story that:
1. Matches the universe's style and atmosphere
2. Provides a satisfying conclusion
3. Keeps the ending concise but impactful (max 15 words)
4. For victory: reveals the MacGuffin's power in a spectacular way
5. For death: creates a dramatic and fitting end for Sarah"""

        human_template = """Current scene:
{current_scene}

Story history:
{story_history}

Generate the {ending_type} ending."""

        ending_prompt = ChatPromptTemplate(
            messages=[
                SystemMessagePromptTemplate.from_template(system_template),
                HumanMessagePromptTemplate.from_template(human_template)
            ]
        )

        response = await self.mistral_client.generate(
            ending_prompt,
            ending_type=ending_type,
            current_scene=current_scene,
            story_history=story_history,
            universe_style=self.universe_style,
            universe_genre=self.universe_genre,
            universe_epoch=self.universe_epoch,
            universe_story=self.universe_story
        )

        cleaned_text = self._custom_parser(response)
        return StoryTextResponse(story_text=cleaned_text) 