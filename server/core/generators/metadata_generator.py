import json
from langchain.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate

from core.generators.base_generator import BaseGenerator
from core.prompts.formatting_rules import FORMATTING_RULES
from api.models import StoryMetadataResponse

class MetadataGenerator(BaseGenerator):
    """Générateur pour les métadonnées de l'histoire."""

    def __init__(self, mistral_client, hero_name: str = None, hero_desc: str = None):
        self.max_retries = 5  # Nombre maximum de tentatives
        super().__init__(mistral_client, hero_name=hero_name, hero_desc=hero_desc)

    def _create_prompt(self) -> ChatPromptTemplate:
        METADATA_GENERATOR_PROMPT = f"""
        You are a story generator. Generate the metadata for the story segment: choices, time progression, location changes, etc.
        Be consistent with the story's tone and previous context.

        {FORMATTING_RULES}

        Hero Description: {self.hero_desc}

        IMPORTANT RULES FOR CHOICES:
        - You MUST ALWAYS provide EXACTLY TWO choices that advance the story
        - Each choice MUST be NO MORE than 6 words - this is a HARD limit
        - Each choice should be distinct and meaningful
        - If you think of more than two options, select the two most interesting ones
        - Keep choices concise but descriptive
        - Count your words carefully for each choice
        - Choices MUST be direct continuations of the current story segment
        - Choices should reflect possible actions based on the current situation
        - Choices should be about what {self.hero_name} should do next

        You must return a JSON object with the following format:
        {{{{
            "is_death": false,  # Set to true for death scenes
            "is_victory": false  # Set to true for victory scenes
            "choices": ["Choice 1", "Choice 2"],  # ALWAYS exactly two choices, each max 6 words
            "time": "HH:MM",
            "location": "Location",
        }}}}
        """

        human_template = """

History:
{story_history}

Current story segment:
{story_text}

- Current time: {current_time}
- Current location: {current_location}


FOR CHOICES : NEVER propose to go back to the previous location or go back to the portal. NEVER.
Dont be obvious 

{is_end}

You can be original in your choices, but dont be too far from the story.
Dont be too cliché. The choices should be realistically different.

- Each choice MUST be NO MORE than 6 words - this is a HARD limit
You must return a JSON object with the following format:
{{{{
    "is_death": false,  # Set to true for death scenes
    "is_victory": false  # Set to true for victory scenes
    "choices": ["Choice 1", "Choice 2"],  # ALWAYS exactly two choices, each max 6 words
    "time": "HH:MM",
    "location": "Location name",
}}}}

"""


        return ChatPromptTemplate(
            messages=[
                SystemMessagePromptTemplate.from_template(METADATA_GENERATOR_PROMPT),
                HumanMessagePromptTemplate.from_template(human_template)
            ]
        )

    def _validate_choices(self, choices) -> bool:
        """Valide que les choix respectent les règles."""
        if not isinstance(choices, list) or len(choices) != 2:
            return False
        
        for choice in choices:
            # Vérifier la longueur des mots
            word_count = len(choice.split())
            if word_count > 6:
                return False
            
            # Vérifier que le choix n'est pas vide
            if not choice.strip():
                return False
            
            # Vérifier que les choix ne contiennent pas de mots interdits
            forbidden_words = ["back", "return", "portal"]
            if any(word.lower() in choice.lower() for word in forbidden_words):
                return False
        
        # Vérifier que les choix sont différents
        if choices[0].lower() == choices[1].lower():
            return False
            
        return True

    async def generate(self, story_text: str, current_time: str, current_location: str, story_beat: int, error_feedback: str = "", turn_before_end: int = 0, is_winning_story: bool = False, story_history: str = "") -> StoryMetadataResponse:
        """Surcharge de generate pour inclure le error_feedback par défaut."""

        is_end = "This IS the end of the story." if story_beat == turn_before_end else ""
        retry_count = 0
        last_error = None

        while retry_count < self.max_retries:
            try:
                response = await super().generate(
                    story_text=story_text,
                    current_time=current_time,
                    current_location=current_location,
                    story_beat=story_beat,
                    error_feedback=error_feedback,
                    is_end=is_end,
                    turn_before_end=turn_before_end,
                    is_winning_story=is_winning_story,
                    story_history=story_history
                )

                print(f"[MetadataGenerator] Raw response before validation (attempt {retry_count + 1}):", response)
                print(f"[MetadataGenerator] Choices:", response.choices)
                print(f"[MetadataGenerator] Time:", response.time)
                print(f"[MetadataGenerator] Location:", response.location)

                # Valider les choix
                if self._validate_choices(response.choices):
                    print("[MetadataGenerator] Validation successful!")
                    return response
                
                print(f"[MetadataGenerator] Validation failed for choices:", response.choices)
                # Si les choix ne sont pas valides, ajouter un feedback et réessayer
                retry_count += 1
                error_feedback = f"Previous choices were invalid. Remember: EXACTLY 2 choices, MAX 6 words each, must be different and relevant. Last attempt: {response.choices}"
                continue

            except Exception as e:
                print(f"[MetadataGenerator] Error during generation (attempt {retry_count + 1}):", str(e))
                retry_count += 1
                last_error = e
                if retry_count >= self.max_retries:
                    print(f"[MetadataGenerator] Failed to generate valid metadata after {self.max_retries} attempts. Last error: {str(e)}")
                    raise e
                error_feedback = f"Error in previous attempt: {str(e)}. Please try again with valid format."
                continue

        # Si on arrive ici, c'est qu'on a épuisé toutes les tentatives
        raise ValueError(f"Failed to generate valid metadata after {self.max_retries} attempts. Last error: {str(last_error)}")

    def _custom_parser(self, response_content: str) -> StoryMetadataResponse:
        """Parse la réponse et gère les erreurs."""
        print("[MetadataGenerator] Starting parsing process...")
        print("[MetadataGenerator] Raw response content:", response_content)
        
        try:
            # Première tentative : nettoyer les caractères d'échappement problématiques
            cleaned_content = response_content.replace('\\', '')
            print("[MetadataGenerator] First cleaning attempt:", cleaned_content)
            
            try:
                data = json.loads(cleaned_content)
                print("[MetadataGenerator] Successfully parsed JSON after first cleaning")
            except json.JSONDecodeError as e1:
                print("[MetadataGenerator] First cleaning failed:", str(e1))
                # Deuxième tentative : supprimer les commentaires et les espaces superflus
                import re
                # Supprimer les commentaires
                cleaned_content = re.sub(r'#.*$', '', cleaned_content, flags=re.MULTILINE)
                # Supprimer les espaces superflus
                cleaned_content = re.sub(r'\s+', ' ', cleaned_content)
                print("[MetadataGenerator] Second cleaning attempt:", cleaned_content)
                data = json.loads(cleaned_content)
                print("[MetadataGenerator] Successfully parsed JSON after second cleaning")
            
            # Vérifier que les choix sont valides selon les règles
            choices = data.get('choices', [])
            print("[MetadataGenerator] Extracted choices:", choices)
            
            # Vérifier qu'il y a exactement 2 choix
            if len(choices) != 2:
                print("[MetadataGenerator] Invalid number of choices:", len(choices))
                raise ValueError('Must have exactly 2 choices')
            
            # Vérifier que tous les champs requis sont présents
            required_fields = ['is_death', 'is_victory', 'choices', 'time', 'location']
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                print("[MetadataGenerator] Missing required fields:", missing_fields)
                raise ValueError(f'Missing required fields: {", ".join(missing_fields)}')
            
            print("[MetadataGenerator] All validations passed, creating response object")
            return StoryMetadataResponse(**data)
            
        except Exception as e:
            print("[MetadataGenerator] Final error:", str(e))
            print("[MetadataGenerator] Failed to parse response content")
            raise ValueError('Invalid JSON format. Must have EXACTLY two choices. Please provide a valid JSON object.') 