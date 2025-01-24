from pydantic import BaseModel, Field
from typing import List
from langchain_mistralai.chat_models import ChatMistralAI
from langchain.output_parsers import PydanticOutputParser, OutputFixingParser
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate
from langchain.schema import HumanMessage, SystemMessage

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
    story_text: str = Field(description="The next segment of the story. Like 20 words.")
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

HUMAN_ART_PROMPT = "Transform into a short prompt: {story_text}"

class StoryGenerator:
    def __init__(self, api_key: str):
        self.parser = PydanticOutputParser(pydantic_object=StorySegment)
        self.fixing_parser = OutputFixingParser.from_llm(
            parser=self.parser,
            llm=ChatMistralAI(
                mistral_api_key=api_key,
                model="mistral-small",
                temperature=0.1
            )
        )
        
        self.chat_model = ChatMistralAI(
            mistral_api_key=api_key,
            model="mistral-small",
            temperature=0.7
        )
        
        self.prompt = self._create_prompt()
        
    def _create_prompt(self) -> ChatPromptTemplate:
        system_template = """You are narrating a brutal dystopian story where Sarah must survive in a radioactive wasteland. This is a comic book story.

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
- Sarah is deeply traumatized by the AI uprising that killed most of humanity
- She abandoned her sister during the Great Collapse, leaving her to die
- She's on a mission of redemption in this hostile world
- The radiation is an invisible, constant threat
- The environment is full of dangers (raiders, AI, traps)
- Focus on survival horror and tension

Each response MUST contain:
1. A detailed story segment that:
   - Describes the horrific environment
   - Shows immediate dangers
   - Details Sarah's physical state (based on radiation_level)
   - Reflects her mental state and previous choices

2. Exactly two VERY CONCISE choices (max 10 words each):
   Examples of good choices:
   - "Explore the abandoned hospital" vs "Search the residential area"
   - "Trust the survivor" vs "Keep your distance"
   - "Use the old AI system" vs "Find a manual solution"
   
   Each choice must:
   - Be direct and brief
   - Never mention radiation numbers
   - Feel meaningful
   - Present different risk levels

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

    def generate_story_segment(self, game_state: GameState, previous_choice: str) -> StorySegment:
        messages = self.prompt.format_messages(
            story_beat=game_state.story_beat,
            radiation_level=game_state.radiation_level,
            previous_choice=previous_choice
        )
        
        response = self.chat_model.invoke(messages)
        
        try:
            segment = self.parser.parse(response.content)
            # Force radiation_increase to 0 for the first story beat
            if game_state.story_beat == 0:
                segment.radiation_increase = 0
            return segment
        except Exception as e:
            print(f"Error parsing response: {str(e)}")
            print("Attempting to fix output...")
            segment = self.fixing_parser.parse(response.content)
            # Force radiation_increase to 0 for the first story beat
            if game_state.story_beat == 0:
                segment.radiation_increase = 0
            return segment

    async def transform_story_to_art_prompt(self, story_text: str) -> str:
        try:
            messages = [
                SystemMessage(content=SYSTEM_ART_PROMPT),
                HumanMessage(content=HUMAN_ART_PROMPT.format(story_text=story_text))
            ]

            response = self.chat_model.invoke(messages)
            return response.content

        except Exception as e:
            print(f"Error transforming prompt: {str(e)}")
            return story_text

    def process_radiation_death(self, segment: StorySegment) -> StorySegment:
        segment.is_death = True
        segment.story_text += "\n\nThe end... ?"
        return segment 