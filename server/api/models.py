from pydantic import BaseModel, Field
from typing import List, Optional

class Choice(BaseModel):
    id: int
    text: str = Field(description="The text of the choice. No more than 6 words.")

# New response models for story generation steps
class StoryTextResponse(BaseModel):
    story_text: str = Field(description="The story text. No more than 15 words.")

class StoryPromptsResponse(BaseModel):
    image_prompts: List[str] = Field(description="List of 2 to 4 comic panel descriptions that illustrate the key moments of the scene. Use the word 'Sarah' only when referring to her.", min_items=1, max_items=4)

class StoryMetadataResponse(BaseModel):
    choices: List[str] = Field(description="Exactly two possible choices for the player", min_items=2, max_items=2)
    is_victory: bool = Field(description="Whether this segment ends in Sarah's victory", default=False)
    radiation_increase: int = Field(description="How much radiation this segment adds (0-3)", ge=0, le=3, default=1)
    is_last_step: bool = Field(description="Whether this is the last step (victory or death)", default=False)
    time: str = Field(description="Current in-game time in 24h format (HH:MM). Time passes realistically based on actions.")
    location: str = Field(description="Current location.")

# Complete story response combining all parts
class StoryResponse(BaseModel):
    story_text: str = Field(description="The story text. No more than 15 words.")
    choices: List[Choice]
    radiation_level: int = Field(description="Current radiation level from 0 to 10")
    is_victory: bool = Field(description="Whether this segment ends in Sarah's victory", default=False)
    is_first_step: bool = Field(description="Whether this is the first step of the story", default=False)
    is_last_step: bool = Field(description="Whether this is the last step (victory or death)", default=False)
    image_prompts: List[str] = Field(description="List of 2 to 4 comic panel descriptions that illustrate the key moments of the scene. Use the word 'Sarah' only when referring to her.", min_items=1, max_items=4)

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