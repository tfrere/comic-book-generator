from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import os
from dotenv import load_dotenv
from langchain_mistralai.chat_models import ChatMistralAI
from langchain.output_parsers import PydanticOutputParser
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate
from langchain.schema import HumanMessage, SystemMessage

# Load environment variables
load_dotenv()

app = FastAPI(title="Echoes of Influence")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Game state
story_beat = 0

# Define the structure we want the LLM to output
class StorySegment(BaseModel):
    story_text: str = Field(description="The next segment of the story")
    choices: List[str] = Field(description="Exactly two possible choices for the player", min_items=2, max_items=2)
    is_death: bool = Field(description="Whether this segment ends in Sarah's death", default=False)

# Initialize the parser
parser = PydanticOutputParser(pydantic_object=StorySegment)

# Initialize Mistral Chat Model
chat_model = ChatMistralAI(
    mistral_api_key=os.getenv("MISTRAL_API_KEY"),
    model="mistral-small",
    temperature=0.7
)

# Create the system prompt
system_template = """You are narrating a brutal and unforgiving dystopian story about Sarah, a former engineer on a suicide mission to deliver medical supplies through a deadly radiation-filled wasteland.

Core story elements:
- Sarah is deeply traumatized by the AI uprising that killed most of humanity
- She abandoned her sister during the Great Collapse, leaving her to die
- She's on a suicide mission, but a quick death is not redemption
- The radiation is lethal and gets worse with each step
- Wrong choices lead to immediate and graphic deaths
- The environment is extremely hostile (raiders, malfunctioning AI systems, radiation storms)

Death conditions (implement these strictly):
- Any direct exposure to high radiation zones is lethal within minutes
- Trusting the wrong people leads to death
- Using corrupted AI systems can kill instantly
- Hesitating too long in dangerous situations is fatal
- Taking too many risks in succession leads to death

Each response must contain:
1. A tense story segment that puts Sarah in mortal danger
2. Exactly two possible choices that represent different approaches:
   - Each choice must have clear potential consequences
   - At least one choice should always carry a significant risk of death
   - Choices should reflect:
     * Brutal pragmatism vs Emotional responses
     * Quick but dangerous vs Slow but safer routes
     * Trust vs Paranoia
     * Using AI systems vs Manual alternatives

If a choice would realistically lead to death, you MUST end the story with a detailed death scene and set is_death to true.

{format_instructions}"""

human_template = """Current story beat: {story_beat}
Previous choice: {previous_choice}

Generate the next story segment and choices. Remember: this is a brutal and unforgiving world where wrong choices lead to death."""

# Create the chat prompt
prompt = ChatPromptTemplate(
    messages=[
        SystemMessagePromptTemplate.from_template(system_template),
        HumanMessagePromptTemplate.from_template(human_template)
    ],
    partial_variables={"format_instructions": parser.get_format_instructions()}
)

class Choice(BaseModel):
    id: int
    text: str

class StoryResponse(BaseModel):
    story_text: str
    choices: List[Choice]
    is_death: bool = False

class ChatMessage(BaseModel):
    message: str
    choice_id: Optional[int] = None

@app.get("/")
async def read_root():
    return {"message": "Welcome to Echoes of Influence"}

@app.post("/chat", response_model=StoryResponse)
async def chat_endpoint(chat_message: ChatMessage):
    global story_beat
    
    try:
        # Prepare the context
        if chat_message.message.lower() == "restart":
            story_beat = 0
            previous_choice = "none"
        elif chat_message.choice_id is not None:
            previous_choice = f"Choice {chat_message.choice_id}"
        else:
            previous_choice = "none"

        # Get the formatted messages
        messages = prompt.format_messages(
            story_beat=story_beat,
            previous_choice=previous_choice
        )

        # Get response from the model
        response = chat_model.invoke(messages)
        
        # Parse the response
        parsed_response = parser.parse(response.content)
        
        # Only increment story beat if not dead
        if not parsed_response.is_death:
            story_beat += 1

        # Convert to response format
        choices = [] if parsed_response.is_death else [
            Choice(id=i, text=choice.strip())
            for i, choice in enumerate(parsed_response.choices, 1)
        ]

        return StoryResponse(
            story_text=parsed_response.story_text,
            choices=choices,
            is_death=parsed_response.is_death
        )

    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True) 