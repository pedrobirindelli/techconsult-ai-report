import requests
import time

print("Iniciando requisicao POST para /generate (Producao - https://laudos.fielddatacap.com)")

with open("dummy.xlsx", "wb") as f:
    pass

with open("dummy.xlsx", "rb") as f:
    try:
        response = requests.post(
            "https://laudos.fielddatacap.com/generate",
            headers={"Authorization": "Bearer fake_token"},
            data={"knowledge_rules": "Teste basico"},
            files={"excel_files": f},
            stream=True,
            timeout=300
        )
        
        print(f"Status HTTP: {response.status_code}")
        
        for line in response.iter_lines():
            if line:
                print("LINHA RECEBIDA:", line.decode('utf-8'))
            else:
                print("PING RECEBIDO (linha vazia ou keep-alive)")
    except Exception as e:
        print(f"Erro durante stream: {e}")
