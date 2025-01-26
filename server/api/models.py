from pydantic import BaseModel, Field
from typing import List, Optional

class Choice(BaseModel):
    id: int
    text: str

class StoryResponse(BaseModel):
    story_text: str = Field(description="The story text with proper nouns in bold using ** markdown")
    choices: List[Choice]
    radiation_level: int = Field(description="Current radiation level from 0 to 10")
    is_victory: bool = Field(description="Whether this segment ends in Sarah's victory", default=False)
    is_first_step: bool = Field(description="Whether this is the first step of the story", default=False)
    is_last_step: bool = Field(description="Whether this is the last step (victory or death)", default=False)
    image_prompts: List[str] = Field(description="List of 1 to 3 comic panel descriptions that illustrate the key moments of the scene", min_items=1, max_items=3)

class ChatMessage(BaseModel):
    message: str
    choice_id: Optional[int] = None

class ImageGenerationRequest(BaseModel):
    prompt: str
    width: int = Field(description="Width of the image to generate")
    height: int = Field(description="Height of the image to generate")

class TextToSpeechRequest(BaseModel):
    text: str
    voice_id: str = "nPczCjzI2devNBz1zQrb"  # Default voice ID (Rachel) 