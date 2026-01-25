"use client";

import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, Plus, Loader2, LogOut, Trash2, X, School } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { createNewUser, deleteSystemUser } from './actions';
import Link from 'next/link';

export default function UserManagement() {
  const [loadingUser, setLoadingUser] = useState(true);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [escolas, setEscolas] = useState<any[]>([]); // Lista para o Select
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [formData, setFormData] = useState({
    nome: '', email: '', senha: '', perfil: 'Operacional', escola_id: ''
  });

  // Função inteligente que carrega usuários baseado no perfil
  const loadUsers = async (userProfile: any) => {
    let query = supabase.from('usuarios').select('*, escolas(nome)').order('created_at', { ascending: false });

    // REGRA DE OURO: Se for Operacional, filtra pela escola dele
    if (userProfile.perfil === 'Operacional' && userProfile.escola_id) {
      query = query.eq('escola_id', userProfile.escola_id);
    }

    const { data: list } = await query;
    if (list) setUsuarios(list);
  };

  // Carrega lista de escolas para o Admin poder escolher no Modal
  const loadEscolas = async () => {
    const { data } = await supabase.from('escolas').select('id, nome');
    if (data) setEscolas(data);
  };

  useEffect(() => {
    const loadSystem = async () => {
      setLoadingUser(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Busca perfil completo (incluindo a escola_id do usuario logado)
        const { data: profile } = await supabase
          .from('usuarios')
          .select('perfil, escola_id')
          .eq('email', user.email)
          .single();

        const userData = {
          email: user.email,
          is_admin: profile?.perfil === 'Regional',
          escola_id: profile?.escola_id,
          perfil: profile?.perfil
        };

        setUsuarioLogado(userData);
        
        // Se for admin, carrega as escolas para preencher o <select>
        if (userData.is_admin) await loadEscolas();
        
        await loadUsers(userData);
      }
      setLoadingUser(false);
    };
    loadSystem();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingCreate(true);
    try {
      const resultado = await createNewUser(formData);
      if (resultado.error) alert('Erro: ' + resultado.error);
      else {
        alert('Usuário criado!');
        setShowModal(false);
        setFormData({ nome: '', email: '', senha: '', perfil: 'Operacional', escola_id: '' });
        loadUsers(usuarioLogado);
      }
    } catch (error: any) { alert(error.message); } 
    finally { setLoadingCreate(false); }
  };

  const handleDelete = async (userId: string, userName: string) => {
     if(!window.confirm(`Remover acesso de ${userName}?`)) return;
     setLoadingUser(true);
     await deleteSystemUser(userId);
     loadUsers(usuarioLogado);
     setLoadingUser(false);
  };

  if (loadingUser) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans">
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-2 mb-10 border-b border-slate-700 pb-4">
          <ShieldCheck className="text-blue-400" />
          <span className="text-xl font-bold">SGE-GSU</span>
        </div>
        <nav className="flex-1 space-y-2">
          <div className="flex items-center gap-3 p-3 bg-blue-600 rounded-xl text-white font-medium shadow-lg">
            <Users size={20} /> <span>Usuários</span>
          </div>
          
          {/* Botão para ir para Escolas (Só Admin vê) */}
          {usuarioLogado?.is_admin && (
            <Link href="/escolas" className="flex items-center gap-3 p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
              <School size={20} /> <span>Escolas</span>
            </Link>
          )}
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-3 p-3 text-slate-400 hover:text-white hover:bg-red-900/20 rounded-xl transition-all">
          <LogOut size={20} /> <span>Sair</span>
        </button>
      </aside>

      <main className="flex-1 p-10 overflow-auto relative">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black">Gestão de Usuários</h1>
            <p className="text-slate-500">Logado como: <span className="text-blue-600 font-bold">{usuarioLogado?.email}</span></p>
          </div>
          {usuarioLogado?.is_admin && (
            <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg">
              <Plus size={20} /> Novo Usuário
            </button>
          )}
        </header>

        <div className="bg-white rounded-[32px] shadow-xl border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                <th className="px-8 py-5">Nome</th>
                <th className="px-8 py-5">Escola</th>
                <th className="px-8 py-5">Perfil</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {usuarios.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50">
                  <td className="px-8 py-6 font-bold text-slate-700">{user.nome}</td>
                  <td className="px-8 py-6 text-slate-500">
                    {user.escolas?.nome || <span className="text-slate-300 italic">Sem vínculo</span>}
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${user.perfil === 'Regional' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                      {user.perfil}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {usuarioLogado?.is_admin && (
                      <button onClick={() => handleDelete(user.id, user.nome)} className="text-red-400 font-bold hover:text-red-600 flex items-center gap-1 ml-auto">
                        <Trash2 size={16} /> Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Novo Usuário */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-lg">Novo Usuário</h3>
                <button onClick={() => setShowModal(false)}><X className="text-slate-400"/></button>
              </div>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <input required placeholder="Nome" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm"/>
                <input required placeholder="E-mail" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm"/>
                <input required type="password" placeholder="Senha" value={formData.senha} onChange={e => setFormData({...formData, senha: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm"/>
                
                {/* SELECT DE ESCOLAS (NOVO) */}
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase">Vincular Escola</label>
                   <select 
                      value={formData.escola_id} 
                      onChange={e => setFormData({...formData, escola_id: e.target.value})}
                      className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm mt-1"
                   >
                      <option value="">Selecione uma escola...</option>
                      {escolas.map(esc => (
                        <option key={esc.id} value={esc.id}>{esc.nome}</option>
                      ))}
                   </select>
                </div>

                {/* Seletor de Perfil */}
                <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setFormData({...formData, perfil: 'Operacional'})} className={`p-3 rounded-xl border text-sm font-bold ${formData.perfil === 'Operacional' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white'}`}>Operacional</button>
                    <button type="button" onClick={() => setFormData({...formData, perfil: 'Regional'})} className={`p-3 rounded-xl border text-sm font-bold ${formData.perfil === 'Regional' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white'}`}>Regional (Admin)</button>
                </div>

                <button disabled={loadingCreate} type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl mt-4">
                   {loadingCreate ? <Loader2 className="animate-spin mx-auto"/> : 'Criar Usuário'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}