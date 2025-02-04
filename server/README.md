# Don't Look Up - Server

Backend for the Don't Look Up narrative game, powered by Mistral AI for story generation.

## 🧠 Architecture

The server is built around several specialized AI generators:

### Generators

- `UniverseGenerator`: Creates the universe and initial context
- `StorySegmentGenerator`: Generates narrative segments
- `MetadataGenerator`: Handles metadata (time, location, choices)
- `ImagePromptGenerator`: Creates prompts for images

### Services

- `MistralService`: Interface with Mistral API
- `GameStateManager`: Game state management
- `AudioService`: Narration management

## 🛠️ Installation

1. Prerequisites:

   ```bash
   python 3.10+
   poetry
   ```

2. Installation:

   ```bash
   cd server
   poetry install
   ```

3. Configuration:
   ```bash
   cp .env.example .env
   # Add your Mistral API key to .env
   ```

## 🚀 Usage

### Start the Server

```bash
poetry run uvicorn server:app --reload
```

### Game Testing

```bash
# Interactive mode
poetry run test-game

# Automatic mode
poetry run test-game --auto

# Automatic mode with parameters
poetry run test-game --auto --max-turns 20 --show-context
```

## 📁 Project Structure

```
server/
├── api/            # FastAPI routes and models
│   ├── models.py   # Pydantic models
│   └── routes.py   # API endpoints
├── core/           # Business logic
│   ├── generators/ # AI generators
│   └── prompts/    # Prompt templates
├── services/       # External services
└── scripts/        # Utility scripts
```

## 🔄 Generation Workflow

1. **Initialization**

   - Universe creation
   - Initial context definition
   - Base story generation

2. **Game Loop**

   - Narrative segment generation
   - Choice creation
   - Metadata updates
   - Image prompt generation

3. **State Management**
   - Progress tracking
   - Choice history
   - World state

## 📝 API Endpoints

- `POST /game/start`: Start a new game
- `POST /game/choice`: Submit a choice
- `GET /game/state`: Get current state
- `POST /game/generate-image`: Generate an image
- `POST /game/narrate`: Generate audio narration

## 🧪 Testing

```bash
# Unit tests
poetry run pytest

# Coverage tests
poetry run pytest --cov

# Integration tests
poetry run pytest tests/integration
```
