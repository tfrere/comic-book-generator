from typing import List
from pydantic import BaseModel, Field
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
import json

from core.generators.base_generator import BaseGenerator

class ImagePromptResponse(BaseModel):
    """Response format for image prompt generation."""
    image_prompts: List[str] = Field(description="List of image prompts", min_items=1, max_items=4)

class ImagePromptGenerator(BaseGenerator):
    """Generator for image prompts based on story text."""

    def __init__(self, mistral_client, artist_style: str, hero_name: str = None, hero_desc: str = None):
        super().__init__(mistral_client, hero_name=hero_name, hero_desc=hero_desc)
        if not artist_style:
            raise ValueError("artist_style must be provided")
        self.artist_style = artist_style

    def _create_prompt(self) -> ChatPromptTemplate:
        """Create the prompt template for image prompt generation."""

        IMAGE_PROMPTS_GENERATOR_PROMPT = f"""
        You are a cinematic storyboard artist. Based on the given story text, create 1 to 4 vivid panel descriptions.
        Each panel should capture a key moment or visual element from the story.
        ALWAYS write in English, never use any other language.

        You are a comic book panel description generator.
        Your role is to create vivid, cinematic descriptions for comic panels that will be turned into images.

        Hero description: {self.hero_desc}

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
        - "low angle shot of a mysterious figure checking an object in a dark corridor"
        - "wide shot of a ruined cityscape at sunset, silhouette of a lone traveler in the foreground"
        - "Dutch angle close-up of a determined face illuminated by the glow of an object"
        - "over shoulder shot of a character looking at an ancient map spread out on a table"
        - "close-up of eyes reflecting the flames of a nearby fire"
        - "wide shot of a dense forest with a figure barely visible among the trees"
        - "high angle shot of a character standing at the edge of a cliff, looking down at a vast ocean"
        - "medium shot of a person walking through a bustling marketplace, with various vendors and colorful stalls"
        - "low angle shot of a character standing in front of a towering ancient statue, looking up in awe"
        - "close-up of fingers tracing the carvings on an ancient artifact"
        - "wide shot of a stormy sky with lightning illuminating a determined silhouette"
        - "close-up of an ancient compass, its needle spinning wildly"
        - "over shoulder shot of a mysterious figure watching from the shadows"
        - "medium shot of a group of travelers gathered around a campfire, sharing stories"
        - "Dutch angle shot of a clock tower striking midnight, casting long shadows"
        - "close-up of a hand gripping a sword hilt, ready for battle"
        - "wide shot of a bustling port with ships coming and going, seagulls circling above"
        - "high angle shot of a chessboard mid-game, pieces scattered in strategic positions"
        - "medium shot of two characters in a heated argument, tension visible in their expressions"

        Always maintain consistency with {self.hero_name}'s appearance and the style.

        IMPORTANT RULES FOR IMAGE PROMPTS:
        - If you are prompting only one panel, it must be an important panel. Dont use only one panel often. It should be a key moment in the story.
        - If you are prompting more than one panel, they must be distinct and meaningful.

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
                "low angle shot of {self.hero_name} examining a mysterious artifact in a dimly lit chamber",
                "medium shot of ancient symbols glowing on the chamber walls, casting eerie shadows",
                "close-up of {self.hero_name}'s determined expression as they decipher the meaning"
            ]
        }}}}

        Your response MUST be a valid JSON object with this exact structure, or it will be rejected.
        """ 

        human_template = """
Story text: {story_text}

Generate panel descriptions that capture the key moments of this scene.
do not have panels that look alike, each successive panel must be different,
and explain the story like a storyboard.

Dont put the hero name every time.

{is_end}
"""

        return ChatPromptTemplate(
            messages=[
                SystemMessagePromptTemplate.from_template(IMAGE_PROMPTS_GENERATOR_PROMPT),
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
            
        # If we can find an array of prompts, wrap it in proper JSON format
        prompts_match = re.findall(r'"[^"]+"|\'[^\']+\'', cleaned)
        if prompts_match:
            prompts = [p.strip('"\'') for p in prompts_match]
            return json.dumps({"image_prompts": prompts})
            
        return cleaned

    def _custom_parser(self, response_content: str) -> ImagePromptResponse:
        """Parse the response into a list of image prompts."""
        try:
            # First try to clean and fix the response
            cleaned_response = self._clean_and_fix_response(response_content)
            
            # Parse JSON
            try:
                data = json.loads(cleaned_response)
            except json.JSONDecodeError:
                raise ValueError(
                    "Invalid JSON format. Response must be a valid JSON object. "
                    "Example: {'image_prompts': ['panel description 1', 'panel description 2']}"
                )

            # Verify image_prompts exists and is a list
            if "image_prompts" not in data or not isinstance(data["image_prompts"], list):
                raise ValueError(
                    "'image_prompts' must be an array of strings. "
                    "Example: {'image_prompts': ['panel description 1', 'panel description 2']}"
                )

            # Add hero description if hero name is mentioned
            prompts = data["image_prompts"]
            prompts = [
                f"{prompt} {self.hero_desc}" if self.hero_name.lower() in prompt.lower() else prompt
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
        """Format a prompt with time and location metadata and universe style."""
        metadata = f"[{time} - {location}] "
        
        # Construct a detailed style prefix with the full artist_style
        style_prefix = f"{self.artist_style}"
        
        return f"{style_prefix} comic book style -- {metadata}{prompt}"

    async def generate(self, story_text: str, time: str, location: str, is_death: bool = False, is_victory: bool = False, turn_before_end: int = 0, is_winning_story: bool = False, story_beat: int = 0) -> ImagePromptResponse:
        """Generate image prompts based on story text.
        
        Args:
            story_text: The story text to generate image prompts from
            time: Current time in the story
            location: Current location in the story
            is_death: Whether this is a death scene
            is_victory: Whether this is a victory scene
            story_beat: Current story beat (0-6+)
            
        Returns:
            ImagePromptResponse containing the generated and formatted image prompts
        """

        is_end="Must have between 2 and 4 prompts, MANDATORY."
        if is_death:
            is_end = f"This is the death of {self.hero_name}. just one panel, MANDATORY."
        elif is_victory:
            is_end = f"this is a victory. just one panel, MANDATORY."

        

        response = await super().generate(
            story_text=story_text,
            is_death=is_death,
            is_victory=is_victory,
            is_end=is_end,
        )
        
        # Format each prompt with metadata
        response.image_prompts = [
            self._format_prompt(prompt, time, location)
            for prompt in response.image_prompts
        ]
        
        return response 