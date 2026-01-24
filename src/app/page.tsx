"use client";

import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, Plus, Loader2, LogOut, Trash2 } from 'lucide-react';
import { supabase } from '@/app/lib/supabase'; // Caminho corrigido conforme estrutura src/app/lib

export default function UserManagement() {
  const [loadingUser, setLoadingUser] = useState(true);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);

  useEffect(() => {
    const loadSystem = async () => {
      setLoadingUser(true);
      
      // Obtém o usuário validado pelo Middleware
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Busca perfil para definir se é Admin (Regional)
        const { data: profile } = await supabase
          .from('usuarios')
          .select('perfil')
          .eq('email', user.email)
          .single();

        setUsuarioLogado({
          email: user.email,
          is_admin: profile?.perfil === 'Regional'
        });

        // Carrega lista inicial
        const { data: list } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false });
        if (list) setUsuarios(list);
      }
      
      setLoadingUser(false);
    };

    loadSystem();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Limpa cookies locais via redirecionamento total
    window.location.href = '/login';
  };

  if (loadingUser) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Sincronizando Sessão...</p>
      </div>
    );
  }

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
        <button 
          onClick={handleLogout} 
          className="flex items-center gap-3 p-3 text-slate-400 hover:text-white hover:bg-red-900/20 hover:text-red-400 rounded-xl transition-all"
        >
          <LogOut size={20} /> <span>Sair do Sistema</span>
        </button>
      </aside>

      <main className="flex-1 p-10 overflow-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Gestão de Usuários</h1>
            <p className="text-slate-500 font-medium">Logado como: <span className="text-blue-600 font-bold">{usuarioLogado?.email}</span></p>
          </div>
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
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${
                      user.perfil === 'Regional' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {user.perfil}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {usuarioLogado?.is_admin && (
                      <button className="text-red-400 font-bold hover:text-red-600 transition-colors flex items-center gap-1 ml-auto">
                        <Trash2 size={16} /> Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}