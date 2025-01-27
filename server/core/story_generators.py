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
        self.parser = PydanticOutputParser(pydantic_object=StoryTextResponse)
        self.prompt = self._create_prompt()
        
    def _create_prompt(self) -> ChatPromptTemplate:
        human_template = """
Current story beat: {story_beat}
Current radiation level: {radiation_level}/10
Current time: {current_time}
Current location: {current_location}
Previous choice: {previous_choice}

Story so far:
{story_history}

Generate ONLY the next story segment text. Make it concise and impactful."""

        return ChatPromptTemplate(
            messages=[
                SystemMessagePromptTemplate.from_template(TEXT_GENERATOR_PROMPT),
                HumanMessagePromptTemplate.from_template(human_template)
            ]
        )

    async def generate(self, story_beat: int, radiation_level: int, current_time: str, 
                      current_location: str, previous_choice: str, story_history: str) -> StoryTextResponse:
        """Génère uniquement le texte de l'histoire."""
        messages = self.prompt.format_messages(
            story_beat=story_beat,
            radiation_level=radiation_level,
            current_time=current_time,
            current_location=current_location,
            previous_choice=previous_choice,
            story_history=story_history
        )
        
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                response_content = await self.mistral_client.generate_story(messages)
                return StoryTextResponse(story_text=response_content.strip())
            except Exception as e:
                print(f"Error generating story text: {str(e)}")
                retry_count += 1
                if retry_count < max_retries:
                    await asyncio.sleep(2 * retry_count)
                    continue
                raise e
        
        raise Exception(f"Failed to generate valid story text after {max_retries} attempts")

class ImagePromptsGenerator:
    def __init__(self, mistral_client: MistralClient):
        self.mistral_client = mistral_client
        self.parser = PydanticOutputParser(pydantic_object=StoryPromptsResponse)
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

    def _parse_response(self, response_content: str) -> StoryPromptsResponse:
        """Parse la réponse JSON et gère les erreurs."""
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
        
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                response_content = await self.mistral_client.generate_story(messages)
                # Parser la réponse
                parsed_response = self._parse_response(response_content)
                # Enrichir les prompts avec la description de Sarah
                parsed_response.image_prompts = [self.enrich_prompt(prompt) for prompt in parsed_response.image_prompts]
                return parsed_response
            except Exception as e:
                print(f"Error generating image prompts: {str(e)}")
                retry_count += 1
                if retry_count < max_retries:
                    await asyncio.sleep(2 * retry_count)
                    continue
                raise e
        
        raise Exception(f"Failed to generate valid image prompts after {max_retries} attempts")

class MetadataGenerator:
    def __init__(self, mistral_client: MistralClient):
        self.mistral_client = mistral_client
        self.parser = PydanticOutputParser(pydantic_object=StoryMetadataResponse)
        self.prompt = self._create_prompt()
        
    def _create_prompt(self) -> ChatPromptTemplate:
        human_template = """Story text: {story_text}
Current time: {current_time}
Current location: {current_location}
Story beat: {story_beat}

Generate the metadata following the format specified."""

        return ChatPromptTemplate(
            messages=[
                SystemMessagePromptTemplate.from_template(METADATA_GENERATOR_PROMPT),
                HumanMessagePromptTemplate.from_template(human_template)
            ]
        )

    def _parse_response(self, response_content: str, current_time: str, current_location: str) -> StoryMetadataResponse:
        """Parse la réponse JSON et gère les erreurs."""
        try:
            # Essayer de parser directement le JSON
            data = json.loads(response_content)
            return StoryMetadataResponse(**data)
        except (json.JSONDecodeError, ValueError):
            # Si le parsing échoue, parser le format texte
            metadata = {
                "choices": [],
                "is_victory": False,
                "radiation_increase": 1,
                "is_last_step": False,
                "time": current_time,
                "location": current_location
            }
            
            current_section = None
            for line in response_content.split("\n"):
                line = line.strip()
                if not line:
                    continue
                    
                if line.upper().startswith("CHOICES:"):
                    current_section = "choices"
                elif line.upper().startswith("TIME:"):
                    time = line.split(":", 1)[1].strip()
                    if ":" in time:
                        metadata["time"] = time
                elif line.upper().startswith("LOCATION:"):
                    metadata["location"] = line.split(":", 1)[1].strip()
                elif current_section == "choices" and line.startswith("-"):
                    choice = line[1:].strip()
                    if choice:
                        metadata["choices"].append(choice)
            
            return StoryMetadataResponse(**metadata)

    async def generate(self, story_text: str, current_time: str, current_location: str, story_beat: int) -> StoryMetadataResponse:
        """Génère les métadonnées de l'histoire (choix, temps, lieu, etc.)."""
        messages = self.prompt.format_messages(
            story_text=story_text,
            current_time=current_time,
            current_location=current_location,
            story_beat=story_beat
        )
        
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                response_content = await self.mistral_client.generate_story(messages)
                # Parser la réponse
                return self._parse_response(response_content, current_time, current_location)
            except Exception as e:
                print(f"Error generating metadata: {str(e)}")
                retry_count += 1
                if retry_count < max_retries:
                    await asyncio.sleep(2 * retry_count)
                    continue
                raise e
        
        raise Exception(f"Failed to generate valid metadata after {max_retries} attempts") 