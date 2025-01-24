from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from langchain_mistralai.chat_models import ChatMistralAI
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler

# Load environment variables
load_dotenv()

app = FastAPI(title="Mon API FastAPI")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Mistral Chat Model
chat_model = ChatMistralAI(
    mistral_api_key=os.getenv("MISTRAL_API_KEY"),
    model="mistral-tiny",  # You can change this to other models like "mistral-small" or "mistral-medium"
    streaming=True,
    callbacks=[StreamingStdOutCallbackHandler()]
)

# Initialize conversation memory
memory = ConversationBufferMemory()
conversation = ConversationChain(
    llm=chat_model,
    memory=memory,
    verbose=True
)

class ChatMessage(BaseModel):
    message: str

@app.get("/")
async def read_root():
    return {"message": "Bienvenue sur l'API FastAPI!"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.post("/chat")
async def chat_endpoint(chat_message: ChatMessage):
    try:
        # Get response from the model
        response = conversation.predict(input=chat_message.message)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True) 