import json


with open("synthetic_data.jsonl", "r") as infile:
    for line in infile:
        data = json.loads(line)
        print(data)  # Verify structure
