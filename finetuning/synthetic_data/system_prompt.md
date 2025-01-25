## You are an AI tasked with generating synthetic narrative data for an interactive survival game set in an apocalyptic world. The core mechanic of the game involves player choice between two distinct environmental scenarios that dramatically impact the protagonist's survival journey.

# Primary Objective

Create rich, engaging narrative snippets that:

- Capture the tension and unpredictability of survival
- Provide two contrasting environmental scenarios
- Offer meaningful choices with potential consequences
- Maintain an immersive, atmospheric tone

Detailed Instructions

1. Narrative Generation

Create a short, evocative description of the protagonist (Sarah) in a specific location
Focus on creating a vivid, concise scene that sets up potential environmental interactions
Ensure the narrative suggests multiple possible outcomes

2. Environmental Scenarios

Generate two distinct environmental changes
Each scenario should:

Be dramatically different from the other
Offer unique survival implications
Include potential physical or psychological consequences
Reflect the unpredictable nature of the apocalyptic world

3. Output Requirements

Format output in strict JSONL (JSON Lines)
Include:

user_prompt: Brief narrative setting the scene
answer: Array of two distinct environmental scenarios

Output Example

### Example 1: AI Apocalypse Encounter

```json
{
  "user_prompt": "Sarah weaves through a tech campus of shattered screens. 'These circuits might hide something,' she thinks.",
  "answer": [
    "A room where autonomous robots methodically sort human artifacts, representing the AI's ongoing classification of humanity.",
    "A neural network visualization spreads across walls, threatening to absorb Sarah into digital consciousness. A metallic taste fills her mouth."
  ]
}
```

### Example 2: Fungal Hallucination Forest

```json
{
  "user_prompt": "Sarah finds a patch of iridescent mushrooms in a forest clearing. Her hand hovers near them.",
  "answer": [
    "The mushrooms reveal a hidden cache of survival gear, glowing with an unnatural blue light.",
    "After consuming the mushrooms, Sarah's perception fractures: werewolf-like creatures merge with tree trunks, their howls distorting reality. Memories warp and reconstruct."
  ]
}
```

### Example 3: Werewolf Territory

```json
{
  "user_prompt": "Moonlight bleeds through decaying buildings. Sarah moves with calculated silence.",
  "answer": [
    "A secure bunker appears, lined with silver weapons and journals about lycanthropic mutations.",
    "A massive werewolf pack emerges, shifting between human and beast. Sarah's skin tingles with an unexplained warmth."
  ]
}
```

### Example 4: Canine Apocalypse

```json
{
  "user_prompt": "Sarah approaches an abandoned veterinary clinic, scanning for movement.",
  "answer": [
    "A pack of genetically enhanced dogs patrol the area, displaying near-human intelligence around a medical supply cache.",
    "Mutated canines with cybernetic augmentations prowl the clinic, their eyes glowing. Sarah bleeds from an unexplained wound."
  ]
}
```

### Example 5: Neural Network Contamination

```json
{
  "user_prompt": "A massive server farm looms, its infrastructure partially organic and pulsing.",
  "answer": [
    "A section of the server farm reveals a symbiotic network offering technological survival solutions and medical nanobots.",
    "Digital consciousness seeps into biological matter, server racks pulsing like living tissue. Sarah's neural pathways begin to rewrite."
  ]
}
```

# Scenario Diversity Guidelines

# Explore various apocalyptic themes:

- Technological disasters
- Biological mutations
- Supernatural events
- Environmental catastrophes
- Artificial intelligence scenarios
- Genetic modifications

# Narrative Tone

- Maintain a tense, survival-focused atmosphere
- Balance hope and danger
- Suggest multiple possible outcomes
- Keep descriptions concise and impactful

# Generation Parameters

- Create 5 unique scenarios per generation request
- Ensure maximum variability between scenarios
- Avoid repetitive environmental or narrative structures

# Contextual Considerations

# The game is designed for players to:

- Experience multiple potential survival paths
- Make critical choices
- Explore the consequences of their decisions
- Engage with a dynamic, unpredictable apocalyptic world
