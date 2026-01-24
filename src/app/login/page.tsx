"use client";

import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, Plus, Loader2, LogOut, X } from 'lucide-react';
// CORREÇÃO DO CAMINHO: Usando @ para garantir que o Next ache a pasta lib
import { supabase } from '@/app/lib/supabase'; 
import { useRouter } from 'next/navigation';

export default function UserManagement() {
  const router = useRouter();

  // --- ESTADOS DA INTERFACE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);

  // --- ESTADOS DO FORMULÁRIO ---
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [perfil, setPerfil] = useState('Escola');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  // --- CARREGAMENTO INICIAL ---
  useEffect(() => {
    const initPage = async () => {
      setLoadingUser(true);
      
      // 1. Pegamos o usuário da sessão
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // 2. Buscamos o perfil dele
        const { data: userData } = await supabase
          .from('usuarios')
          .select('perfil')
          .eq('email', user.email)
          .single();

        setUsuarioLogado({
          email: user.email,
          is_admin: userData?.perfil === 'Regional'
        });

        // 3. Carregamos a lista de usuários
        await fetchUsuarios();
      }
      
      setLoadingUser(false);
    };

    initPage();
  }, []);

  const fetchUsuarios = async () => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setUsuarios(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Força limpeza total para evitar o erro de redirecionamento que vimos nos logs
    window.location.href = '/login';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem!");
      setLoading(false);
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
    setLoading(false);
  };

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
          <span className="text-xl font-bold tracking-tight">SGE-GSU</span>
        </div>
        <nav className="space-y-4 flex-1">
          <div className="flex items-center gap-3 p-3 bg-blue-600 rounded-xl text-white font-medium shadow-lg">
            <Users size={20} /> <span>Usuários</span>
          </div>
        </nav>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
        >
          <LogOut size={20} /> <span>Sair</span>
        </button>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 p-10 overflow-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestão de Usuários</h1>
            <p className="text-slate-500 font-medium">Logado como: <span className="text-blue-600 font-bold">{usuarioLogado?.email}</span></p>
          </div>
          {usuarioLogado?.is_admin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 font-bold"
            >
              <Plus size={20} /> Novo Usuário
            </button>
          )}
        </header>

        {/* TABELA */}
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
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${
                      user.perfil === 'Regional' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {user.perfil}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button
                      onClick={async () => {
                        if (confirm(`Excluir ${user.nome}?`)) {
                          await supabase.from('usuarios').delete().eq('id', user.id);
                          fetchUsuarios();
                        }
                      }}
                      className="text-red-400 font-bold hover:text-red-600 transition-colors"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MODAL */}
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
                    <option value="Escola">Escola</option>
                    <option value="Regional">Regional</option>
                  </select>
                  {error && <div className="text-red-600 text-[10px] font-black uppercase text-center bg-red-50 p-2 rounded-lg">{error}</div>}
                  <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-lg transition-all hover:bg-blue-700 disabled:bg-slate-300">
                    {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Registrar'}
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