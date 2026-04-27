import os
import re
import requests
import pandas as pd
from urllib.parse import urlparse

EXCEL_FILE = r"C:\Users\pedro\OneDrive\01 - Pessoal\07 - Projetos Pessoais\12 - Programas\techconsult-ai-report\Export do excel_dados da vistoria\Dados_Wayne Barra ap206 t1_25-04-2026.xlsx"
DOWNLOAD_DIR = r"C:\Users\pedro\OneDrive\01 - Pessoal\07 - Projetos Pessoais\12 - Programas\techconsult-ai-report\temp_media"

def extract_urls(text):
    if pd.isna(text):
        return []
    # Find all HTTP/HTTPS links
    urls = re.findall(r'(https?://[^\s\]\n]+)', str(text))
    return urls

def download_file(url, folder):
    try:
        # Parse URL to get a clean filename
        parsed = urlparse(url)
        filename = os.path.basename(parsed.path)
        if not filename:
            filename = "file.bin"
        
        filepath = os.path.join(folder, filename)
        
        # If file already exists, skip
        if os.path.exists(filepath):
            return filepath
            
        print(f"Downloading {filename}...")
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()
        
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                
        return filepath
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        return None

def process_excel_media():
    if not os.path.exists(DOWNLOAD_DIR):
        os.makedirs(DOWNLOAD_DIR)
        
    df = pd.read_excel(EXCEL_FILE)
    
    downloaded_files = []
    
    # Iterate through every cell looking for links
    for index, row in df.iterrows():
        for col in df.columns:
            urls = extract_urls(row[col])
            for url in urls:
                if 'supabase.co' in url:
                    local_path = download_file(url, DOWNLOAD_DIR)
                    if local_path:
                        downloaded_files.append({
                            'original_url': url,
                            'local_path': local_path,
                            'row': index,
                            'column': col
                        })
                        
    print(f"\nSuccessfully downloaded {len(downloaded_files)} files.")
    return downloaded_files

if __name__ == "__main__":
    process_excel_media()
