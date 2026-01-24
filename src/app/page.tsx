"use client";
import React, { useState, useEffect } from 'react';
import { Users, School, ShieldCheck, Plus, X, Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase'; // Importando a conexão que criamos

export default function UserManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [usuarioLogado, setUsuarioLogado] = useState({ is_admin: true }); // provisotiro até sistema de login funcionar

  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<any[]>([]); // Lista de usuários do banco

  // Campos do formulário
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [perfil, setPerfil] = useState('Escola');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  // FUNÇÃO PARA BUSCAR USUÁRIOS DO SUPABASE
  const fetchUsuarios = async () => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setUsuarios(data);
  };

  // Carregar usuários assim que abrir a página
  useEffect(() => {
    fetchUsuarios();
  }, []);

  // FUNÇÃO PARA SALVAR NO SUPABASE
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("As senhas não coincidem!");
      setLoading(false);
      return;
    }

    // Enviando para a tabela 'usuarios' do Supabase
    const { error: insertError } = await supabase
      .from('usuarios')
      .insert([{ nome, email, perfil }]);

    if (insertError) {
      setError("Erro ao salvar: " + insertError.message);
    } else {
      setIsModalOpen(false);
      setNome(''); setEmail(''); setPassword(''); setConfirmPassword('');
      fetchUsuarios(); // Atualiza a lista automaticamente
      alert("Usuário salvo no Supabase!");
    }
    setLoading(false);
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar (Igual ao anterior) */}
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-2 mb-10 border-b border-slate-700 pb-4">
          <ShieldCheck className="text-blue-400" />
          <span className="text-xl font-bold tracking-tight">SGE-GSU</span>
        </div>
        <nav className="space-y-4 flex-1">
          <div className="flex items-center gap-3 p-3 bg-blue-600 rounded-xl text-white font-medium">
            <Users size={20} /> <span>Usuários</span>
          </div>
        </nav>
      </aside>

      <main className="flex-1 p-10 overflow-auto bg-gray-50">
        <header className="flex justify-between items-end mb-10">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Gestão de Usuários</h1>

            {/* login 24-01-2026*/}
            {usuarioLogado?.is_admin && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
              >
                Novo Usuário
              </button>
            )}
          </div>
        </header>

        {/* TABELA DINÂMICA */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden text-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-slate-400 font-bold uppercase tracking-widest">
                <th className="px-8 py-5">Nome</th>
                <th className="px-8 py-5">E-mail</th>
                <th className="px-8 py-5">Perfil</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {usuarios.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-8 py-6 text-slate-700 font-bold">{user.nome}</td>
                  <td className="px-8 py-6 text-slate-500">{user.email}</td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${user.perfil === 'Regional' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                      {user.perfil}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right text-red-500 font-bold cursor-pointer hover:underline text-xs" onClick={async () => {
                    await supabase.from('usuarios').delete().eq('id', user.id);
                    fetchUsuarios();
                  }}>
                    Excluir
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-10">
                <h2 className="text-2xl font-black text-slate-900 mb-8">Novo Cadastro</h2>

                <form className="space-y-4" onSubmit={handleSave}>
                  <input type="text" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full px-5 py-3 rounded-2xl border border-slate-200 outline-none bg-slate-50" required />
                  <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-3 rounded-2xl border border-slate-200 outline-none bg-slate-50" required />

                  <div className="grid grid-cols-2 gap-4">
                    <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-5 py-3 rounded-2xl border border-slate-200 outline-none bg-slate-50" required />
                    <input type="password" placeholder="Confirmar" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-5 py-3 rounded-2xl border border-slate-200 outline-none bg-slate-50" required />
                  </div>

                  <select value={perfil} onChange={(e) => setPerfil(e.target.value)} className="w-full px-5 py-3 rounded-2xl border border-slate-200 outline-none bg-slate-50">
                    <option value="Escola">Escola</option>
                    <option value="Regional">Regional</option>
                  </select>

                  {error && <div className="text-red-600 text-xs font-bold uppercase">{error}</div>}

                  <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-3xl font-black shadow-lg flex justify-center items-center gap-2 uppercase tracking-widest text-sm disabled:bg-slate-400">
                    {loading ? <Loader2 className="animate-spin" /> : 'Finalizar Cadastro'}
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