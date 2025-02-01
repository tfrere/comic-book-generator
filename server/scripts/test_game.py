import asyncio
import os
import sys
import time
import argparse
from pathlib import Path
from dotenv import load_dotenv
import uuid
import random

# Add server directory to PYTHONPATH
server_dir = Path(__file__).parent.parent
sys.path.append(str(server_dir))

from core.game_state import GameState
from core.story_generator import StoryGenerator
from core.constants import GameConfig
from core.generators.universe_generator import UniverseGenerator

# Load environment variables
load_dotenv()

def parse_args():
    parser = argparse.ArgumentParser(description="Test the game's story generation")
    parser.add_argument('--show-context', action='store_true', help='Show the full context at each step')
    parser.add_argument('--auto', action='store_true', help='Run in automatic mode with random choices')
    parser.add_argument('--max-turns', type=int, default=15, help='Maximum number of turns before considering test failed (default: 15)')
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

def print_story_step(step_number, story_text, image_prompts, generation_time: float, story_history: str = None, show_context: bool = False, model_name: str = None, is_death: bool = False, is_victory: bool = False):
    print_separator("=")
    print(f"📖 STEP {step_number}")
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

async def play_game(show_context: bool = False, auto_mode: bool = False, max_turns: int = 15):
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
    if auto_mode:
        print("🤖 Running in automatic mode")
        print(f"⏱️  Maximum turns: {max_turns}")
    print_separator()
    
    # Test universe generation
    style, genre, epoch, macguffin, hero = universe_generator._get_random_elements()
    print(f"\nGenerated universe elements:")
    print(f"Style: {style['name']}")
    print(f"Genre: {genre}")
    print(f"Epoch: {epoch}")
    print(f"MacGuffin: {macguffin}")
    print(f"Hero: {hero}")

    base_story = await universe_generator.generate()
    print(f"\nGenerated base story:\n{base_story}")
    
    # Create session and game state
    session_id = str(uuid.uuid4())
    game_state = GameState()
    game_state.set_universe(
        style=style["name"],
        genre=genre,
        epoch=epoch,
        base_story=base_story
    )
    
    # Create story generator
    story_generator.create_segment_generator(
        session_id=session_id,
        style=style,
        genre=genre,
        epoch=epoch,
        base_story=base_story,
        macguffin=macguffin,
        hero=hero
    )
    
    # Display universe information
    print_universe_info(style["name"], genre, epoch, base_story)
    
    last_choice = None
    
    while True:
        # Check for maximum turns in auto mode
        if auto_mode and game_state.story_beat >= max_turns:
            print(f"\n❌ TEST FAILED: Story did not end after {max_turns} turns")
            return False
            
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
            response.story_text,
            response.image_prompts,
            generation_time,
            story_history,
            show_context,
            model_name,
            response.is_death,
            response.is_victory
        )
        
        if response.is_death:
            print("\n☢️  GAME OVER - Death ☢️")
            print("Sarah has succumbed...")
            return False
            
        # Check for victory
        if response.is_victory:
            print("\n🏆 VICTORY! 🏆")
            print("Sarah has survived and completed her mission!")
            return True
            
        # Display choices
        if len(response.choices) == 2:  # On vérifie qu'on a exactement 2 choix
            print("\n🤔 AVAILABLE CHOICES:")
            for choice in response.choices:
                print(f"{choice.id}. {choice.text}")
                
            # Get player choice
            if auto_mode:
                last_choice = random.randint(1, 2)
                print(f"\n🤖 Auto-choosing: {last_choice}")
                time.sleep(1)  # Small delay for readability
            else:
                while True:
                    try:
                        choice_input = int(input("\n👉 Your choice (1-2): "))
                        if choice_input in [1, 2]:
                            last_choice = choice_input
                            break
                        print("❌ Invalid choice. Please choose 1 or 2.")
                    except ValueError:
                        print("❌ Please enter a number.")
            
            # Update game state
            game_state.story_beat += 1
            game_state.add_to_history(
                response.story_text,
                f"Choice {last_choice}",
                response.image_prompts,
                response.time,
                response.location
            )
            
        else:
            print("\n❌ Error: Invalid number of choices received from server")
            return False

def main():
    try:
        args = parse_args()
        success = asyncio.run(play_game(
            show_context=args.show_context,
            auto_mode=args.auto,
            max_turns=args.max_turns
        ))
        if args.auto:
            sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n👋 Game interrupted. See you soon!")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ An error occurred: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 