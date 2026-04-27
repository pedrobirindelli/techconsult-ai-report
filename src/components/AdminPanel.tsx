import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ShieldCheck, UserPlus, Users, Loader2, KeyRound, Mail, User, Trash2, RefreshCw } from 'lucide-react';

export function AdminPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Master Password Form State
  const [masterPassword, setMasterPassword] = useState('');
  const [masterConfirm, setMasterConfirm] = useState('');
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterSuccess, setMasterSuccess] = useState('');
  const [masterError, setMasterError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) return;

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao buscar usuários do servidor');
      }

      const data = await response.json();
      setUsers(data.users || data || []);
    } catch (err: any) {
      console.error('Erro ao buscar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreating(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) throw new Error('Não autenticado');

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar usuário');
      }

      setSuccess(`Usuário ${formData.name} criado com sucesso! Ele terá que alterar a senha no primeiro acesso.`);
      setFormData({ name: '', email: '', password: '' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`Tem certeza que deseja EXCLUIR permanentemente o usuário ${email}?`)) return;
    
    setActionLoading(userId);
    setError('');
    setSuccess('');
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) throw new Error('Não autenticado');

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Erro ao excluir usuário');
      }

      setSuccess(`Usuário ${email} foi excluído.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (userId: string, email: string) => {
    const newPass = prompt(`Digite a nova senha para ${email} (Mínimo 6 caracteres):`);
    if (!newPass) return;
    if (newPass.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    
    if (!window.confirm(`Deseja alterar a senha de ${email} para "${newPass}"?`)) return;

    setActionLoading(userId);
    setError('');
    setSuccess('');
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.access_token) throw new Error('Não autenticado');

      const response = await fetch(`/api/admin/users/${userId}/reset`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({ password: newPass })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Erro ao resetar senha');
      }

      setSuccess(`Senha de ${email} alterada com sucesso para "${newPass}".`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-fade-in text-slate-800">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Painel do Administrador</h1>
          <p className="text-slate-500">Gerencie o acesso da sua equipe ao sistema de laudos.</p>
        </div>
      </div>

      {/* Master Password Change Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-indigo-500" />
            Alterar Minha Senha (Master)
          </h2>
          <p className="text-sm text-slate-500 mt-1">Atualize a sua própria senha de administrador do sistema.</p>
          {masterError && <p className="text-red-500 text-sm mt-2 font-medium">{masterError}</p>}
          {masterSuccess && <p className="text-emerald-600 text-sm mt-2 font-medium">{masterSuccess}</p>}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="password"
            placeholder="Nova senha (mín. 6)"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            className="w-full md:w-auto bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500/50 outline-none"
          />
          <input
            type="password"
            placeholder="Confirmar senha"
            value={masterConfirm}
            onChange={(e) => setMasterConfirm(e.target.value)}
            className="w-full md:w-auto bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500/50 outline-none"
          />
          <button
            onClick={async () => {
              setMasterError('');
              setMasterSuccess('');
              if (masterPassword.length < 6) {
                setMasterError('A senha deve ter no mínimo 6 caracteres.');
                return;
              }
              if (masterPassword !== masterConfirm) {
                setMasterError('As senhas não coincidem.');
                return;
              }
              setMasterLoading(true);
              try {
                const { error } = await supabase.auth.updateUser({ password: masterPassword });
                if (error) throw error;
                setMasterSuccess('Senha alterada com sucesso!');
                setMasterPassword('');
                setMasterConfirm('');
              } catch (err: any) {
                setMasterError(err.message || 'Erro ao alterar a senha.');
              } finally {
                setMasterLoading(false);
              }
            }}
            disabled={masterLoading || !masterPassword || !masterConfirm}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70 text-sm whitespace-nowrap"
          >
            {masterLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Atualizar'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulário de Criação */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-500" />
              Novo Usuário
            </h2>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-sm font-medium">
                {success}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome Completo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                    placeholder="João Silva"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                    placeholder="joao@exemplo.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha Padrão (Provisória)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                    minLength={6}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                    placeholder="Ex: Senha123"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70 text-sm"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Cadastrar Usuário
              </button>
            </form>
          </div>
        </div>

        {/* Lista de Usuários */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Usuários Cadastrados
              </h2>
              <button 
                onClick={fetchUsers} 
                disabled={loading}
                className="text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 py-1.5 px-3 rounded-lg transition-colors border border-slate-200"
              >
                Atualizar Lista
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-500" />
                  <p>Carregando usuários do Supabase...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <Users className="w-10 h-10 mb-3 opacity-50" />
                  <p>Nenhum usuário encontrado (além de você).</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-medium">Nome</th>
                      <th className="px-4 py-3 font-medium">E-mail</th>
                      <th className="px-4 py-3 font-medium">Senha</th>
                      <th className="px-4 py-3 font-medium text-center">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-800 font-medium">
                          {user.user_metadata?.name || 'Sem Nome'}
                          {user.email === 'pedrobirindelli@gmail.com' && (
                            <span className="ml-2 inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                              Admin
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">{user.email}</td>
                        <td className="px-4 py-3 text-slate-700 font-mono text-sm">
                          {user.user_metadata?.raw_password || '********'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {user.email_confirmed_at ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                              Confirmado
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleResetPassword(user.id, user.email)}
                              disabled={actionLoading === user.id}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-200"
                              title="Alterar Senha"
                            >
                              {actionLoading === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                            </button>
                            {user.email !== 'pedrobirindelli@gmail.com' && (
                              <button
                                onClick={() => handleDeleteUser(user.id, user.email)}
                                disabled={actionLoading === user.id}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                title="Excluir Usuário"
                              >
                                {actionLoading === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-400">
              * O backend requer que o SUPABASE_SERVICE_ROLE_KEY esteja configurado no Coolify.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
