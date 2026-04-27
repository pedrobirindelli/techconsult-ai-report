import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, UserPlus, Users, Loader2, KeyRound, Mail, User } from 'lucide-react';

export function AdminPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

      // Chama a nova rota do backend que construímos no Flask
      // Utilizamos o /api/admin/users
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
      // setError('Não foi possível carregar a lista de usuários. ' + err.message);
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

      setSuccess(`Usuário ${formData.name} criado com sucesso! O e-mail já está pré-confirmado e o usuário terá que alterar a senha no primeiro acesso.`);
      setFormData({ name: '', email: '', password: '' });
      fetchUsers(); // Recarrega a lista
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-fade-in">
      <div className="flex items-center gap-4 border-b border-white/10 pb-6">
        <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/30">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Painel do Administrador</h1>
          <p className="text-slate-400">Gerencie o acesso da sua equipe ao sistema de laudos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulário de Criação */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-400" />
              Novo Usuário
            </h2>

            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome Completo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                    placeholder="João Silva"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">E-mail</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                    placeholder="joao@exemplo.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Senha Padrão (Provisória)</label>
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
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                    placeholder="Ex: Senha123"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  O usuário será forçado a trocar essa senha no primeiro acesso.
                </p>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-4 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-70 text-sm"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Cadastrar Usuário
              </button>
            </form>
          </div>
        </div>

        {/* Lista de Usuários */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Usuários Cadastrados no Banco
              </h2>
              <button 
                onClick={fetchUsers} 
                disabled={loading}
                className="text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 py-1.5 px-3 rounded-lg transition-colors"
              >
                Atualizar Lista
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-xl border border-white/5 bg-slate-900/30">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-500" />
                  <p>Carregando usuários do Supabase...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                  <Users className="w-10 h-10 mb-3 opacity-50" />
                  <p>Nenhum usuário encontrado (além de você).</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-800/80 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-medium">Nome</th>
                      <th className="px-4 py-3 font-medium">E-mail</th>
                      <th className="px-4 py-3 font-medium">Criado Em</th>
                      <th className="px-4 py-3 font-medium text-center">Status Confirmação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-white font-medium">
                          {user.user_metadata?.name || 'Sem Nome'}
                          {user.email === 'pedrobirindelli@gmail.com' && (
                            <span className="ml-2 inline-flex items-center rounded-md bg-indigo-400/10 px-2 py-0.5 text-xs font-medium text-indigo-400 ring-1 ring-inset ring-indigo-400/30">
                              Admin
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">{user.email}</td>
                        <td className="px-4 py-3 text-slate-400">
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {user.email_confirmed_at ? (
                            <span className="inline-flex items-center rounded-md bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-400/30">
                              Confirmado
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-amber-400/10 px-2 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-400/30">
                              Pendente
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/5 text-xs text-slate-500">
              * O backend requer que o SUPABASE_SERVICE_ROLE_KEY esteja configurado no Coolify para listar/criar os usuários corretamente.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
