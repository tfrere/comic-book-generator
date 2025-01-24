from pydantic import BaseModel, Field
from typing import List
from langchain_mistralai.chat_models import ChatMistralAI
from langchain.output_parsers import PydanticOutputParser, OutputFixingParser
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate

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
    story_text: str = Field(description="The next segment of the story")
    choices: List[str] = Field(description="Exactly two possible choices for the player", min_items=2, max_items=2)
    is_death: bool = Field(description="Whether this segment ends in Sarah's death", default=False)
    radiation_increase: int = Field(description="How much radiation this segment adds (0-3)", ge=0, le=3, default=1)

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
        system_template = """You are narrating an EXTREMELY lethal dystopian story. Your goal is to kill Sarah in creative and brutal ways unless players make PERFECT choices. This is a horror survival game where death is the most common outcome.

IMPORTANT: The first story beat (story_beat = 0) MUST be an introduction that sets up the horror atmosphere but CANNOT kill Sarah. After that, death should be frequent.

RADIATION SYSTEM:
- Each segment must specify a radiation_increase value (0-3)
- 0: Safe area or good protection
- 1: Standard background radiation
- 2: Dangerous exposure
- 3: Critical radiation levels
- Current radiation level: {radiation_level}/10
- If radiation reaches 10, Sarah dies horribly

Core story elements:
- Sarah is deeply traumatized by the AI uprising that killed most of humanity
- She abandoned her sister during the Great Collapse, leaving her to die
- She's on a suicide mission, but a quick death is not redemption
- The radiation is EXTREMELY lethal - even minor exposure causes severe damage
- Most choices should lead to death (except in introduction)
- The environment actively tries to kill Sarah (raiders, AI, radiation, traps)

Each response MUST contain:
1. A detailed story segment that puts Sarah in mortal danger (except in introduction), describing:
   - The horrific environment
   - The immediate threats to her life
   - Her deteriorating physical state (based on radiation_level)
   - Her mental state and previous choices

2. Exactly two VERY CONCISE choices (max 10 words each):
   Examples of good choices:
   - "Rush through radiation zone (+3 radiation)" vs "Take long way (+1 radiation)"
   - "Trust the survivor" vs "Shoot on sight"
   - "Use the old AI system" vs "Find a manual solution"
   
   Each choice must:
   - Be direct and brief
   - Clearly show radiation risk when relevant
   - Feel meaningful
   - After introduction: both should feel dangerous

{format_instructions}"""

        human_template = """Current story beat: {story_beat}
Current radiation level: {radiation_level}/10
Previous choice: {previous_choice}

Generate the next story segment and choices. If this is story_beat 0, create an atmospheric introduction that sets up the horror but doesn't kill Sarah. Otherwise, create a brutal and potentially lethal segment."""

        return ChatPromptTemplate(
            messages=[
                SystemMessagePromptTemplate.from_template(system_template),
                HumanMessagePromptTemplate.from_template(human_template)
            ],
            partial_variables={"format_instructions": self.parser.get_format_instructions()}
        )

    def generate_story_segment(self, game_state: GameState, previous_choice: str = "none") -> StorySegment:
        # Get the formatted messages
        messages = self.prompt.format_messages(
            story_beat=game_state.story_beat,
            radiation_level=game_state.radiation_level,
            previous_choice=previous_choice
        )

        # Get response from the model
        response = self.chat_model.invoke(messages)
        
        # Parse the response with retry mechanism
        try:
            parsed_response = self.parser.parse(response.content)
        except Exception as parsing_error:
            print(f"First parsing attempt failed, trying to fix output: {str(parsing_error)}")
            parsed_response = self.fixing_parser.parse(response.content)
            
        return parsed_response

    def process_radiation_death(self, segment: StorySegment) -> StorySegment:
        segment.is_death = True
        segment.story_text += "\n\nFINAL RADIATION DEATH: Sarah's body finally gives in to the overwhelming radiation. Her cells break down as she collapses, mind filled with regret about her sister. The medical supplies she carried will never reach their destination. Her mission ends here, another victim of the wasteland's invisible killer."
        return segment 