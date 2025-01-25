from pydantic import BaseModel, Field
from typing import List
from langchain.output_parsers import PydanticOutputParser, OutputFixingParser
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate
import os
import asyncio

# Import local modules
if os.getenv("DOCKER_ENV"):
    from server.api_clients import MistralClient
else:
    from api_clients import MistralClient

# Game constants
MAX_RADIATION = 10

class GameState:
    def __init__(self):
        self.story_beat = 0
        self.radiation_level = 0
        
    def reset(self):
        self.story_beat = 0
        self.radiation_level = 0

# Story output structure
class StorySegment(BaseModel):
    story_text: str = Field(description="The next segment of the story. No more than 15 words THIS IS MANDATORY. Use bold formatting (like **this**) ONLY for proper nouns (like **Sarah**, **Vault 15**, **New Eden**) and important locations.")
    choices: List[str] = Field(description="Exactly two possible choices for the player", min_items=2, max_items=2)
    is_victory: bool = Field(description="Whether this segment ends in Sarah's victory", default=False)
    radiation_increase: int = Field(description="How much radiation this segment adds (0-3)", ge=0, le=3, default=1)

# Prompt templates
SYSTEM_ART_PROMPT = """You are an expert in image generation prompts.
Transform the story into a short and precise prompt.

Strict format:
"color comic panel, style of Hergé, [main scene in 5-7 words], french comic panel"

Example:
"color comic panel, style of Hergé, detective running through dark alley, french comic panel"

Rules:
- Maximum 20 words to describe the scene
- No superfluous adjectives
- Capture only the main action"""

class StoryGenerator:
    def __init__(self, api_key: str):
        self.parser = PydanticOutputParser(pydantic_object=StorySegment)
        self.mistral_client = MistralClient(api_key)
        
        self.fixing_parser = OutputFixingParser.from_llm(
            parser=self.parser,
            llm=self.mistral_client.fixing_model
        )
        
        self.prompt = self._create_prompt()
        
    def _create_prompt(self) -> ChatPromptTemplate:
        system_template = """You are narrating a brutal dystopian story where **Sarah** must survive in a radioactive wasteland. This is a comic book story.

IMPORTANT: The first story beat (story_beat = 0) MUST be an introduction that sets up the horror atmosphere.

RADIATION SYSTEM:
You must set a radiation_increase value for each segment based on the environment and situation:
- 0: Completely safe area (rare, only in bunkers or heavily shielded areas)
- 1: Standard exposure (most common, for regular exploration)
- 2: Elevated risk (when near radiation sources or in contaminated areas)
- 3: Critical exposure (very rare, only in extremely dangerous situations)

IMPORTANT RULES FOR RADIATION:
- DO NOT mention radiation values in the choices
- Most segments should have radiation_increase = 1
- Use 2 or 3 only in specific dangerous areas
- Use 0 only in safe shelters
- Current radiation level: {radiation_level}/10
- Death occurs automatically when radiation reaches 10

Core story elements:
- **Sarah** is deeply traumatized by the AI uprising that killed most of humanity
- She abandoned her sister during the **Great Collapse**, leaving her to die
- She's on a mission of redemption in this hostile world
- The radiation is an invisible, constant threat
- The environment is full of dangers (raiders, AI, traps)
- Focus on survival horror and tension

IMPORTANT FORMATTING RULES:
- Use bold formatting (like **this**) ONLY for:
  * Character names (e.g., **Sarah**, **John**)
  * Location names (e.g., **Vault 15**, **New Eden**)
  * Major historical events (e.g., **Great Collapse**)
- Do NOT use bold for common nouns or regular descriptions

Each response MUST contain:
1. A detailed story segment that:
   - Describes the horrific environment
   - Shows immediate dangers
   - Details **Sarah**'s physical state (based on radiation_level)
   - Reflects her mental state and previous choices
   - Uses bold ONLY for proper nouns and locations

2. Exactly two VERY CONCISE choices (max 10 words each):
   Examples of good choices:
   - "Explore the **Medical Center**" vs "Search the **Residential Zone**"
   - "Trust the survivor from **Vault 15**" vs "Keep your distance"
   - "Use the **AI Core**" vs "Find a manual solution"
   
   Each choice must:
   - Be direct and brief
   - Never mention radiation numbers
   - Feel meaningful
   - Present different risk levels
   - Use bold ONLY for location names

{format_instructions}"""

        human_template = """Current story beat: {story_beat}
Current radiation level: {radiation_level}/10
Previous choice: {previous_choice}

Generate the next story segment and choices. If this is story_beat 0, create an atmospheric introduction that sets up the horror but doesn't kill Sarah (radiation_increase MUST be 0). Otherwise, create a brutal and potentially lethal segment."""

        return ChatPromptTemplate(
            messages=[
                SystemMessagePromptTemplate.from_template(system_template),
                HumanMessagePromptTemplate.from_template(human_template)
            ],
            partial_variables={"format_instructions": self.parser.get_format_instructions()}
        )

    async def generate_story_segment(self, game_state: GameState, previous_choice: str) -> StorySegment:
        messages = self.prompt.format_messages(
            story_beat=game_state.story_beat,
            radiation_level=game_state.radiation_level,
            previous_choice=previous_choice
        )
        
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                response_content = await self.mistral_client.generate_story(messages)
                try:
                    # Try to parse with standard parser first
                    segment = self.parser.parse(response_content)
                except Exception as parse_error:
                    print(f"Error parsing response: {str(parse_error)}")
                    print("Attempting to fix output...")
                    try:
                        # Try with fixing parser
                        segment = self.fixing_parser.parse(response_content)
                    except Exception as fix_error:
                        print(f"Error fixing output: {str(fix_error)}")
                        retry_count += 1
                        if retry_count < max_retries:
                            print(f"Retrying generation (attempt {retry_count + 1}/{max_retries})...")
                            await asyncio.sleep(2 * retry_count)  # Exponential backoff
                            continue
                        raise fix_error
                
                # If we get here, parsing succeeded
                if game_state.story_beat == 0:
                    segment.radiation_increase = 0
                return segment
                
            except Exception as e:
                print(f"Error in story generation: {str(e)}")
                retry_count += 1
                if retry_count < max_retries:
                    print(f"Retrying generation (attempt {retry_count + 1}/{max_retries})...")
                    await asyncio.sleep(2 * retry_count)  # Exponential backoff
                    continue
                raise e
        
        raise Exception(f"Failed to generate valid story segment after {max_retries} attempts")

    async def transform_story_to_art_prompt(self, story_text: str) -> str:
        return await self.mistral_client.transform_prompt(story_text, SYSTEM_ART_PROMPT)

    def process_radiation_death(self, segment: StorySegment) -> StorySegment:
        segment.is_death = True
        segment.story_text += "\n\nThe end... ?"
        return segment 