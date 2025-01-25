from mistralai import Mistral
import os
import json
from dotenv import load_dotenv
load_dotenv()

with open('system_prompt.md', 'r') as f:
    system_prompt = f.read().strip()

messages = [
    {"custom_id": str(i), "body": {"messages": [{"role": "user", "content": system_prompt}]}}
    for i in range(1)
]

with open('messages.jsonl', 'w') as f:
    for message in messages:
        f.write(json.dumps(message) + '\n')


api_key = os.environ["MISTRAL_API_KEY"]

client = Mistral(api_key=api_key)

batch_data = client.files.upload(
    file={
        "file_name": "messages.jsonl",
        "content": open("messages.jsonl", "rb")},
    purpose = "batch"
    
)

created_job = client.batch.jobs.create(
    input_files=[batch_data.id],
    model="mistral-large-latest",
    endpoint="/v1/chat/completions"
)

retrieved_job = client.batch.jobs.get(job_id=created_job.id)
client.files.download(file_id=retrieved_job.output_file)

