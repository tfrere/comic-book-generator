import asyncio
import os
import sys
import time
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Add server directory to PYTHONPATH
server_dir = Path(__file__).parent.parent
sys.path.append(str(server_dir))

from core.game_logic import GameState, StoryGenerator
from core.constants import GameConfig

# Load environment variables
load_dotenv()

def parse_args():
    parser = argparse.ArgumentParser(description="Test the game's story generation")
    parser.add_argument('--show-context', action='store_true', help='Show the full context at each step')
    return parser.parse_args()

def print_separator(char="=", length=50):
    print(f"\n{char * length}\n")

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
    # Initialize game
    game_state = GameState()
    model_name = "mistral-small"
    story_generator = StoryGenerator(
        api_key=os.getenv("MISTRAL_API_KEY"),
        model_name=model_name
    )
    
    print("\n=== Don't Look Up - Test Mode ===\n")
    print("🎮 Starting adventure...")
    print("You are Sarah, a survivor in a post-apocalyptic world.")
    if show_context:
        print("📚 Context display is enabled")
    print_separator()
    
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
        response = await story_generator.generate_story_segment(game_state, previous_choice)
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
                print(f"{i}. {choice}")
                
            # Get player choice
            while True:
                try:
                    last_choice = int(input("\n👉 Your choice (1-2): "))
                    if 1 <= last_choice <= 2:
                        break
                    print("❌ Invalid choice. Please choose 1 or 2.")
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