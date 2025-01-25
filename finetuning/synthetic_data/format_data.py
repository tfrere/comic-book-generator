import json

def transform_data(data):
    # Create a new dictionary with the transformed data
    final_data = []
    transformed_0 = {}
    
    # Transform user_prompt to user and append the required text
    user_text = data["user_prompt"] + " Generate the next story segment and choices."

    transformed_0["content"] = user_text
    transformed_0["role"] = "user"

    # Transform answer to assistant
    try:
        transformed_1 = {}
        transformed_1["content"] = "choices: " + " | ".join(data["answer"])
        transformed_1["role"] = "assistant"
        final_data.append(transformed_0)
        final_data.append(transformed_1)
    except:
        return None

    return final_data

# Example usage
input_data = [json.loads(line) for line in open('synthetic_data.jsonl')]

transformed_data = [transform_data(item) for item in input_data]
print(json.dumps(transformed_data, indent=2))

# Filter out None values and write to JSONL file
with open('transformed_data.jsonl', 'w') as f:
    for item in filter(None, transformed_data):
        f.write(json.dumps(item) + '\n')