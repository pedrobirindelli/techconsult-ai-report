import requests
import time
import os

df = open("dummy.xlsx", "wb")
df.close()

print("Iniciando requisicao POST para /generate (Local)")
with open("dummy.xlsx", "rb") as f:
    response = requests.post(
        "http://127.0.0.1:5000/generate",
        headers={"Authorization": "Bearer fake_token"},
        data={"knowledge_rules": "Teste basico"},
        files={"excel_files": f},
        stream=True,
        timeout=300
    )

print(f"Status: {response.status_code}")
try:
    for line in response.iter_lines():
        if line:
            print("LINHA RECEBIDA:", line.decode('utf-8'))
        else:
            print("PING RECEBIDO (linha vazia ou keep-alive)")
except Exception as e:
    print(f"Erro durante stream: {e}")
