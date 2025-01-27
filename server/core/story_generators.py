from pydantic import BaseModel
from typing import List
import json
from langchain.output_parsers import PydanticOutputParser
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate
import asyncio

from core.prompts.system import SARAH_VISUAL_DESCRIPTION
from core.prompts.text_prompts import TEXT_GENERATOR_PROMPT, METADATA_GENERATOR_PROMPT, IMAGE_PROMPTS_GENERATOR_PROMPT
from services.mistral_client import MistralClient
from api.models import StoryTextResponse, StoryPromptsResponse, StoryMetadataResponse

class TextGenerator:
    def __init__(self, mistral_client: MistralClient):
        self.mistral_client = mistral_client
        self.prompt = self._create_prompt()
        
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

    async def generate(self, story_beat: int, radiation_level: int, current_time: str, current_location: str, previous_choice: str, story_history: str) -> StoryTextResponse:
        """Génère le texte de l'histoire."""
        messages = self.prompt.format_messages(
            story_beat=story_beat,
            radiation_level=radiation_level,
            current_time=current_time,
            current_location=current_location,
            previous_choice=previous_choice,
            story_history=story_history
        )
        
        return await self.mistral_client.generate(
            messages=messages,
            custom_parser=self._custom_parser
        )

    async def generate_ending(self, story_beat: int, ending_type: str, current_scene: str, story_history: str) -> StoryTextResponse:
        """Génère un texte de fin approprié basé sur la situation actuelle."""
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

class ImagePromptsGenerator:
    def __init__(self, mistral_client: MistralClient):
        self.mistral_client = mistral_client
        self.prompt = self._create_prompt()
        
    def _create_prompt(self) -> ChatPromptTemplate:
        human_template = """Story text: {story_text}

Generate panel descriptions following the format specified."""

        return ChatPromptTemplate(
            messages=[
                SystemMessagePromptTemplate.from_template(IMAGE_PROMPTS_GENERATOR_PROMPT),
                HumanMessagePromptTemplate.from_template(human_template)
            ]
        )

    def enrich_prompt(self, prompt: str) -> str:
        """Add Sarah's visual description to prompts that mention her."""
        if "sarah" in prompt.lower() and SARAH_VISUAL_DESCRIPTION not in prompt:
            return f"{prompt} {SARAH_VISUAL_DESCRIPTION}"
        return prompt

    def _custom_parser(self, response_content: str) -> StoryPromptsResponse:
        """Parse la réponse et gère les erreurs."""
        try:
            # Essayer de parser directement le JSON
            data = json.loads(response_content)
            return StoryPromptsResponse(**data)
        except (json.JSONDecodeError, ValueError):
            # Si le parsing échoue, extraire les prompts en ignorant les lignes de syntaxe JSON
            prompts = []
            for line in response_content.split("\n"):
                line = line.strip()
                # Ignorer les lignes vides, la syntaxe JSON et les lignes contenant image_prompts
                if (not line or 
                    line in ["{", "}", "[", "]"] or 
                    "image_prompts" in line.lower() or
                    "image\\_prompts" in line or
                    line.startswith('"') and line.endswith('",') and len(line) < 5):
                    continue
                # Nettoyer la ligne des caractères JSON et d'échappement
                line = line.strip('",')
                line = line.replace('\\"', '"').replace("\\'", "'").replace("\\_", "_")
                if line:
                    prompts.append(line)
            # Limiter à 4 prompts maximum
            prompts = prompts[:4]
            return StoryPromptsResponse(image_prompts=prompts)

    async def generate(self, story_text: str) -> StoryPromptsResponse:
        """Génère les prompts d'images basés sur le texte de l'histoire."""
        messages = self.prompt.format_messages(story_text=story_text)
        
        response = await self.mistral_client.generate(
            messages=messages,
            custom_parser=self._custom_parser
        )
        
        # Enrichir les prompts avec la description de Sarah
        response.image_prompts = [self.enrich_prompt(prompt) for prompt in response.image_prompts]
        return response

class MetadataGenerator:
    def __init__(self, mistral_client: MistralClient):
        self.mistral_client = mistral_client
        self.prompt = self._create_prompt()
        
    def _create_prompt(self, error_feedback: str = None) -> ChatPromptTemplate:
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
            
            if is_ending and len(choices) != 0:
                raise ValueError('For victory/death, choices must be empty')
            if not is_ending and len(choices) != 2:
                raise ValueError('For normal progression, must have exactly 2 choices')
            
            return StoryMetadataResponse(**data)
        except json.JSONDecodeError:
            raise ValueError('Invalid JSON format. Please provide a valid JSON object.')
        except ValueError as e:
            raise ValueError(str(e))

    async def generate(self, story_text: str, current_time: str, current_location: str, story_beat: int) -> StoryMetadataResponse:
        """Génère les métadonnées basées sur le texte de l'histoire."""
        messages = self.prompt.format_messages(
            story_text=story_text,
            current_time=current_time,
            current_location=current_location,
            story_beat=story_beat,
            error_feedback=""
        )
        
        return await self.mistral_client.generate(
            messages=messages,
            custom_parser=self._custom_parser
        ) 