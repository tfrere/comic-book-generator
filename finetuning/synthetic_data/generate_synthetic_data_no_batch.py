from mistralai import Mistral
import os

from dotenv import load_dotenv
import json
load_dotenv()

with open('system_prompt.md', 'r') as f:
    system_prompt = f.read().strip()

api_key = os.environ["MISTRAL_API_KEY"]

client = Mistral(api_key=api_key)

chat_response = client.chat.complete(
    messages=[
        {"role": "user", "content": system_prompt},
    ],
    model="mistral-large-latest",
    temperature=0.2
)

# Process all choices from the response
for choice in chat_response.choices:
    response = choice.message.content
    print(response)
    # Extract JSON content between ```json markers
    if '```json' in response:
        # Get all json blocks between ```json and ```
        json_blocks = []
        parts = response.split('```json')
        for part in parts[1:]:  # Skip first part before ```json
            json_content = part.split('```')[0].strip()
            json_blocks.append(json_content)
            
        # Process each JSON block
        for json_content in json_blocks:
            # Write to file, appending json content
            json_obj = json.loads(json_content.replace('\n', ' ').strip())
            with open('test.jsonl', 'a') as f:
                f.write(json.dumps(json_obj) + '\n')
