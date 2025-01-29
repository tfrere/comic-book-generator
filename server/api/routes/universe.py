from fastapi import APIRouter, HTTPException
import uuid

from core.generators.universe_generator import UniverseGenerator
from core.story_generator import StoryGenerator
from core.session_manager import SessionManager
from api.models import UniverseResponse
from pydantic import BaseModel, Field

class UniverseResponse(BaseModel):
    status: str
    session_id: str
    style: str
    genre: str
    epoch: str
    base_story: str = Field(description="The generated story for this universe")
    macguffin: str = Field(description="The MacGuffin for this universe")

def get_universe_router(session_manager: SessionManager, story_generator: StoryGenerator) -> APIRouter:
    router = APIRouter()
    universe_generator = UniverseGenerator(story_generator.mistral_client)
    
    @router.post("/universe/generate", response_model=UniverseResponse)
    async def generate_universe() -> UniverseResponse:
        try:
            print("Starting universe generation...")
            
            # Get random elements before generation
            style, genre, epoch, macguffin = universe_generator._get_random_elements()
            print(f"Generated random elements: style={style['name']}, genre={genre}, epoch={epoch}, macguffin={macguffin}")
            
            universe = await universe_generator.generate()
            print("Generated universe story")
            
            # Générer un ID de session unique
            session_id = str(uuid.uuid4())
            print(f"Generated session ID: {session_id}")
            
            # Créer une nouvelle session et configurer l'univers
            game_state = session_manager.create_session(session_id)
            print("Created new game state")
            
            game_state.set_universe(
                style=style["name"],
                genre=genre,
                epoch=epoch,
                base_story=universe
            )
            print("Configured universe in game state")
            
            # Créer le TextGenerator pour cette session
            story_generator.create_segment_generator(
                session_id=session_id,
                style=style,
                genre=genre,
                epoch=epoch,
                base_story=universe,
                macguffin=macguffin
            )
            print("Created text generator for session")
            
            # Vérifier que tout est bien configuré
            if not game_state.has_universe():
                raise ValueError("Universe was not properly configured in game state")
                
            if session_id not in story_generator.segment_generators:
                raise ValueError("StorySegmentGenerator was not properly created")
            
            print("All components configured successfully")
            
            return UniverseResponse(
                status="ok",
                session_id=session_id,
                style=style["name"],
                genre=genre,
                epoch=epoch,
                base_story=universe,
                macguffin=macguffin
            )
            
        except Exception as e:
            print(f"Error in generate_universe: {str(e)}")  # Add debug logging
            raise HTTPException(
                status_code=500,
                detail=str(e)
            )
    
    return router 