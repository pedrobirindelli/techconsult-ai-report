import os
from google import genai
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

def test_gemini():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in .env")
        return

    try:
        # Initialize the client
        client = genai.Client(api_key=api_key)
        
        print("Testing connection to Gemini 1.5 Pro...")
        response = client.models.generate_content(
            model='gemini-2.5-pro',
            contents="Diga 'Conexão com Gemini estabelecida com sucesso!' se você me entende."
        )
        
        print("\nResposta do Google Gemini:")
        print("-" * 30)
        print(response.text)
        print("-" * 30)
        
    except Exception as e:
        print(f"Failed to connect to Gemini API: {e}")

if __name__ == "__main__":
    test_gemini()
