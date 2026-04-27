import requests

KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZmtnaGxjenFweWlrcGhtc29nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY0OTUzMCwiZXhwIjoyMDkyMjI1NTMwfQ.LieKKBZqEng1KbisCZMB1HoyUkGwzr6PyaRwXiFgA3A"
URL = "https://agfkghlczqpyikphmsog.supabase.co/auth/v1/admin/users"

headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json"
}

data = {
    "email": "testelogin123@fielddatacap.com",
    "password": "senha_temporaria1",
    "email_confirm": True,
    "user_metadata": {
        "name": "Teste Login",
        "must_change_password": True
    }
}

res = requests.post(URL, headers=headers, json=data)
print(res.status_code, res.text)
