"use client";

import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, Plus, Loader2, LogOut, X, Trash2 } from 'lucide-react';
// Ajustado para o caminho que funcionou no seu projeto
import { supabase } from './lib/supabase'; 
import { useRouter } from 'next/navigation';

export default function UserManagement() {
  const router = useRouter();

  // --- ESTADOS DO SISTEMA ---
  const [loadingUser, setLoadingUser] = useState(true);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);

  // --- ESTADOS DO MODAL E FORMULÁRIO ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [perfil, setPerfil] = useState('Escola');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  // --- CARREGAMENTO INICIAL (SESSÃO E DADOS) ---
  useEffect(() => {
    const initPage = async () => {
      setLoadingUser(true);
      
      // 1. Busca o usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // 2. Busca o perfil na tabela 'usuarios' do banco de dados
        const { data: profile } = await supabase
          .from('usuarios')
          .select('perfil')
          .eq('email', user.email)
          .single();

        setUsuarioLogado({
          email: user.email,
          // Define se é admin baseado no perfil 'Regional'
          is_admin: profile?.perfil === 'Regional'
        });

        // 3. Carrega a lista de usuários cadastrados
        await fetchUsuarios();
      }
      
      setLoadingUser(false);
    };

    initPage();
  }, []);

  // --- FUNÇÃO PARA BUSCAR USUÁRIOS NO BANCO ---
  const fetchUsuarios = async () => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setUsuarios(data);
  };

  // --- FUNÇÃO DE LOGOUT (SAIR) CORRIGIDA ---
  const handleLogout = async () => {
    try {
      console.log("[SISTEMA] Encerrando sessão...");
      
      // 1. Invalida a sessão no Supabase Auth
      await supabase.auth.signOut();

      // 2. Limpa o armazenamento local para garantir
      localStorage.clear();
      sessionStorage.clear();

      // 3. Redireciona forçando o recarregamento da página (Crucial para o Middleware)
      window.location.href = '/login';
      
    } catch (err) {
      console.error("Erro ao sair:", err);
      window.location.href = '/login';
    }
  };

  // --- FUNÇÃO PARA SALVAR NOVO USUÁRIO ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true);
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem!");
      setLoadingAction(false);
      return;
    }

    const { error: insertError } = await supabase
      .from('usuarios')
      .insert([{ nome, email, perfil }]);

    if (insertError) {
      setError("Erro ao salvar: " + insertError.message);
    } else {
      setIsModalOpen(false);
      setNome(''); setEmail(''); setPassword(''); setConfirmPassword('');
      await fetchUsuarios();
      alert("Usuário cadastrado com sucesso!");
    }
    setLoadingAction(false);
  };

  // --- TELA DE CARREGAMENTO INICIAL ---
  if (loadingUser) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Sincronizando Sessão...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-2 mb-10 border-b border-slate-700 pb-4">
          <ShieldCheck className="text-blue-400" />
          <span className="text-xl font-bold tracking-tight uppercase">SGE-GSU</span>
        </div>

        <nav className="space-y-4 flex-1">
          <div className="flex items-center gap-3 p-3 bg-blue-600 rounded-xl text-white font-medium shadow-lg">
            <Users size={20} /> <span>Usuários</span>
          </div>
        </nav>

        {/* BOTÃO SAIR */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 p-3 text-slate-400 hover:text-white hover:bg-red-900/20 hover:text-red-400 rounded-xl transition-all"
        >
          <LogOut size={20} /> <span>Sair do Sistema</span>
        </button>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-10 overflow-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Usuários</h1>
            <p className="text-slate-500 font-medium">Logado como: <span className="text-blue-600 font-bold">{usuarioLogado?.email}</span></p>
          </div>

          {/* BOTÃO NOVO SÓ PARA ADMINS */}
          {usuarioLogado?.is_admin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 font-bold"
            >
              <Plus size={20} /> Novo Usuário
            </button>
          )}
        </header>

        {/* TABELA DE DADOS */}
        <div className="bg-white rounded-[32px] shadow-xl border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                <th className="px-8 py-5">Nome completo</th>
                <th className="px-8 py-5">E-mail</th>
                <th className="px-8 py-5">Perfil</th>
                <th className="px-8 py-5 text-right">Controle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium text-sm">
              {usuarios.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6 text-slate-700 font-bold">{user.nome}</td>
                  <td className="px-8 py-6 text-slate-500">{user.email}</td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${
                      user.perfil === 'Regional' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {user.perfil}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {/* SÓ ADMINS PODEM EXCLUIR */}
                    {usuarioLogado?.is_admin ? (
                      <button
                        onClick={async () => {
                          if (confirm(`Deseja remover ${user.nome}?`)) {
                            await supabase.from('usuarios').delete().eq('id', user.id);
                            fetchUsuarios();
                          }
                        }}
                        className="text-red-400 font-bold hover:text-red-600 transition-colors flex items-center gap-1 ml-auto"
                      >
                        <Trash2 size={16} /> Excluir
                      </button>
                    ) : (
                      <span className="text-slate-300 italic text-xs">Sem permissão</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MODAL DE CADASTRO */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md">
              <div className="p-10">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-slate-900">Novo Cadastro</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                  </button>
                </div>
                
                <form className="space-y-4" onSubmit={handleSave}>
                  <input type="text" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 transition-all bg-slate-50" required />
                  <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 transition-all bg-slate-50" required />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 transition-all bg-slate-50" required />
                    <input type="password" placeholder="Confirmar" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none focus:border-blue-400 transition-all bg-slate-50" required />
                  </div>

                  <select value={perfil} onChange={(e) => setPerfil(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none font-bold bg-slate-50">
                    <option value="Escola">Perfil: Escola</option>
                    <option value="Regional">Perfil: Regional</option>
                  </select>

                  {error && <div className="text-red-600 text-[10px] font-black uppercase text-center bg-red-50 p-2 rounded-lg">{error}</div>}

                  <button type="submit" disabled={loadingAction} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 disabled:bg-slate-300">
                    {loadingAction ? <Loader2 className="animate-spin mx-auto" /> : 'Finalizar Registro'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}