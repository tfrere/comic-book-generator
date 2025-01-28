import asyncio
import os
import sys
import time
import argparse
from pathlib import Path
from dotenv import load_dotenv
import uuid

# Add server directory to PYTHONPATH
server_dir = Path(__file__).parent.parent
sys.path.append(str(server_dir))

from core.game_logic import GameState, StoryGenerator
from core.constants import GameConfig
from core.generators.universe_generator import UniverseGenerator

# Load environment variables
load_dotenv()

def parse_args():
    parser = argparse.ArgumentParser(description="Test the game's story generation")
    parser.add_argument('--show-context', action='store_true', help='Show the full context at each step')
    return parser.parse_args()

def print_separator(char="=", length=50):
    print(f"\n{char * length}\n")

def print_universe_info(style: str, genre: str, epoch: str, base_story: str):
    print_separator("*")
    print("🌍 UNIVERSE GENERATED")
    print(f"🎨 Style: {style}")
    print(f"📚 Genre: {genre}")
    print(f"⏳ Époque: {epoch}")
    print("\n📖 Base Story:")
    print(base_story)
    print_separator("*")

def print_story_step(step_number, radiation_level, story_text, image_prompts, generation_time: float, story_history: str = None, show_context: bool = False, model_name: str = None, is_death: bool = False, is_victory: bool = False):
    print_separator("=")
    print(f"📖 STEP {step_number}")
    print(f"☢️  Radiation level: {radiation_level}/{GameConfig.MAX_RADIATION}")
    print(f"⏱️  Generation time: {generation_time:.2f}s (model: {model_name})")
    print(f"💀 Death: {is_death}")
    print(f"🏆 Victory: {is_victory}")
    
    if show_context and story_history:
        print_separator("-")
        print("📚 FULL CONTEXT:")
        print(story_history)
    
    print_separator("-")
    print("📜 STORY:")
    print(story_text)
    print_separator("-")
    print("🎬 STORYBOARD:")
    for i, prompt in enumerate(image_prompts, 1):
        print(f"\nPanel {i}:")
        print(f"  {prompt}")
    print_separator("=")

async def play_game(show_context: bool = False):
    # Initialize components
    model_name = "mistral-small"
    story_generator = StoryGenerator(
        api_key=os.getenv("MISTRAL_API_KEY"),
        model_name=model_name
    )
    
    # Create universe generator
    universe_generator = UniverseGenerator(story_generator.mistral_client)
    
    print("\n=== Don't Look Up - Test Mode ===\n")
    print("🎮 Starting adventure...")
    if show_context:
        print("📚 Context display is enabled")
    print_separator()
    
    # Generate universe
    print("🌍 Generating universe...")
    style, genre, epoch = universe_generator._get_random_elements()
    universe = await universe_generator.generate()
    
    # Create session and game state
    session_id = str(uuid.uuid4())
    game_state = GameState()
    game_state.set_universe(
        style=style["name"],
        genre=genre,
        epoch=epoch,
        base_story=universe
    )
    
    # Create text generator for this session
    story_generator.create_text_generator(
        session_id=session_id,
        style=style["name"],
        genre=genre,
        epoch=epoch,
        base_story=universe
    )
    
    # Display universe information
    print_universe_info(style["name"], genre, epoch, universe)
    
    last_choice = None
    
    while True:
        # Generate story segment
        previous_choice = "none" if game_state.story_beat == 0 else f"Choice {last_choice}"
        
        # Format story history for context
        story_history = ""
        if game_state.story_history:
            segments = []
            for entry in game_state.story_history:
                segment = entry['segment']
                time_location = f"[{entry['time']} - {entry['location']}]"
                image_descriptions = "\nVisual panels:\n" + "\n".join(f"- {prompt}" for prompt in entry['image_prompts'])
                segments.append(f"{time_location}\n{segment}{image_descriptions}")
            
            story_history = "\n\n---\n\n".join(segments)
            story_history += "\n\nLast choice made: " + previous_choice
        
        # Mesurer le temps de génération
        start_time = time.time()
        response = await story_generator.generate_story_segment(
            session_id=session_id,
            game_state=game_state,
            previous_choice=previous_choice
        )
        generation_time = time.time() - start_time
        
        # Display current step
        print_story_step(
            game_state.story_beat,
            game_state.radiation_level,
            response.story_text,
            response.image_prompts,
            generation_time,
            story_history,
            show_context,
            model_name,
            response.is_death,
            response.is_victory
        )
        
        # Check for radiation death
        if game_state.radiation_level >= GameConfig.MAX_RADIATION:
            print("\n☢️  GAME OVER - Death by radiation ☢️")
            print("Sarah has succumbed to the toxic radiation...")
            break
            
        # Check for victory
        if response.is_victory:
            print("\n🏆 VICTORY! 🏆")
            print("Sarah has survived and completed her mission!")
            break
            
        # Display choices
        if response.choices:
            print("\n🤔 AVAILABLE CHOICES:")
            for i, choice in enumerate(response.choices, 1):
                print(f"{i}. {choice.text}")
                
            # Get player choice
            while True:
                try:
                    last_choice = int(input(f"\n👉 Your choice (1-{len(response.choices)}): "))
                    if 1 <= last_choice <= len(response.choices):
                        break
                    print(f"❌ Invalid choice. Please choose between 1 and {len(response.choices)}.")
                except ValueError:
                    print("❌ Please enter a number.")
            
            # Update game state
            game_state.radiation_level += response.radiation_increase
            game_state.story_beat += 1
            game_state.add_to_history(
                response.story_text,
                f"Choice {last_choice}",
                response.image_prompts,
                response.time,
                response.location
            )
            
            # Display radiation impact
            if response.radiation_increase > 0:
                print(f"\n⚠️  This choice increases your radiation level by {response.radiation_increase} points!")
        else:
            break

def main():
    try:
        args = parse_args()
        asyncio.run(play_game(show_context=args.show_context))
    except KeyboardInterrupt:
        print("\n\n👋 Game interrupted. See you soon!")
    except Exception as e:
        print(f"\n❌ An error occurred: {str(e)}")

if __name__ == "__main__":
    main() 