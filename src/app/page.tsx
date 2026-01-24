"use client";

import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, Plus, Loader2, LogOut, X, Trash2 } from 'lucide-react';
import { supabase } from '@/app/lib/supabase'; // Ajustado para o caminho com @

export default function UserManagement() {
  const [loadingUser, setLoadingUser] = useState(true);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      setLoadingUser(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('usuarios').select('perfil').eq('email', user.email).single();

        setUsuarioLogado({ email: user.email, is_admin: profile?.perfil === 'Regional' });
        
        const { data: list } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false });
        if (list) setUsuarios(list);
      }
      setLoadingUser(false);
    };
    init();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login'; // Limpeza total
  };

  if (loadingUser) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-slate-50">
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-10 border-b border-slate-700 pb-4">
          <ShieldCheck className="text-blue-400" />
          <span className="font-bold tracking-tight">SGE-GSU</span>
        </div>
        <nav className="flex-1">
            <div className="flex items-center gap-3 p-3 bg-blue-600 rounded-xl"><Users size={20}/> Usuários</div>
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-3 p-3 text-slate-400 hover:text-red-400 transition-all">
          <LogOut size={20} /> Sair
        </button>
      </aside>
      <main className="flex-1 p-10 overflow-auto">
        <h1 className="text-3xl font-black">Gestão de Usuários</h1>
        <p className="mb-8">Acesso: <span className="text-blue-600">{usuarioLogado?.email}</span></p>
        
        {/* TABELA E CONTEÚDO... */}
      </main>
    </div>
  );
}