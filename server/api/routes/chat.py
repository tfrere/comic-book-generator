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
                # Pour les choix personnalisés, on les traite immédiatement
                if chat_message.message == "custom_choice" and chat_message.custom_text:
                    previous_choice = chat_message.custom_text
                    # On crée un StoryResponse pour le choix personnalisé
                    custom_choice_response = StoryResponse(
                        story_text=f"You decide to: {chat_message.custom_text}",
                        choices=[
                            Choice(id=1, text="Continue..."),  # Choix fictif pour validation
                            Choice(id=2, text="Continue...")
                        ],
                        raw_choices=["Continue...", "Continue..."],
                        time=game_state.current_time,
                        location=game_state.current_location,
                        image_prompts=["Character making a custom choice"],  # Prompt fictif pour validation
                        is_first_step=False,
                        is_death=False,
                        is_victory=False,
                        previous_choice=previous_choice
                    )
                    game_state.add_to_history(custom_choice_response)
                else:
                    # Si un choix a été fait, récupérer le texte du choix à partir de l'historique
                    if chat_message.choice_id and len(game_state.story_history) > 0:
                        last_story = game_state.story_history[-1]
                        choice_index = chat_message.choice_id - 1
                        if 0 <= choice_index < len(last_story.choices):
                            previous_choice = last_story.choices[choice_index].text
                        else:
                            previous_choice = "none"
                    else:
                        previous_choice = "none"

            # Generate story segment
            response = await story_generator.generate_story_segment(
                session_id=x_session_id,
                game_state=game_state,
                previous_choice=previous_choice
            )

            # Pour la première étape, on ne garde qu'un seul prompt d'image
            if game_state.story_beat == 0 and len(response.image_prompts) > 1:
                response.image_prompts = [response.image_prompts[0]]
            
            # Increment story beat
            game_state.story_beat += 1
                
            return response

        except Exception as e:
            print(f"Error in chat_endpoint: {str(e)}")
            print("Traceback:", traceback.format_exc())
            raise HTTPException(status_code=500, detail=str(e))
    
    return router 