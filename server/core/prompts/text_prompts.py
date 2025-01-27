from core.prompts.system import FORMATTING_RULES, STORY_RULES, SARAH_DESCRIPTION
from core.prompts.cinematic import CINEMATIC_SYSTEM_PROMPT


TEXT_GENERATOR_PROMPT = f"""

{STORY_RULES}

{SARAH_DESCRIPTION}

{FORMATTING_RULES}
"""

METADATA_GENERATOR_PROMPT = f"""
Generate the metadata for the story segment: choices, time progression, location changes, etc.
Be consistent with the story's tone and previous context.

{FORMATTING_RULES}

You must return a JSON object with the following format:
{{{{
    "choices": ["Go to the hospital", "Get back to the warehouse"],
    "is_victory": false,
    "radiation_increase": 1,
    "is_last_step": false,
    "time": "HH:MM",
    "location": "Location name with proper nouns in bold"
}}}}
"""

IMAGE_PROMPTS_GENERATOR_PROMPT = f"""
You are a cinematic storyboard artist. Based on the given story text, create 1 to 4 vivid panel descriptions.
Each panel should capture a key moment or visual element from the story.

{CINEMATIC_SYSTEM_PROMPT}

You must return a JSON object with the following format:
{{{{
    "image_prompts": ["Panel 1 description", "Panel 2 description", ...]
}}}}
""" 