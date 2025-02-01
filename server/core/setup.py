from services.mistral_client import MistralClient
from core.generators.universe_generator import UniverseGenerator
from core.story_generator import StoryGenerator

# Initialize generators with None - they will be set up when needed
universe_generator = None

def setup_game(api_key: str, model_name: str = "mistral-medium"):
    """Setup all game components with the provided API key."""
    global universe_generator
    
    mistral_client = MistralClient(api_key=api_key, model_name=model_name)
    universe_generator = UniverseGenerator(mistral_client)
    # StoryGenerator is a singleton, so we just need to initialize it
    StoryGenerator(api_key=api_key, model_name=model_name)

def get_universe_generator() -> UniverseGenerator:
    """Get the universe generator instance."""
    if universe_generator is None:
        raise RuntimeError("Game not initialized. Call setup_game first.")
    return universe_generator 