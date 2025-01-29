from typing import List
from pydantic import BaseModel, Field
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
import json

from core.generators.base_generator import BaseGenerator
from core.prompts.hero import HERO_VISUAL_DESCRIPTION

class ImagePromptResponse(BaseModel):
    """Response format for image prompt generation."""
    image_prompts: List[str] = Field(description="List of image prompts", min_items=1, max_items=4)

class ImagePromptGenerator(BaseGenerator):
    """Generator for image prompts based on story text."""

    def __init__(self, mistral_client, artist_style: str = None):
        super().__init__(mistral_client)
        self.artist_style = artist_style or "François Schuiten comic panel"

    def _create_prompt(self) -> ChatPromptTemplate:
        """Create the prompt template for image prompt generation."""

        IMAGE_PROMPTS_GENERATOR_PROMPT = f"""
        You are a cinematic storyboard artist. Based on the given story text, create 1 to 4 vivid panel descriptions.
        Each panel should capture a key moment or visual element from the story.
        ALWAYS write in English, never use any other language.

        You are a comic book panel description generator.
        Your role is to create vivid, cinematic descriptions for comic panels that will be turned into images.

        {HERO_VISUAL_DESCRIPTION}

        Each panel description should:
        1. Be clear and specific about what to show
        2. Use dynamic camera angles (low angle, high angle, Dutch angle)
        3. Specify shot types (close-up, medium shot, wide shot)
        4. Include mood and lighting
        5. Focus on the most dramatic or meaningful moment

        ANGLES AND MOVEMENT:
        - High angle: Vulnerability, weakness
        - Low angle: Power, threat
        - Dutch angle: Tension, disorientation
        - Over shoulder: POV, surveillance

        VISUAL STORYTELLING TOOLS:
        - Focus on story-relevant details:
            * Objects that will be important later
            * Environmental clues
            * Character reactions
            * Symbolic elements

        - Dynamic composition:
            * Frame within frame (through doorways, windows)
            * Reflections and shadows
            * Foreground elements for depth
            * Leading lines
            * Rule of thirds

        FORMAT:
        "[shot type] [scene description]"

        EXAMPLES:
        - "low angle shot of Sarah checking an object in a dark corridor"
        - "wide shot of a ruined cityscape at sunset, silhouette of Sarah in the foreground"
        - "Dutch angle close-up of Sarah's determined face illuminated by the glow of her object"

        Always maintain consistency with Sarah's appearance and the comic book style.

        IMPORTANT RULES FOR IMAGE PROMPTS:
        - If you are prompting only one panel, it must be an important panel. Dont use only one panel often. It should be a key moment in the story.
        - If you are prompting more than one panel, they must be distinct and meaningful.
        - For death scenes: Focus on the dramatic and emotional impact, not the gore or violence
        - For victory scenes: Emphasize triumph, relief, and accomplishment
        - For victory and death scenes, you MUST use 1 panel only

        RESPONSE FORMAT:
        You must return a valid JSON object that matches this Pydantic schema:
        ```python
        class ImagePromptResponse(BaseModel):
            image_prompts: List[str] = Field(
                description="List of image prompts",
                min_items=1,  # Must have at least 1 prompt
                max_items=4   # Cannot have more than 4 prompts
            )
        ```

        Example of valid response:
        {{{{
            "image_prompts": [
                "low angle shot of Sarah examining a mysterious artifact in a dimly lit chamber",
                "medium shot of ancient symbols glowing on the chamber walls, casting eerie shadows",
                "close-up of Sarah's determined expression as she deciphers the meaning"
            ]
        }}}}

        Your response MUST be a valid JSON object with this exact structure, or it will be rejected.
        """ 

        human_template = """
Story text: {story_text}

Generate panel descriptions that capture the key moments of this scene.

Story state: {is_end}
"""

        return ChatPromptTemplate(
            messages=[
                SystemMessagePromptTemplate.from_template(IMAGE_PROMPTS_GENERATOR_PROMPT),
                HumanMessagePromptTemplate.from_template(human_template)
            ]
        )

    def _custom_parser(self, response_content: str) -> ImagePromptResponse:
        """Parse the response into a list of image prompts."""
        try:
            # Parse JSON
            try:
                data = json.loads(response_content)
            except json.JSONDecodeError:
                raise ValueError(
                    "Invalid JSON format. Response must be a valid JSON object. "
                    "Example: {'image_prompts': ['panel description 1', 'panel description 2']}"
                )

            # Verify image_prompts exists
            if "image_prompts" not in data:
                raise ValueError(
                    "Missing 'image_prompts' field in JSON. "
                    "Response must contain an 'image_prompts' array."
                )

            # Verify image_prompts is a list
            if not isinstance(data["image_prompts"], list):
                raise ValueError(
                    "'image_prompts' must be an array of strings. "
                    "Example: {'image_prompts': ['panel description 1', 'panel description 2']}"
                )

            # Add Sarah's visual description if she's mentioned
            prompts = data["image_prompts"]
            prompts = [
                f"{prompt} {HERO_VISUAL_DESCRIPTION}" if "sarah" in prompt.lower() else prompt
                for prompt in prompts
            ]
            
            # Create and validate with Pydantic
            try:
                return ImagePromptResponse(image_prompts=prompts)
            except ValueError as e:
                raise ValueError(
                    f"Invalid prompt structure: {str(e)}. "
                    "Must have between 1 and 4 prompts. "
                    "For death/victory scenes, exactly 1 prompt is required."
                )
        except json.JSONDecodeError:
            raise ValueError("Response must be a valid JSON object with 'image_prompts' array")

    def _format_prompt(self, prompt: str, time: str, location: str) -> str:
        """Format a prompt with time and location metadata."""
        metadata = f"[{time} - {location}] "
        return f"{self.artist_style} -- {metadata}{prompt}"

    async def generate(self, story_text: str, time: str, location: str, is_death: bool = False, is_victory: bool = False) -> ImagePromptResponse:
        """Generate image prompts based on story text.
        
        Args:
            story_text: The story text to generate image prompts from
            time: Current time in the story
            location: Current location in the story
            is_death: Whether this is a death scene
            is_victory: Whether this is a victory scene
            
        Returns:
            ImagePromptResponse containing the generated and formatted image prompts
        """

        is_end=""
        if is_death:
            is_end = "this is a death to represent"
        elif is_victory:
            is_end = "this is a victory to represent"

        response = await super().generate(
            story_text=story_text,
            is_death=is_death,
            is_victory=is_victory,
            is_end=is_end
        )
        
        # Format each prompt with metadata
        response.image_prompts = [
            self._format_prompt(prompt, time, location)
            for prompt in response.image_prompts
        ]
        
        return response 