import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
client = genai.Client()

with open("test_upload.txt", "w") as f:
    f.write("Hello world test file for gemini")

print("Uploading...")
g_file = client.files.upload(file="test_upload.txt")
print("State object:", g_file.state)
print("State type:", type(g_file.state))
try:
    print("State name:", g_file.state.name)
except Exception as e:
    print("Error getting state name:", e)
