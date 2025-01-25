from pydantic import BaseModel, Field
from typing import List
from langchain.output_parsers import PydanticOutputParser, OutputFixingParser
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate
import os
import asyncio
from .prompts.system_prompt import SYSTEM_PROMPT
from .prompts.cinematic_system_prompt import CINEMATIC_SYSTEM_PROMPT

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
    story_text: str = Field(description="The next segment of the story. No more than 12 words THIS IS MANDATORY. Use bold formatting (like **this**) ONLY for proper nouns (like **Sarah**, **hospital**) and important locations.")
    choices: List[str] = Field(description="Exactly two possible choices for the player", min_items=2, max_items=2)
    is_victory: bool = Field(description="Whether this segment ends in Sarah's victory", default=False)
    radiation_increase: int = Field(description="How much radiation this segment adds (0-3)", ge=0, le=3, default=1)
    image_prompts: List[str] = Field(description="List of 1 to 3 comic panel descriptions that illustrate the key moments of the scene", min_items=1, max_items=3)
    is_last_step: bool = Field(description="Whether this is the last step (victory or death)", default=False)



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
        system_template = """
        {SYSTEM_PROMPT}
        {ART_SYSTEM_PROMPT}
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
            story_history=story_history,
            SYSTEM_PROMPT=SYSTEM_PROMPT,
            ART_SYSTEM_PROMPT=CINEMATIC_SYSTEM_PROMPT
        )
        
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                response_content = await self.mistral_client.generate_story(messages)
                try:
                    # Try to parse with standard parser first
                    segment = self.parser.parse(response_content)
                    
                    # Check if this is a victory or death (radiation) step
                    is_death = game_state.radiation_level + segment.radiation_increase >= MAX_RADIATION
                    if is_death or segment.is_victory:
                        segment.is_last_step = True
                        # Force only one image prompt for victory/death scenes
                        if len(segment.image_prompts) > 1:
                            segment.image_prompts = [segment.image_prompts[0]]
                    
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
                    segment.is_last_step = False
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
        return await self.mistral_client.transform_prompt(story_text, CINEMATIC_SYSTEM_PROMPT)

    def process_radiation_death(self, segment: StoryLLMResponse) -> StoryLLMResponse:
        segment.is_death = True
        segment.story_text += "\n\nThe end... ?"
        return segment 