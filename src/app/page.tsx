"use client"; // Mantém como Client Component

import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, Plus, Loader2, LogOut, Trash2, X } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { createNewUser, deleteSystemUser } from './actions'; // <--- IMPORTANTE: Importe a action criada

export default function UserManagement() {
  const [loadingUser, setLoadingUser] = useState(true);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);

  // Estados para o Modal
  const [showModal, setShowModal] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    perfil: 'Operacional'
  });

  const handleDelete = async (userId: string, userName: string) => {
    const confirmacao = window.confirm(`Tem certeza que deseja remover o acesso de "${userName}"?\n\nEssa ação não pode ser desfeita.`);

    if (confirmacao) {
      try {
        setLoadingUser(true); // Mostra loading rápido
        const resultado = await deleteSystemUser(userId);

        if (resultado.error) {
          alert(resultado.error);
        } else {
          alert('Usuário removido com sucesso!');
          loadUsers(); // Atualiza a lista
        }
      } catch (error) {
        alert('Erro ao tentar excluir.');
      } finally {
        setLoadingUser(false);
      }
    }
  };

  const loadUsers = async () => {
    const { data: list } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false });
    if (list) setUsuarios(list);
  };

  useEffect(() => {
    const loadSystem = async () => {
      setLoadingUser(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('usuarios').select('perfil').eq('email', user.email).single();
        setUsuarioLogado({ email: user.email, is_admin: profile?.perfil === 'Regional' });
        await loadUsers();
      }
      setLoadingUser(false);
    };
    loadSystem();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // --- FUNÇÃO ATUALIZADA ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingCreate(true);

    try {
      // Chama a Server Action em vez de fazer tudo no front
      const resultado = await createNewUser(formData);

      if (resultado.error) {
        alert('Erro: ' + resultado.error);
      } else {
        alert('Usuário criado com sucesso e pronto para logar!');
        setShowModal(false);
        setFormData({ nome: '', email: '', senha: '', perfil: 'Operacional' });
        loadUsers(); // Recarrega a lista
      }
    } catch (error: any) {
      alert('Erro inesperado: ' + error.message);
    } finally {
      setLoadingCreate(false);
    }
  };

  if (loadingUser) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-2 mb-10 border-b border-slate-700 pb-4">
          <ShieldCheck className="text-blue-400" />
          <span className="text-xl font-bold tracking-tight">SGE-GSU</span>
        </div>
        <nav className="flex-1 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-blue-600 rounded-xl text-white font-medium shadow-lg shadow-blue-900/20">
            <Users size={20} /> <span>Usuários</span>
          </div>
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-3 p-3 text-slate-400 hover:text-white hover:bg-red-900/20 rounded-xl transition-all">
          <LogOut size={20} /> <span>Sair</span>
        </button>
      </aside>

      <main className="flex-1 p-10 overflow-auto relative">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Gestão de Usuários</h1>
            <p className="text-slate-500 font-medium">Logado como: <span className="text-blue-600 font-bold">{usuarioLogado?.email}</span></p>
          </div>
          {usuarioLogado?.is_admin && (
            <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95">
              <Plus size={20} /> Novo Usuário
            </button>
          )}
        </header>

        <div className="bg-white rounded-[32px] shadow-xl border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                <th className="px-8 py-5">Nome</th>
                <th className="px-8 py-5">E-mail</th>
                <th className="px-8 py-5">Perfil</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium text-sm">
              {usuarios.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6 text-slate-700 font-bold">{user.nome}</td>
                  <td className="px-8 py-6 text-slate-500">{user.email}</td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${user.perfil === 'Regional' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                      {user.perfil}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {usuarioLogado?.is_admin && (
                      <button
                        // ADICIONE O ONCLICK AQUI:
                        onClick={() => handleDelete(user.id, user.nome)}
                        className="text-red-400 font-bold hover:text-red-600 transition-colors flex items-center gap-1 ml-auto"
                      >
                        <Trash2 size={16} /> Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal (Mantive a estrutura visual idêntica) */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-black text-lg text-slate-800">Novo Usuário</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                {/* Inputs do Formulário (Nome, Email, Senha, Perfil) */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome Completo</label>
                  <input required type="text" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600" placeholder="Ex: João Silva" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">E-mail</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600" placeholder="nome@empresa.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Senha</label>
                  <input required type="password" value={formData.senha} onChange={e => setFormData({ ...formData, senha: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600" placeholder="******" minLength={6} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Perfil</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setFormData({ ...formData, perfil: 'Operacional' })} className={`p-3 rounded-xl border text-sm font-bold transition-all ${formData.perfil === 'Operacional' ? 'bg-orange-50 border-orange-200 text-orange-700 ring-1 ring-orange-300' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}>Operacional</button>
                    <button type="button" onClick={() => setFormData({ ...formData, perfil: 'Regional' })} className={`p-3 rounded-xl border text-sm font-bold transition-all ${formData.perfil === 'Regional' ? 'bg-purple-50 border-purple-200 text-purple-700 ring-1 ring-purple-300' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}>Regional</button>
                  </div>
                </div>
                <div className="pt-4">
                  <button disabled={loadingCreate} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                    {loadingCreate ? <Loader2 className="animate-spin" /> : <><Plus size={20} /> Criar Usuário</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );


}