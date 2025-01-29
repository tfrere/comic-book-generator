from core.prompts.system import SARAH_DESCRIPTION
from core.prompts.image_style import IMAGE_STYLE_PREFIX

def enrich_prompt_with_sarah_description(prompt: str) -> str:
    """Add Sarah's visual description to prompts that mention her."""
    if "sarah" in prompt.lower() and SARAH_DESCRIPTION not in prompt:
        return f"{prompt} {SARAH_DESCRIPTION}"
    return prompt
