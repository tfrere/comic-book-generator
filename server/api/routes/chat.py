from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import traceback

from core.session_manager import SessionManager
from core.constants import GameConfig
from api.models import ChatMessage, StoryResponse, Choice

router = APIRouter()

def get_chat_router(session_manager: SessionManager, story_generator):
    @router.post("/chat", response_model=StoryResponse)
    async def chat_endpoint(
        chat_message: ChatMessage,
        x_session_id: Optional[str] = Header(None)
    ):
        try:
            if not x_session_id:
                raise HTTPException(status_code=400, detail="Session ID is required")

            print(f"Processing chat message for session {x_session_id}:", chat_message)
            
            # Get game state for this session
            game_state = session_manager.get_session(x_session_id)
            print(f"Retrieved game state for session {x_session_id}: {'found' if game_state else 'not found'}")
            
            if game_state is None:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid session ID. Generate a universe first to start a new game session."
                )
                
            # Vérifier que l'univers est configuré
            has_universe = game_state.has_universe()
            print(f"Universe configured for session {x_session_id}: {has_universe}")
            print(f"Universe details: style={game_state.universe_style}, genre={game_state.universe_genre}, epoch={game_state.universe_epoch}")
            
            if not has_universe:
                raise HTTPException(
                    status_code=400,
                    detail="Universe not configured for this session. Generate a universe first."
                )
            
            # Handle restart
            if chat_message.message.lower() == "restart":
                print(f"Handling restart for session {x_session_id}")
                # On garde le même univers mais on réinitialise l'histoire
                game_state.reset()
                game_state.set_universe(
                    style=game_state.universe_style,
                    genre=game_state.universe_genre,
                    epoch=game_state.universe_epoch,
                    base_story=game_state.universe_story
                )
                previous_choice = "none"
            else:
                previous_choice = f"Choice {chat_message.choice_id}" if chat_message.choice_id else "none"

            # Generate story segment
            llm_response = await story_generator.generate_story_segment(
                session_id=x_session_id,
                game_state=game_state,
                previous_choice=previous_choice
            )
            
            # Update radiation level
            game_state.radiation_level += llm_response.radiation_increase
            
            # Check for radiation death
            is_death = game_state.radiation_level >= GameConfig.MAX_RADIATION
            if is_death:
                llm_response.choices = []
                llm_response.story_text += "\You have succumbed to the harsh wastelands, and your journey concludes here. THE END."
                if len(llm_response.image_prompts) > 1:
                    llm_response.image_prompts = [llm_response.image_prompts[0]]

            # Add segment to history
            game_state.add_to_history(
                llm_response.story_text,
                previous_choice,
                llm_response.image_prompts,
                llm_response.time,
                llm_response.location
            )

            # Pour la première étape, on ne garde qu'un seul prompt d'image
            if game_state.story_beat == 0 and len(llm_response.image_prompts) > 1:
                llm_response.image_prompts = [llm_response.image_prompts[0]]
            
            # Prepare response
            response = StoryResponse(
                story_text=llm_response.story_text,
                choices=llm_response.choices,
                raw_choices=llm_response.raw_choices,
                radiation_level=game_state.radiation_level,
                radiation_increase=llm_response.radiation_increase,
                time=llm_response.time,
                location=llm_response.location,
                is_victory=llm_response.is_victory,
                is_death=is_death,
                is_first_step=game_state.story_beat == 0,
                image_prompts=llm_response.image_prompts
            )
            
            # Only increment story beat if not dead and not victory
            if not is_death and not llm_response.is_victory:
                game_state.story_beat += 1
                
            return response

        except Exception as e:
            print(f"Error in chat_endpoint: {str(e)}")
            print("Traceback:", traceback.format_exc())
            raise HTTPException(status_code=500, detail=str(e))
    
    return router 