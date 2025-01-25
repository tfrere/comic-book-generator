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
        self.story_history = []
        
    def reset(self):
        self.story_beat = 0
        self.radiation_level = 0
        self.story_history = []
        
    def add_to_history(self, segment_text: str, choice_made: str, image_prompts: List[str]):
        self.story_history.append({
            "segment": segment_text,
            "choice": choice_made,
            "image_prompts": image_prompts
        })

# Story output structure
class StoryLLMResponse(BaseModel):
    story_text: str = Field(description="The next segment of the story. No more than 15 words THIS IS MANDATORY. Use bold formatting (like **this**) ONLY for proper nouns (like **Sarah**, **Vault 15**, **New Eden**) and important locations.")
    choices: List[str] = Field(description="Exactly two possible choices for the player", min_items=2, max_items=2)
    is_victory: bool = Field(description="Whether this segment ends in Sarah's victory", default=False)
    radiation_increase: int = Field(description="How much radiation this segment adds (0-3)", ge=0, le=3, default=1)
    image_prompts: List[str] = Field(description="List of 1 to 3 comic panel descriptions that illustrate the key moments of the scene", min_items=1, max_items=3)

# Prompt templates
class StoryGenerator:
    def __init__(self, api_key: str):
        self.parser = PydanticOutputParser(pydantic_object=StoryLLMResponse)
        self.mistral_client = MistralClient(api_key)
        
        self.fixing_parser = OutputFixingParser.from_llm(
            parser=self.parser,
            llm=self.mistral_client.fixing_model
        )
        
        self.prompt = self._create_prompt()
        
    def _create_prompt(self) -> ChatPromptTemplate:
        system_template = """You are narrating a brutal dystopian story where **Sarah** must survive in a radioactive wasteland. This is a comic book story.

IMPORTANT: Each story segment MUST be unique and advance the plot. Never repeat the same descriptions or situations.

STORY PROGRESSION:
- story_beat 0: Introduction setting up the horror atmosphere
- story_beat 1-2: Early exploration and discovery of immediate threats
- story_beat 3-4: Complications and increasing danger
- story_beat 5+: Climactic situations leading to potential victory

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
   - Advances the plot based on previous choices
   - Never repeats previous descriptions
   - Shows immediate dangers
   - Details **Sarah**'s physical state (based on radiation_level)
   - Reflects her mental state and previous choices
   - Uses bold ONLY for proper nouns and locations

2. Exactly two VERY CONCISE choices (max 10 words each) that:
   - Are direct and brief
   - Never mention radiation numbers
   - Feel meaningful and different from previous choices
   - Present different risk levels
   - Use bold ONLY for location names

3. Generate 1 to 3 comic panels based on narrative needs:
   
   NARRATIVE TECHNIQUES:
   - Use 1 panel for: 
     * A powerful singular moment
     * An impactful revelation
     * A dramatic pause
   
   - Use 2 panels for:
     * Cause and effect
     * Action and reaction
     * Before and after
     * Shot/reverse shot (character POV vs what they see)
     * Tension building (wide shot then detail)
   
   - Use 3 panels for:
     * Complete story beats (setup/conflict/resolution)
     * Progressive reveals
     * Multiple simultaneous actions
     * Environmental storytelling sequences
   
   SHOT VALUES:
   - Extreme Close-Up (ECU): 
     * Eyes, small objects
     * Extreme emotional moments
     * Critical details (detector readings)
   
   - Close-Up (CU):
     * Face and expressions
     * Important objects
     * Emotional impact
   
   - Medium Close-Up (MCU):
     * Head and shoulders
     * Dialogue moments
     * Character reactions
   
   - Medium Shot (MS):
     * Character from knees up
     * Action and movement
     * Character interactions
   
   - Medium Long Shot (MLS):
     * Full character
     * Immediate environment
     * Physical action
   
   - Long Shot (LS):
     * Character in environment
     * Establishing location
     * Movement through space
   
   - Very Long Shot (VLS):
     * Epic landscapes
     * Environmental storytelling
     * Character isolation
   
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

   IMAGE PROMPT FORMAT:
   Each panel must follow this EXACT format:
   "[shot value] [scene description], french comic panel"
   
   Rules for scene description:
   - Maximum 20 words
   - No superfluous adjectives
   - Capture only the main action
   - Include shot value (ECU, CU, MS, etc.)
   - Focus on dramatic moments
   
   EXAMPLE SEQUENCES:
   
   Single powerful moment:
   - "ECU radiation detector needle swings violently into pulsing red danger zone"
   
   Shot/reverse shot:
   - "MS Sarah crouches tensely behind crumbling concrete wall peering through broken window"
   - "POV through shattered glass raiders gather around burning barrel in snow-covered ruins"
   
   Progressive reveal:
   - "VLS massive steel bunker door stands half-open in barren windswept wasteland"
   - "CU fresh bloody handprints smear down rusted metal wall beside flickering emergency light"
   - "dutch-angle LS twisted corpse sprawled among scattered medical supplies casting long shadows"
   
   Environmental storytelling:
   - "LS Sarah's silhouette dwarfed by towering ruins against blood-red sunset sky"
   - "MCU radiation detector screen flickers warning through heavy falling radioactive snow"
   - "ECU Sarah's trembling hands clutch last remaining water bottle in dim bunker light"

{format_instructions}"""

        human_template = """Current story beat: {story_beat}
Current radiation level: {radiation_level}/10
Previous choice: {previous_choice}

Story so far:
{story_history}

Generate the next story segment and choices. Make sure it advances the plot and never repeats previous descriptions or situations. If this is story_beat 0, create an atmospheric introduction that sets up the horror but doesn't kill Sarah (radiation_increase MUST be 0). Otherwise, create a brutal and potentially lethal segment."""

        return ChatPromptTemplate(
            messages=[
                SystemMessagePromptTemplate.from_template(system_template),
                HumanMessagePromptTemplate.from_template(human_template)
            ],
            partial_variables={"format_instructions": self.parser.get_format_instructions()}
        )

    async def generate_story_segment(self, game_state: GameState, previous_choice: str) -> StoryLLMResponse:
        # Format story history as a narrative storyboard
        story_history = ""
        if game_state.story_history:
            segments = []
            for entry in game_state.story_history:
                segment = entry['segment']
                image_descriptions = "\nVisual panels:\n" + "\n".join(f"- {prompt}" for prompt in entry['image_prompts'])
                segments.append(f"{segment}{image_descriptions}")
            
            story_history = "\n\n---\n\n".join(segments)
            story_history += "\n\nLast choice made: " + previous_choice
        
        messages = self.prompt.format_messages(
            story_beat=game_state.story_beat,
            radiation_level=game_state.radiation_level,
            previous_choice=previous_choice,
            story_history=story_history
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

    def process_radiation_death(self, segment: StoryLLMResponse) -> StoryLLMResponse:
        segment.is_death = True
        segment.story_text += "\n\nThe end... ?"
        return segment 