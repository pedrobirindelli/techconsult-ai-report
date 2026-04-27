import os
import time
import shutil
import json
import uuid
import docx
import pandas as pd
import requests
import jwt
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from google import genai
from dotenv import load_dotenv
from urllib.parse import urlparse
from docx import Document
from docx.shared import Cm
from functools import wraps

load_dotenv()

app = Flask(__name__, static_folder='dist', static_url_path='/')
CORS(app)

@app.route('/')
def serve_index():
    return send_file('dist/index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join('dist', path)):
        return send_from_directory('dist', path)
    return send_file('dist/index.html')

from flask import send_from_directory

# Configurações Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    client = genai.Client(api_key=api_key)

# Configurações Supabase (Auth)
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET") # Necessário para produção
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://agfkghlczqpyikphmsog.supabase.co")

UPLOAD_FOLDER = 'temp_uploads'
RULES_FILE = 'rules.json'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({"error": "Token de autenticação ausente"}), 401
        
        # Em ambiente de desenvolvimento ou se o segredo não estiver configurado, 
        # apenas verificamos se o token existe. Em produção, você deve configurar o SUPABASE_JWT_SECRET.
        if not SUPABASE_JWT_SECRET:
            # print("Aviso: SUPABASE_JWT_SECRET não configurado. Verificação de token simplificada.")
            if token.startswith("Bearer "): 
                try:
                    t = token.replace("Bearer ", "")
                    request.user = jwt.decode(t, options={"verify_signature": False})
                except:
                    pass
                return f(*args, **kwargs)
            return jsonify({"error": "Token inválido"}), 401

        try:
            token = token.replace("Bearer ", "")
            decoded = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
            # Injeta o usuário na requisição para uso posterior
            request.user = decoded
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({"error": f"Token inválido: {str(e)}"}), 401
    return decorated

def require_admin(f):
    @wraps(f)
    @require_auth
    def decorated(*args, **kwargs):
        user = getattr(request, 'user', None)
        if not user or user.get('email', '').lower() != 'pedrobirindelli@gmail.com':
            return jsonify({"error": "Acesso negado. Apenas o administrador pode realizar esta ação."}), 403
        return f(*args, **kwargs)
    return decorated

def load_persistent_rules():
    if os.path.exists(RULES_FILE):
        with open(RULES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_persistent_rules(rules):
    with open(RULES_FILE, 'w', encoding='utf-8') as f:
        json.dump(rules, f, ensure_ascii=False, indent=2)

# Helper functions
def extract_urls(text):
    if pd.isna(text): return []
    import re
    return re.findall(r'(https?://[^\s\]\n]+)', str(text))

def download_file(url, folder):
    try:
        parsed = urlparse(url)
        filename = os.path.basename(parsed.path) or f"{uuid.uuid4().hex}.bin"
        filepath = os.path.join(folder, filename)
        if os.path.exists(filepath): return filepath
        response = requests.get(url, stream=True, timeout=15)
        if response.status_code == 200:
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(8192):
                    f.write(chunk)
            return filepath
    except Exception as e:
        print(f"Failed download {url}: {e}")
    return None

def extract_text_from_docx(file_path):
    try:
        doc = docx.Document(file_path)
        fullText = [para.text for para in doc.paragraphs if para.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                row_data = [cell.text.strip().replace('\n', ' ') for cell in row.cells]
                fullText.append(' | '.join(row_data))
        return '\n'.join(fullText)
    except: return ""

def extract_text_from_pdf(file_path):
    try:
        import PyPDF2
        text = ""
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() + "\n"
        return text
    except: return ""

def extract_text(file_path):
    ext = file_path.lower()
    if ext.endswith('.docx'): return extract_text_from_docx(file_path)
    elif ext.endswith('.pdf'): return extract_text_from_pdf(file_path)
    return ""

def clear_document_body(doc):
    for paragraph in doc.paragraphs:
        p = paragraph._element
        p.getparent().remove(p)
    for table in doc.tables:
        t = table._element
        t.getparent().remove(t)

def get_best_style(doc, style_name, default="Normal"):
    try:
        if style_name in doc.styles: return doc.styles[style_name]
    except: pass
    return doc.styles[default]

def copy_paragraph_format(source_p, target_p):
    target_fmt = target_p.paragraph_format
    source_fmt = source_p.paragraph_format
    try:
        target_fmt.alignment = source_fmt.alignment
        target_fmt.first_line_indent = source_fmt.first_line_indent
        target_fmt.left_indent = source_fmt.left_indent
        target_fmt.right_indent = source_fmt.right_indent
        target_fmt.space_before = source_fmt.space_before
        target_fmt.space_after = source_fmt.space_after
        target_fmt.line_spacing = source_fmt.line_spacing
    except: pass

def copy_run_format(source_run, target_run):
    try:
        target_run.font.name = source_run.font.name
        target_run.font.size = source_run.font.size
        target_run.font.bold = source_run.font.bold
        target_run.font.italic = source_run.font.italic
        target_run.font.underline = source_run.font.underline
        if source_run.font.color.rgb: target_run.font.color.rgb = source_run.font.color.rgb
    except: pass

def get_style_dna(doc):
    dna = {}
    for p in doc.paragraphs:
        style_name = p.style.name
        if style_name not in dna:
            model_run = p.runs[0] if p.runs else None
            dna[style_name] = {"p": p, "run": model_run}
    return dna

def reconstruct_doc(json_data, template_path, output_path, temp_folder):
    try:
        doc = docx.Document(template_path) if template_path and os.path.exists(template_path) else docx.Document()
    except: doc = docx.Document()
        
    style_dna = get_style_dna(doc)
    clear_document_body(doc)
    
    style_map = {"heading1": "Heading 1", "heading2": "Heading 2", "heading3": "Heading 3", "paragraph": "Normal"}
    
    for block in json_data:
        if not isinstance(block, dict): continue
        b_type = block.get("type", "")
        
        if b_type.startswith("heading") or b_type == "paragraph":
            text = block.get("text", "")
            if not text.strip(): continue
            p = doc.add_paragraph()
            style_name = style_map.get(b_type, "Normal")
            actual_style_name = get_best_style(doc, style_name).name
            p.style = actual_style_name
            if actual_style_name in style_dna:
                copy_paragraph_format(style_dna[actual_style_name]["p"], p)
            run = p.add_run(text)
            if actual_style_name in style_dna and style_dna[actual_style_name]["run"]:
                copy_run_format(style_dna[actual_style_name]["run"], run)

        elif b_type == "table":
            headers, rows = block.get("headers", []), block.get("rows", [])
            if headers and rows:
                table = doc.add_table(rows=1 + len(rows), cols=len(headers))
                try: table.style = 'Table Grid'
                except: pass
                for idx, h in enumerate(headers):
                    cell = table.rows[0].cells[idx]
                    cell.text = str(h)
                    for para in cell.paragraphs:
                        para.alignment = 1
                        for r in para.runs: r.bold = True
                for i, row in enumerate(rows):
                    for j, val in enumerate(row):
                        table.rows[i+1].cells[j].text = str(val)
                doc.add_paragraph("")
                
        elif b_type == "image":
            img_url = block.get("url", "")
            if img_url:
                local_img = download_file(img_url, temp_folder)
                if local_img:
                    p = doc.add_paragraph(); p.alignment = 1
                    run = p.add_run(); run.add_picture(local_img, height=Cm(9))
                    caption = block.get("caption", "")
                    if caption:
                        p_cap = doc.add_paragraph(); p_cap.alignment = 1
                        p_cap.style = get_best_style(doc, "Caption", "Normal").name
                        run_cap = p_cap.add_run(caption); run_cap.font.italic = True
    doc.save(output_path)

@app.route('/api/status', methods=['GET'])
def get_status():
    return jsonify({
        "status": "ok",
        "cloud": True,
        "api_key_configured": bool(os.getenv("GEMINI_API_KEY")),
        "version": "2.0-cloud-stateless"
    })

@app.route('/estimate', methods=['POST'])
@require_auth
def estimate_cost():
    try:
        excel_files = request.files.getlist('excel_files')
        template_files = request.files.getlist('template_files')
        source_files = request.files.getlist('source_files')
        
        media_count = 0
        text_size_bytes = 0
        run_folder = tempfile.mkdtemp(dir=UPLOAD_FOLDER)
        
        for idx, excel in enumerate(excel_files):
            path = os.path.join(run_folder, f"est_{idx}.xlsx")
            excel.save(path)
            try:
                df = pd.read_excel(path)
                for val in df.values.flatten():
                    if isinstance(val, str):
                        urls = extract_urls(val)
                        media_count += len([u for u in urls if 'supabase.co' in u])
            except: pass

        for t in template_files:
            path = os.path.join(run_folder, t.filename)
            t.save(path); text_size_bytes += len(extract_text(path))
                
        for s in source_files:
            path = os.path.join(run_folder, s.filename)
            s.save(path); text_size_bytes += len(extract_text(path))

        shutil.rmtree(run_folder)
        text_tokens = int(text_size_bytes / 4)
        total_tokens = text_tokens + (media_count * 258)
        return jsonify({
            "media_count": media_count,
            "text_tokens": text_tokens,
            "total_tokens": total_tokens,
            "estimated_usd": (total_tokens / 1000000) * 1.25
        })
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/generate', methods=['POST'])
@require_auth
def generate_report():
    run_folder = tempfile.mkdtemp(dir=UPLOAD_FOLDER)
    try:
        excel_files = request.files.getlist('excel_files')
        template_files = request.files.getlist('template_files')
        source_files = request.files.getlist('source_files')
        visual_template = request.files.get('visual_template')
        rules = request.form.get('knowledge_rules', '')

        all_excel_str = ""; url_to_local = {}
        for idx, f in enumerate(excel_files):
            path = os.path.join(run_folder, f"data_{idx}.xlsx")
            f.save(path)
            try:
                df = pd.read_excel(path)
                all_excel_str += f"\n[Arquivo {idx+1}]\n" + df.to_json(orient="records", force_ascii=False)
                for val in df.values.flatten():
                    if isinstance(val, str):
                        for url in extract_urls(val):
                            if 'supabase.co' in url:
                                local = download_file(url, run_folder)
                                if local: url_to_local[url] = local
            except: pass

        gemini_files = []
        media_mapping = "\nMAPEAMENTO DE IMAGENS:\n"
        for url, local in url_to_local.items():
            if local.endswith(('.jpeg', '.jpg', '.png', '.webp')):
                try:
                    g_file = client.files.upload(file=local)
                    while g_file.state.name == "PROCESSING":
                        time.sleep(1)
                        g_file = client.files.get(name=g_file.name)
                    gemini_files.append(g_file)
                    media_mapping += f"- {os.path.basename(local)} -> {url}\n"
                except: pass

        all_ref_text = ""; base_template = None
        if visual_template:
            base_template = os.path.join(run_folder, "master.docx")
            visual_template.save(base_template)

        for idx, t in enumerate(template_files):
            path = os.path.join(run_folder, f"ref_{idx}_{t.filename}")
            t.save(path)
            if not base_template and path.lower().endswith('.docx'): base_template = path
            all_ref_text += f"\n[Referência {idx+1}]\n" + extract_text(path)

        sources_text = ""
        for idx, s in enumerate(source_files):
            path = os.path.join(run_folder, f"src_{idx}_{s.filename}")
            s.save(path); sources_text += f"\n[Fonte {idx+1}]\n" + extract_text(path)

        sys_inst = f"Engenheiro Civil Perito. Retorne APENAS JSON de blocos (heading1, paragraph, image, table). Regras: {rules}"
        user_prompt = f"REFERÊNCIAS:\n{all_ref_text[:15000]}\n\nFONTES:\n{sources_text[:15000]}\n\nDADOS:\n{all_excel_str}\n\n{media_mapping}"
        
        response = client.models.generate_content(
            model='gemini-2.5-pro',
            contents=gemini_files + [user_prompt],
            config=genai.types.GenerateContentConfig(system_instruction=sys_inst, response_mime_type="application/json")
        )
        
        final_doc = os.path.join(run_folder, "Resultado.docx")
        reconstruct_doc(json.loads(response.text), base_template, final_doc, run_folder)
        
        return send_file(final_doc, as_attachment=True, download_name="Relatorio_Gerado.docx")
    except Exception as e: return jsonify({"error": str(e)}), 500
    finally:
        # shutil.rmtree(run_folder) # Opcional: manter por um tempo para debug se necessário
        pass

@app.route('/api/rules', methods=['GET'])
@require_auth
def list_rules(): return jsonify(load_persistent_rules())

@app.route('/api/rules', methods=['POST'])
@require_auth
def add_rule():
    data = request.json
    rules = load_persistent_rules()
    new_rule = {"id": uuid.uuid4().hex, "text": data.get("text", ""), "active": True}
    rules.append(new_rule); save_persistent_rules(rules)
    return jsonify(new_rule)

@app.route('/api/rules/<rule_id>', methods=['DELETE', 'PUT'])
@require_auth
def manage_rule(rule_id):
    rules = load_persistent_rules()
    if request.method == 'DELETE':
        rules = [r for r in rules if r['id'] != rule_id]
    else:
        data = request.json
        for r in rules:
            if r['id'] == rule_id:
                if 'text' in data: r['text'] = data['text']
                if 'active' in data: r['active'] = data['active']
    save_persistent_rules(rules)
    return jsonify({"success": True})

@app.route('/api/admin/users', methods=['GET'])
@require_admin
def admin_get_users():
    if not SUPABASE_SERVICE_ROLE_KEY:
        return jsonify({"error": "SUPABASE_SERVICE_ROLE_KEY não configurado no backend."}), 500
    
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
    }
    
    response = requests.get(f"{SUPABASE_URL}/auth/v1/admin/users", headers=headers)
    if response.status_code == 200:
        return jsonify(response.json())
    return jsonify({"error": response.text}), response.status_code

@app.route('/api/admin/users', methods=['POST'])
@require_admin
def admin_create_user():
    if not SUPABASE_SERVICE_ROLE_KEY:
        return jsonify({"error": "SUPABASE_SERVICE_ROLE_KEY não configurado no backend."}), 500
        
    data = request.json
    email = data.get('email')
    password = data.get('password')
    name = data.get('name', '')
    
    if not email or not password:
        return jsonify({"error": "E-mail e senha são obrigatórios"}), 400
        
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "email": email,
        "password": password,
        "email_confirm": True, # Auto-confirmar
        "user_metadata": {
            "name": name,
            "raw_password": password
        }
    }
    
    response = requests.post(f"{SUPABASE_URL}/auth/v1/admin/users", headers=headers, json=payload)
    if response.status_code in [200, 201]:
        return jsonify(response.json())
    return jsonify({"error": response.text}), response.status_code

@app.route('/api/admin/users/<user_id>', methods=['DELETE'])
@require_admin
def admin_delete_user(user_id):
    if not SUPABASE_SERVICE_ROLE_KEY:
        return jsonify({"error": "SUPABASE_SERVICE_ROLE_KEY não configurado no backend."}), 500
        
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
    }
    
    response = requests.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=headers)
    if response.status_code in [200, 204]:
        return jsonify({"success": True})
    return jsonify({"error": response.text}), response.status_code

@app.route('/api/admin/users/<user_id>/reset', methods=['PUT'])
@require_admin
def admin_reset_user_password(user_id):
    if not SUPABASE_SERVICE_ROLE_KEY:
        return jsonify({"error": "SUPABASE_SERVICE_ROLE_KEY não configurado no backend."}), 500
        
    data = request.json
    new_password = data.get('password')
    if not new_password:
        return jsonify({"error": "A nova senha é obrigatória"}), 400
        
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    # 1. Obter os metadados atuais do usuário
    get_res = requests.get(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=headers)
    if get_res.status_code != 200:
        return jsonify({"error": "Usuário não encontrado"}), 404
        
    user_data = get_res.json()
    metadata = user_data.get("user_metadata", {})
    if "must_change_password" in metadata:
        del metadata["must_change_password"]
    metadata["raw_password"] = new_password
    
    payload = {
        "password": new_password,
        "user_metadata": metadata
    }
    
    # 2. Atualizar a senha e os metadados
    response = requests.put(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}", headers=headers, json=payload)
    if response.status_code in [200, 204]:
        return jsonify({"success": True})
    return jsonify({"error": response.text}), response.status_code

import tempfile
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
