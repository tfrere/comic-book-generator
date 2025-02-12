from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any, Union
from core.constants import GameConfig
import re
from enum import Enum

class Choice(BaseModel):
    id: int
    text: str = Field(description="The text of the choice.")

class StorySegmentResponse(BaseModel):
    story_text: str = Field(description="The story text. No more than 30 words.")

    def validate_story_text_length(cls, v):
        words = v.split()
        if len(words) > 40:
            raise ValueError('Story text must not exceed 30 words')
        return v

class StoryPromptsResponse(BaseModel):
    image_prompts: List[str] = Field(
        description="List of comic panel descriptions that illustrate the key moments of the scene. Use the word 'hero' only when referring to her.",
        min_items=GameConfig.MIN_PANELS,
        max_items=GameConfig.MAX_PANELS
    )

class StoryMetadataResponse(BaseModel):
    choices: List[str] = Field(description="List of choices for story progression")
    time: str = Field(description="Current in-game time in 24h format (HH:MM). Time passes realistically based on actions.")
    location: str = Field(description="Current location.")
    is_death: bool = Field(description="Whether this segment ends in hero's death", default=False)
    is_victory: bool = Field(description="Whether this segment ends in hero's victory", default=False)

    @validator('choices')
    def validate_choices(cls, v):
        if len(v) != 2:
            raise ValueError('Must have exactly 2 choices for story progression')
        return v

# Keep existing models unchanged for compatibility
class ChatMessage(BaseModel):
    message: str
    choice_id: Optional[int] = None
    custom_text: Optional[str] = None  # Pour le choix personnalisé

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
    macguffin: str = Field(description="The macguffin for this universe")


# Complete story response combining all parts - preserved for API compatibility
class StoryResponse(BaseModel):
    previous_choice: str = Field(description="The previous choice made by the player")
    story_text: str = Field(description="The story text. No more than 15 words THIS IS MANDATORY.  Never mention story beat directly. ")
    choices: List[Choice]
    raw_choices: List[str] = Field(description="Raw choice texts from LLM before conversion to Choice objects")
    time: str = Field(description="Current in-game time in 24h format (HH:MM). Time passes realistically based on actions.")
    location: str = Field(description="Current location.")
    is_first_step: bool = Field(description="Whether this is the first step of the story", default=False)
    is_victory: bool = Field(description="Whether this segment ends in hero's victory", default=False)
    is_death: bool = Field(description="Whether this segment ends in hero's death", default=False)
    image_prompts: List[str] = Field(
        description="List of comic panel descriptions that illustrate the key moments of the scene.",
        min_items=GameConfig.MIN_PANELS,
        max_items=GameConfig.MAX_PANELS
    )

    @validator('choices')
    def validate_choices(cls, v):
        if len(v) != 2:
            raise ValueError('Must have exactly 2 choices for story progression')
        return v

class ServiceStatus(str, Enum):
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    INITIALIZING = "initializing"

class HealthCheckResponse(BaseModel):
    status: ServiceStatus
    service: str
    latency: Optional[float] = None
    error: Optional[str] = None
