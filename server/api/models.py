from pydantic import BaseModel, Field, validator
from typing import List, Optional
from core.constants import GameConfig

class Choice(BaseModel):
    id: int
    text: str = Field(description="The text of the choice.")

class StorySegmentBase(BaseModel):
    """Base model for story segments with common validation logic"""
    story_text: str = Field(description="The story text. No more than 15 words THIS IS MANDATORY.  Never mention story beat or radiation level directly. ")
    is_victory: bool = Field(description="Whether this segment ends in Sarah's victory", default=False)
    is_death: bool = Field(description="Whether this segment ends in Sarah's death", default=False)

# Existing response models for story generation steps - preserved for API compatibility
class StoryTextResponse(StorySegmentBase):
    pass

class StoryPromptsResponse(BaseModel):
    image_prompts: List[str] = Field(
        description="List of comic panel descriptions that illustrate the key moments of the scene. Use the word 'Sarah' only when referring to her.",
        min_items=GameConfig.MIN_PANELS,
        max_items=GameConfig.MAX_PANELS
    )

class StoryMetadataResponse(BaseModel):
    radiation_increase: int = Field(
        description=f"How much radiation this segment adds (0-3)",
        ge=0,
        le=3,
        default=GameConfig.DEFAULT_RADIATION_INCREASE
    )
    is_victory: bool = Field(description="Whether this segment ends in Sarah's victory", default=False)
    is_death: bool = Field(description="Whether this segment ends in Sarah's death", default=False)
    choices: List[str] = Field(description="Either empty list for victory/death, or exactly two choices for normal progression")
    time: str = Field(description="Current in-game time in 24h format (HH:MM). Time passes realistically based on actions.")
    location: str = Field(description="Current location.")

    @validator('choices')
    def validate_choices(cls, v, values):
        is_ending = values.get('is_victory', False) or values.get('is_death', False)
        if is_ending:
            if len(v) != 0:
                raise ValueError('For victory/death, choices must be empty')
        else:
            if len(v) != 2:
                raise ValueError('For normal progression, must have exactly 2 choices')
        return v

# Complete story response combining all parts - preserved for API compatibility
class StoryResponse(StorySegmentBase):
    choices: List[Choice]
    raw_choices: List[str] = Field(description="Raw choice texts from LLM before conversion to Choice objects")
    radiation_level: int = Field(description=f"Current radiation level")
    radiation_increase: int = Field(description="How much radiation this segment adds (0-3)", ge=0, le=3, default=GameConfig.DEFAULT_RADIATION_INCREASE)
    time: str = Field(description="Current in-game time in 24h format (HH:MM). Time passes realistically based on actions.")
    location: str = Field(description="Current location.")
    is_first_step: bool = Field(description="Whether this is the first step of the story", default=False)
    image_prompts: List[str] = Field(
        description="List of comic panel descriptions that illustrate the key moments of the scene. Use the word 'Sarah' only when referring to her.",
        min_items=GameConfig.MIN_PANELS,
        max_items=GameConfig.MAX_PANELS
    )

    @validator('choices')
    def validate_choices(cls, v, values):
        is_ending = values.get('is_victory', False) or values.get('is_death', False)
        if is_ending:
            if len(v) != 0:
                raise ValueError('For victory/death, choices must be empty')
        else:
            if len(v) != 2:
                raise ValueError('For normal progression, must have exactly 2 choices')
        return v

# Keep existing models unchanged for compatibility
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

class UniverseResponse(BaseModel):
    status: str
    session_id: str
    style: str
    genre: str
    epoch: str
    base_story: str = Field(description="The generated story for this universe")
