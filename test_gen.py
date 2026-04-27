import requests
import json
import pandas as pd
import threading
import time

# Create a dummy excel file
df = pd.DataFrame([{"Item": "Parede", "Problema": "Fissura na pintura", "Imagem": ""}])
df.to_excel("dummy.xlsx", index=False)

def test_generate():
    print("Iniciando requisicao POST para /generate")
    with open("dummy.xlsx", "rb") as f:
        response = requests.post(
            "http://127.0.0.1:5000/generate",
            headers={"Authorization": "Bearer fake_token"},
            data={"knowledge_rules": "Teste basico"},
            files={"excel_files": f},
            stream=True
        )
    
    print(f"Status: {response.status_code}")
    for line in response.iter_lines():
        if line:
            decoded_line = line.decode('utf-8')
            print(decoded_line)

test_generate()
