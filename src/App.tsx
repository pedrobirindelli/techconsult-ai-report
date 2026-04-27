import { useState, useEffect } from 'react'
import { FileSpreadsheet, FileText, Upload, Settings, Play, Brain, BrainCircuit, FileSignature, DollarSign, Download, CheckCircle2, Save, Trash2, FilePlus, LogOut, FolderOpen, Users, Loader2, Smile } from 'lucide-react'
import { supabase } from './lib/supabaseClient'
import Login from './components/Login'
import { ForcePasswordChange } from './components/ForcePasswordChange'
import { AdminPanel } from './components/AdminPanel'

interface AppFile {
  name: string;
  file?: File;
  handle?: FileSystemFileHandle;
}

// Extensão de tipos para o File System Access API
declare global {
  interface Window {
    showDirectoryPicker(options?: {
      mode?: 'read' | 'readwrite';
      startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
    }): Promise<FileSystemDirectoryHandle>;
  }
}

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [knowledgeRules, setKnowledgeRules] = useState("Sempre utilize os termos técnicos da ABNT NBR 13752. Nunca utilize o adjetivo ruim, substitua por deteriorado ou com anomalias críticas.")
  
  // Agent State
  const [agentFile, setAgentFile] = useState<File | null>(null)
  const [agentPrompt, setAgentPrompt] = useState("Ex: Gere uma capa com o título Laudo e autor Pedro. Pinte todos os subtítulos de azul e centralize as imagens.")
  const [isAgentRunning, setIsAgentRunning] = useState(false)
  const [agentResultUrl, setAgentResultUrl] = useState<string | null>(null)
  
  // States para arquivos do projeto
  const [excelFiles, setExcelFiles] = useState<AppFile[]>([])
  const [templateFiles, setTemplateFiles] = useState<AppFile[]>([])
  const [sourceFiles, setSourceFiles] = useState<AppFile[]>([])
  const [visualTemplate, setVisualTemplate] = useState<AppFile | null>(null)
  
  const [savedRules, setSavedRules] = useState<{id: string, text: string, active: boolean}[]>([])
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")
  
  const [isEstimating, setIsEstimating] = useState(false)
  const [estimation, setEstimation] = useState<{media_count: number, text_tokens: number, total_tokens: number, estimated_usd: number} | null>(null)
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [actualTokens, setActualTokens] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [generationStatus, setGenerationStatus] = useState<string | null>(null)
  // Gerenciamento Local
  const [projectName, setProjectName] = useState('')
  const [projectHandle, setProjectHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      fetchRules()
    }
  }, [session])

  const handleAgentSubmit = async () => {
    if (!agentFile) {
      alert("Selecione um arquivo Word primeiro.");
      return;
    }
    setIsAgentRunning(true);
    setAgentResultUrl(null);
    try {
      const formData = new FormData();
      formData.append('file', agentFile);
      formData.append('prompt', agentPrompt);

      const res = await fetch('/agent/format', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro no Agente");
      
      const downloadRes = await fetch(`/api/download/${data.file_id}?file=output.docx`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!downloadRes.ok) throw new Error("Erro ao baixar arquivo gerado");
      const blob = await downloadRes.blob();
      setAgentResultUrl(window.URL.createObjectURL(blob));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsAgentRunning(false);
    }
  }

  const fetchRules = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.saved_rules) {
        setSavedRules(user.user_metadata.saved_rules)
      } else {
        setSavedRules([])
      }
      if (user?.user_metadata?.knowledge_rules) {
        setKnowledgeRules(user.user_metadata.knowledge_rules)
      }
    } catch (e) {
      console.error("Erro ao buscar regras", e)
    }
  }

  const syncRulesToSupabase = async (newRules: any[]) => {
    try {
      await supabase.auth.updateUser({
        data: { saved_rules: newRules }
      })
    } catch (e) {
      console.error("Erro ao salvar regras no Supabase", e)
    }
  }

  const handleKnowledgeRulesChange = (newText: string) => {
    setKnowledgeRules(newText);
  }

  const handleKnowledgeRulesBlur = async () => {
    try {
      await supabase.auth.updateUser({
        data: { knowledge_rules: knowledgeRules }
      });
    } catch (e) {
      console.error("Erro ao salvar regras de contexto no Supabase", e)
    }
  }

  // --- LOGICA DE FILESYSTEM LOCAL ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<AppFile[]>>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(f => ({
        name: f.name,
        file: f
      }))
      setter(prev => [...prev, ...newFiles])
    }
  }

  const removeFile = (name: string, setter: React.Dispatch<React.SetStateAction<AppFile[]>>) => {
    setter(prev => prev.filter(f => f.name !== name))
  }

  const handleNewProject = () => {
    if (projectName && !confirm("Deseja realmente iniciar um novo projeto? Todos os arquivos da sessão atual serão limpos.")) return
    setProjectName("")
    setProjectHandle(null)
    setExcelFiles([])
    setTemplateFiles([])
    setSourceFiles([])
    setVisualTemplate(null)
    setEstimation(null)
    setDownloadUrl(null)
    setActualTokens(null)
    setErrorMsg("")
  }

  const handleSelectFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      setProjectHandle(handle);
      setProjectName(handle.name);
      
      // Tentar carregar arquivo de projeto se existir
      try {
        const fileHandle = await handle.getFileHandle('project_config.json');
        const file = await fileHandle.getFile();
        const content = await file.text();
        const config = JSON.parse(content);
        
        // Reconstruir estado a partir da pasta
        await loadProjectFromFolder(handle, config);
      } catch (e) {
        alert("O arquivo project_config.json não foi encontrado nesta pasta. Verifique se você selecionou a pasta correta do projeto.");
        console.log("Pasta vazia ou sem configuração.");
      }
    } catch (err) {
      console.error("Usuário cancelou a seleção de pasta", err);
    }
  }

  const loadProjectFromFolder = async (dirHandle: FileSystemDirectoryHandle, config: any) => {
    const loadCategory = async (catName: string) => {
      try {
        const subDir = await dirHandle.getDirectoryHandle(catName);
        const files: AppFile[] = [];
        for await (const entry of subDir.values()) {
          if (entry.kind === 'file') {
            files.push({ name: entry.name, handle: entry as FileSystemFileHandle });
          }
        }
        return files;
      } catch { return []; }
    }

    setExcelFiles(await loadCategory('excel'));
    setTemplateFiles(await loadCategory('template'));
    setSourceFiles(await loadCategory('source'));
    
    const visuals = await loadCategory('visual');
    if (visuals.length > 0) setVisualTemplate(visuals[0]);
    
    if (config.knowledgeRules) setKnowledgeRules(config.knowledgeRules);
  }

  const handleSaveProject = async () => {
    let currentHandle = projectHandle;
    
    if (!currentHandle) {
      try {
        currentHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        setProjectHandle(currentHandle);
        setProjectName(currentHandle.name);
      } catch (e) { return; }
    }

    setIsSaving(true);
    try {
      // 1. Salvar Configuração
      const configHandle = await currentHandle.getFileHandle('project_config.json', { create: true });
      const writable = await configHandle.createWritable();
      await writable.write(JSON.stringify({
        projectName: currentHandle.name,
        knowledgeRules,
        updatedAt: new Date().toISOString()
      }, null, 2));
      await writable.close();

      // 2. Salvar Arquivos em subpastas
      const saveFiles = async (files: AppFile[], folderName: string) => {
        if (files.length === 0 || !currentHandle) return;
        const subDir = await currentHandle.getDirectoryHandle(folderName, { create: true });
        for (const f of files) {
          if (f.file) {
            const fHandle = await subDir.getFileHandle(f.name, { create: true });
            const w = await fHandle.createWritable();
            await w.write(f.file);
            await w.close();
            f.handle = fHandle;
            delete f.file; // Manter apenas handle após salvar
          }
        }
      }

      await saveFiles(excelFiles, 'excel');
      await saveFiles(templateFiles, 'template');
      await saveFiles(sourceFiles, 'source');
      if (visualTemplate) await saveFiles([visualTemplate], 'visual');

      alert("Projeto salvo localmente com sucesso!");
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  const getFileFromAppFile = async (af: AppFile): Promise<File> => {
    if (af.file) return af.file;
    if (af.handle) return await af.handle.getFile();
    throw new Error(`Arquivo ${af.name} não encontrado.`);
  }

  const buildFormData = async () => {
    const formData = new FormData();
    
    for (const f of excelFiles) formData.append('excel_files', await getFileFromAppFile(f));
    for (const f of templateFiles) formData.append('template_files', await getFileFromAppFile(f));
    for (const f of sourceFiles) formData.append('source_files', await getFileFromAppFile(f));
    if (visualTemplate) formData.append('visual_template', await getFileFromAppFile(visualTemplate));

    const activePersistent = savedRules.filter(r => r.active).map(r => r.text).join("\n\n");
    const finalRules = activePersistent + "\n\n" + knowledgeRules + "\nREGRA CRÍTICA: A IA não deve alucinar. Caso uma informação não seja identificada nas fontes previamente informadas, ela deve reportar isso colocando o conteúdo em *itálico*.";
    formData.append('knowledge_rules', finalRules);
    
    return formData;
  }

  const handleEstimate = async () => {
    if (excelFiles.length === 0 || templateFiles.length === 0) {
      setErrorMsg("Selecione ao menos 1 Planilha Excel e 1 Laudo de Referência.");
      return;
    }
    setIsEstimating(true);
    setErrorMsg('');
    try {
      const body = await buildFormData();
      const res = await fetch('/estimate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
        body
      });
      if (!res.ok) throw new Error("Falha ao calcular estimativa");
      const data = await res.json();
      setEstimation(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsEstimating(false);
    }
  }

  const handleConfirmGenerate = async () => {
    setEstimation(null);
    setIsGenerating(true);
    setErrorMsg('');
    setDownloadUrl(null);
    setActualTokens(null);
    setGenerationStatus('Preparando arquivos para envio...');
    
    try {
      const body = await buildFormData();
      const response = await fetch('/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
        body
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro no servidor da IA. Falha ao gerar.");
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      
      if (reader) {
        let done = false;
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.substring(6));
                  if (data.error) {
                    throw new Error(data.error);
                  }
                  if (data.status) {
                    setGenerationStatus(data.status);
                  }
                  if (data.file_id) {
                    const downloadRes = await fetch(`/api/download/${data.file_id}`, {
                      headers: { 'Authorization': `Bearer ${session?.access_token}` }
                    });
                    if (!downloadRes.ok) throw new Error("Erro ao baixar arquivo gerado");
                    const blob = await downloadRes.blob();
                    const url = window.URL.createObjectURL(blob);
                    
                    if (data.tokens_used) {
                      setActualTokens(data.tokens_used);
                      
                      const currentTokens = session?.user?.user_metadata?.total_tokens_used || 0;
                      const newTotal = currentTokens + data.tokens_used;
                      await supabase.auth.updateUser({
                        data: { total_tokens_used: newTotal }
                      });
                      
                      if (session?.user) {
                        session.user.user_metadata = { ...session.user.user_metadata, total_tokens_used: newTotal };
                      }
                    }
                    
                    setDownloadUrl(url);
                    setGenerationStatus(null);
                  }
                } catch (e) {
                  // handle incomplete JSON if chunk is broken, though usually SSE sends full lines
                }
              }
            }
          }
        }
      }
      
    } catch (err: any) {
      setErrorMsg(err.message || "Erro desconhecido");
      setGenerationStatus(null);
    } finally {
      setIsGenerating(false);
    }
  }

  // --- REGRAS PERMANENTES ---

  const savePermanentRule = async () => {
    if (!knowledgeRules.trim()) return
    const newRule = { id: crypto.randomUUID(), text: knowledgeRules, active: true }
    const newRules = [...savedRules, newRule]
    setSavedRules(newRules)
    await syncRulesToSupabase(newRules)
    
    setKnowledgeRules("")
    await supabase.auth.updateUser({
      data: { knowledge_rules: "" }
    });
    alert("Regra salva permanentemente!");
  }

  const deleteRule = async (id: string) => {
    if (!confirm("Excluir esta regra definitivamente?")) return
    const newRules = savedRules.filter(r => r.id !== id)
    setSavedRules(newRules)
    await syncRulesToSupabase(newRules)
  }

  const toggleRule = async (id: string) => {
    const newRules = savedRules.map(r => r.id === id ? { ...r, active: !r.active } : r)
    setSavedRules(newRules)
    await syncRulesToSupabase(newRules)
  }

  const startEditing = (rule: {id: string, text: string}) => {
    setEditingRuleId(rule.id)
    setEditingText(rule.text)
  }

  const cancelEditing = () => {
    setEditingRuleId(null)
    setEditingText("")
  }

  const saveEdit = async (id: string) => {
    const newRules = savedRules.map(r => r.id === id ? { ...r, text: editingText } : r)
    setSavedRules(newRules)
    await syncRulesToSupabase(newRules)
    setEditingRuleId(null)
  }

  if (!session) return <Login />;

  const isMasterAdmin = session?.user?.email?.toLowerCase() === 'pedrobirindelli@gmail.com';
  const mustChangePassword = session?.user?.user_metadata?.must_change_password;

  if (mustChangePassword) {
    return <ForcePasswordChange onPasswordChanged={() => {
      // Força a recarga da sessão para atualizar os metadados no lado do cliente
      supabase.auth.refreshSession().then(({ data }) => setSession(data.session));
    }} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex relative">
      {/* Estimation Modal */}
      {estimation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <DollarSign className="text-amber-500" />
              Confirmação de Custo da IA
            </h3>
            
            <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Mídias Detectadas:</span>
                <span className="font-bold text-slate-800">{estimation.media_count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Volume de Texto:</span>
                <span className="font-bold text-slate-800">{estimation.text_tokens.toLocaleString()} tokens</span>
              </div>
              <div className="flex justify-between text-lg mt-2 pt-2 border-t border-slate-200">
                <span className="text-slate-800 font-semibold">Custo Estimado (US$):</span>
                <span className="font-bold text-emerald-600">${estimation.estimated_usd.toFixed(4)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setEstimation(null)} className="px-4 py-2 rounded-lg text-slate-600 font-semibold hover:bg-slate-100 transition">Cancelar</button>
              <button onClick={handleConfirmGenerate} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow hover:bg-blue-700 transition flex items-center gap-2">
                Continuar e Gerar <Play size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-2 text-white font-bold text-xl">
            <BrainCircuit className="text-blue-500" />
            TechConsult AI
          </div>
          <p className="text-xs text-slate-500 mt-1">Nuvem + Storage Local</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <Play size={18} /> Geração
          </button>
          <button 
            onClick={() => setActiveTab('knowledge')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'knowledge' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <Brain size={18} /> Comportamento
          </button>
            {session.user.email === 'pedrobirindelli@gmail.com' && (
              <>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'admin' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Users size={20} />
                  <span>Gestão de Usuários</span>
                </button>
                <button
                  onClick={() => setActiveTab('agente')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'agente' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Smile size={20} />
                  <span>Joorrge</span>
                </button>
              </>
            )}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button 
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-red-900/20 rounded-lg transition-all"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-slate-800">Gerador de Laudos</h1>
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                <CheckCircle2 size={12} /> SERVIDOR ONLINE
              </div>
            </div>
            
            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 font-semibold">{errorMsg}</div>
            )}

            {/* Barra de Projeto Local */}
            <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-blue-100 shadow-sm mb-6">
              <div className="flex-1 flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                  <FolderOpen size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Local do Projeto (Seu Computador)</span>
                  <span className="font-semibold text-slate-700">{projectName || "Nenhuma pasta selecionada"}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button onClick={handleSelectFolder} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 border border-slate-200">
                  <FolderOpen size={14} /> ABRIR PASTA DO PROJETO
                </button>
                <button onClick={handleNewProject} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 border border-slate-200">
                  <FilePlus size={14} /> NOVO
                </button>
                <button onClick={handleSaveProject} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all flex items-center gap-2">
                  {isSaving ? "Salvando..." : <><Save size={16} /> SALVAR ALTERAÇÕES</>}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Planilhas */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-slate-700">
                  <FileSpreadsheet size={20} className="text-green-600" /> 1. Planilhas Excel
                </h2>
                <label className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 cursor-pointer transition relative overflow-hidden">
                  <input type="file" multiple accept=".xlsx,.xls" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, setExcelFiles)} />
                  <Upload size={24} className="mb-2" />
                  <p className="text-sm">Clique ou arraste</p>
                </label>
                <div className="mt-2 space-y-1">
                  {excelFiles.map((f, i) => (
                    <div key={i} className="text-sm p-2 rounded flex justify-between items-center font-medium bg-green-50 text-green-700 border border-green-100">
                      <span className="truncate pr-4 flex items-center gap-2"><CheckCircle2 size={14} /> {f.name}</span>
                      <button onClick={() => removeFile(f.name, setExcelFiles)} className="p-1 hover:bg-white/50 rounded-full transition-colors text-slate-400 hover:text-red-500 font-bold">X</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Referência */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-slate-700">
                  <FileSignature size={20} className="text-blue-600" /> 2. Laudos de Referência
                </h2>
                <label className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 cursor-pointer transition relative overflow-hidden">
                  <input type="file" multiple accept=".docx,.doc,.pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, setTemplateFiles)} />
                  <Upload size={24} className="mb-2" />
                  <p className="text-sm">Word ou PDF</p>
                </label>
                <div className="mt-2 space-y-1">
                  {templateFiles.map((f, i) => (
                    <div key={i} className="text-sm p-2 rounded flex justify-between items-center font-medium bg-blue-50 text-blue-700 border border-blue-100">
                      <span className="truncate pr-4 flex items-center gap-2"><CheckCircle2 size={14} /> {f.name}</span>
                      <button onClick={() => removeFile(f.name, setTemplateFiles)} className="p-1 hover:bg-white/50 rounded-full transition-colors text-slate-400 hover:text-red-500 font-bold">X</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fontes */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-slate-700">
                  <FileText size={20} className="text-amber-600" /> 3. Fontes e Normas
                </h2>
                <label className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 cursor-pointer transition relative overflow-hidden">
                  <input type="file" multiple accept=".pdf,.docx,.doc" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, setSourceFiles)} />
                  <Upload size={24} className="mb-2" />
                  <p className="text-sm">Manuais e ABNTs</p>
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sourceFiles.map((f, i) => (
                    <div key={i} className="text-[10px] px-2 py-1 rounded font-medium flex items-center gap-2 border bg-amber-100 text-amber-800 border-amber-200">
                      <span className="max-w-[120px] truncate">{f.name}</span>
                      <button onClick={() => removeFile(f.name, setSourceFiles)} className="hover:text-red-500 font-bold ml-1">x</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Identidade */}
              <div className="bg-white p-6 rounded-xl border-2 border-purple-200 shadow-md relative">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-slate-700">
                  <Settings size={20} className="text-purple-600" /> 4. Identidade Visual
                </h2>
                <label className="border-2 border-dashed border-purple-300 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 hover:bg-purple-50 cursor-pointer transition relative overflow-hidden bg-purple-50/30">
                  <input type="file" accept=".docx" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files?.[0] && setVisualTemplate({ name: e.target.files[0].name, file: e.target.files[0] })} />
                  <Upload size={24} className="mb-2 text-purple-600" />
                  <p className="text-sm font-medium">Template Mestre (.docx)</p>
                </label>
                {visualTemplate && (
                  <div className="mt-3 text-sm p-2 rounded-lg flex justify-between items-center font-bold border bg-purple-100 border-purple-200 text-purple-800">
                    <span className="truncate pr-2 flex items-center gap-2"><CheckCircle2 size={14} /> {visualTemplate.name}</span>
                    <button onClick={() => setVisualTemplate(null)} className="text-slate-400 hover:text-red-500 font-bold">X</button>
                  </div>
                )}
              </div>
            </div>

            {/* Ações */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="text-xs text-slate-500">
                <p className="font-bold flex items-center gap-1"><Brain size={14} className="text-blue-500" /> IA: Gemini 2.5 Pro</p>
                <p className="mt-1 italic">Os arquivos serão processados na nuvem e retornados para o seu computador.</p>
                {generationStatus && (
                  <p className="mt-3 text-indigo-600 font-medium animate-pulse flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> {generationStatus}
                  </p>
                )}
              </div>
              
              <button 
                onClick={handleEstimate}
                disabled={isEstimating || isGenerating}
                className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-bold shadow-lg transition-all flex items-center gap-3 disabled:opacity-70 active:scale-95"
              >
                {isGenerating ? "GERANDO LAUDO..." : isEstimating ? "CALCULANDO..." : <>PROCESSAR LAUDO <BrainCircuit size={20} /></>}
              </button>
            </div>

            {downloadUrl && !isGenerating && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-xl border border-emerald-200 flex flex-col sm:flex-row justify-between items-center shadow-xl animate-bounce gap-4">
                <div>
                  <h3 className="text-lg font-bold text-emerald-900">Laudo Gerado com Sucesso!</h3>
                  <p className="text-sm text-emerald-700 mb-2">Clique ao lado para salvar no seu computador.</p>
                  {actualTokens && (
                    <p className="text-xs font-mono bg-emerald-100 text-emerald-800 px-2 py-1 rounded inline-block">
                      ⚡ Tokens processados: {actualTokens.toLocaleString()} (~${((actualTokens/1000000)*1.25).toFixed(4)})
                    </p>
                  )}
                </div>
                <a href={downloadUrl} download={`${projectName || 'Laudo'}_Gerado_IA.docx`} className="bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 font-bold hover:bg-emerald-700 transition-all">
                  <Download size={20} /> BAIXAR WORD
                </a>
              </div>
            )}
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Comportamento da IA</h1>
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
              <textarea 
                className="w-full h-40 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-700 mb-6"
                placeholder="Instrua a IA sobre termos técnicos, estilo de escrita..."
                value={knowledgeRules}
                onChange={(e) => handleKnowledgeRulesChange(e.target.value)}
                onBlur={handleKnowledgeRulesBlur}
              ></textarea>
              <button onClick={savePermanentRule} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition"><Save size={18} /> Salvar Regra</button>
              
              <div className="mt-8 space-y-4">
                <h3 className="font-semibold text-slate-700 border-b pb-2">Regras Salvas</h3>
                {savedRules.map((rule) => (
                  <div key={rule.id} className={`p-4 rounded-lg border transition ${rule.active ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                    <div className="flex items-start gap-3">
                      <input type="checkbox" checked={rule.active} onChange={() => toggleRule(rule.id)} className="mt-1 w-4 h-4 text-purple-600 rounded cursor-pointer" />
                      {editingRuleId === rule.id ? (
                        <div className="flex-1 space-y-2">
                          <textarea className="w-full p-2 border border-purple-300 rounded text-sm" value={editingText} onChange={(e) => setEditingText(e.target.value)} rows={3} />
                          <div className="flex gap-2">
                            <button onClick={() => saveEdit(rule.id)} className="bg-purple-600 text-white px-2 py-1 rounded text-xs">Salvar</button>
                            <button onClick={cancelEditing} className="bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs">Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 text-sm text-slate-700 leading-relaxed">{rule.text}</div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => startEditing(rule)} className="text-slate-400 hover:text-purple-600"><Settings size={16} /></button>
                        <button onClick={() => deleteRule(rule.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admin' && isMasterAdmin && (
          <AdminPanel />
        )}
          {activeTab === 'agente' && session.user.email === 'pedrobirindelli@gmail.com' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
              <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-8 text-white shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <BrainCircuit className="w-8 h-8 text-indigo-300" />
                  <h1 className="text-2xl font-bold">Jorge, seu Agente de Formatação</h1>
                </div>
                <p className="text-indigo-100 opacity-90 max-w-2xl text-sm leading-relaxed">
                  Olá! Eu sou o Jorge. Estou aqui para ajudar a deixar o seu laudo perfeito! Faça o upload do arquivo Word bruto e me diga exatamente como quer que eu o formate (ex: arrumar a capa, centralizar imagens, padronizar títulos e fontes). Pode me explicar tudo de forma natural, como se estivesse falando com um colega!
                </p>
              </div>
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="grid md:grid-cols-2 gap-8">
                  
                  {/* Arquivo Input */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <FileText size={18} className="text-indigo-500" />
                      1. Laudo Original (Word)
                    </h3>
                    <label 
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          setAgentFile(e.dataTransfer.files[0]);
                        }
                      }}
                      className="border-2 border-dashed border-indigo-200 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-400 transition-colors group h-40"
                    >
                      <Upload size={24} className="text-indigo-400 group-hover:text-indigo-600 mb-2 transition-colors" />
                      <span className="text-sm text-indigo-900 font-medium">{agentFile ? agentFile.name : 'Selecionar .docx'}</span>
                      <input 
                        type="file" 
                        accept=".docx"
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setAgentFile(e.target.files[0])
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Prompt */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <Settings size={18} className="text-indigo-500" />
                      2. Instruções de Formatação (Prompt)
                    </h3>
                    <textarea 
                      className="w-full h-40 border border-slate-200 rounded-xl p-4 text-sm resize-none focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 bg-slate-50"
                      value={agentPrompt}
                      onChange={(e) => setAgentPrompt(e.target.value)}
                      placeholder="Descreva as alterações. Ex: Coloque os títulos com fonte Arial 16 em negrito azul. Adicione uma capa com título 'Laudo Técnico' e autor 'Pedro'. Alinhe imagens no centro."
                    />
                  </div>
                </div>

                <div className="mt-8 flex flex-col items-center border-t border-slate-100 pt-8">
                  {!isAgentRunning && !agentResultUrl && (
                    <button 
                      onClick={handleAgentSubmit}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-10 rounded-xl shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                    >
                      <BrainCircuit size={20} />
                      EXECUTAR AGENTE DE FORMATAÇÃO
                    </button>
                  )}

                  {isAgentRunning && (
                    <div className="flex flex-col items-center justify-center py-6 text-indigo-600 animate-pulse">
                      <Loader2 className="w-10 h-10 animate-spin mb-4" />
                      <p className="font-medium text-lg">A IA está processando as instruções e manipulando o Word...</p>
                      <p className="text-sm opacity-70 mt-2">Isso pode levar cerca de 1 minuto.</p>
                    </div>
                  )}

                  {agentResultUrl && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 w-full max-w-lg text-center flex flex-col items-center gap-4">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                      <div>
                        <h3 className="text-lg font-bold text-emerald-900">Documento Formatado com Sucesso!</h3>
                        <p className="text-sm text-emerald-700">As instruções foram aplicadas pelo Agente Especialista.</p>
                      </div>
                      <div className="flex gap-4 w-full mt-2">
                        <a 
                          href={agentResultUrl} 
                          download="Laudo_Formatado_Agente.docx" 
                          className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-lg shadow font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Download size={18} /> BAIXAR WORD
                        </a>
                        <button 
                          onClick={() => {
                            setAgentResultUrl(null);
                            setAgentFile(null);
                          }}
                          className="px-6 py-3 border border-slate-300 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                        >
                          Novo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
    </div>
  )
}
