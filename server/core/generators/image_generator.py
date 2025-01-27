import json
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate

from core.generators.base_generator import BaseGenerator
from core.prompts.image_style import IMAGE_STYLE_PREFIX
from core.prompts.system import SARAH_VISUAL_DESCRIPTION
from core.prompts.text_prompts import IMAGE_PROMPTS_GENERATOR_PROMPT
from api.models import StoryPromptsResponse

class ImageGenerator(BaseGenerator):
    """Générateur pour les prompts d'images."""

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
        response = await super().generate(story_text=story_text)
        
        # Enrichir les prompts avec la description de Sarah
        response.image_prompts = [self.enrich_prompt(prompt) for prompt in response.image_prompts]
        return response

    def format_prompt(self, prompt: str, time: str, location: str) -> str:
        """Formate un prompt d'image avec le style et les métadonnées."""
        metadata = f"[{time} - {location}] "
        return f"{IMAGE_STYLE_PREFIX}{metadata}{prompt}" 