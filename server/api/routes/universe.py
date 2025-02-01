from fastapi import APIRouter, HTTPException
import uuid
from typing import Dict, Any, List
from pydantic import BaseModel, Field

from core.generators.universe_generator import UniverseGenerator
from core.story_generator import StoryGenerator
from core.session_manager import SessionManager
from api.models import UniverseResponse

class StyleReference(BaseModel):
    artist: str
    works: List[str]

class UniverseStyle(BaseModel):
    name: str
    description: str
    references: List[StyleReference]

class UniverseStylesResponse(BaseModel):
    styles: List[UniverseStyle]
    genres: List[str]
    epochs: List[str]
    macguffins: List[str]
    hero: List[str]

class UniverseResponse(BaseModel):
    status: str
    session_id: str
    style: Dict[str, Any]  # Changed from str to Dict to include the full style object
    genre: str
    epoch: str
    base_story: str = Field(description="The generated story for this universe")
    macguffin: str = Field(description="The MacGuffin for this universe")
    hero_name: str = Field(description="The name of the hero")
    hero_description: str = Field(description="The full description of the hero")

def get_universe_router(session_manager: SessionManager, story_generator: StoryGenerator) -> APIRouter:
    router = APIRouter()
    universe_generator = UniverseGenerator(story_generator.mistral_client)
    
    @router.get("/universe/styles", response_model=UniverseStylesResponse)
    async def get_universe_styles() -> UniverseStylesResponse:
        """Get all available universe styles and options."""
        try:
            styles_data = universe_generator.styles_data
            return UniverseStylesResponse(**styles_data)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=str(e)
            )

    @router.post("/universe/generate", response_model=UniverseResponse)
    async def generate_universe() -> UniverseResponse:
        try:
            print("Starting universe generation...")
            
            # Get random elements and generate universe
            universe, style, genre, epoch, macguffin, hero_name, hero_desc = await universe_generator.generate()
            print(f"Generated random elements: style={style['name']}, genre={genre}, epoch={epoch}, macguffin={macguffin}, hero={hero_name}")
            
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
                macguffin=macguffin,
                hero_name=hero_name,
                hero_desc=hero_desc
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
                style=style,
                genre=genre,
                epoch=epoch,
                base_story=universe,
                macguffin=macguffin,
                hero_name=hero_name,
                hero_description=hero_desc
            )
            
        except Exception as e:
            print(f"Error in generate_universe: {str(e)}")  # Add debug logging
            raise HTTPException(
                status_code=500,
                detail=str(e)
            )
    
    return router 