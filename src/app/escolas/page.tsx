"use client";

import React, { useState, useEffect } from 'react';
import { School, ShieldCheck, Plus, Loader2, ArrowLeft, Building2, MapPin, User, Phone, Mail } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { createEscola } from '../actions';
import Link from 'next/link';

export default function EscolasPage() {
  const [loading, setLoading] = useState(true);
  const [escolas, setEscolas] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // State atualizado: polo começa como 0 ou vazio
  const [formData, setFormData] = useState({ 
    nome: '', 
    cidade: '', 
    estado: '',
    email: '',
    telefone: '',
    diretor: '',
    polo: '' // Mantemos como string no input para facilitar a digitação, mas enviamos como number
  });

  useEffect(() => {
    checkPermissionAndLoad();
  }, []);

  const checkPermissionAndLoad = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }

    const { data: profile } = await supabase.from('usuarios').select('perfil').eq('email', user.email).single();
    if (profile?.perfil !== 'Regional') {
      alert("Acesso negado.");
      window.location.href = '/';
      return;
    }
    loadEscolas();
    setLoading(false);
  };

  const loadEscolas = async () => {
    // Ordena por Polo (numérico)
    const { data } = await supabase.from('escolas').select('*').order('polo', { ascending: true });
    if (data) setEscolas(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // CONVERSÃO: Garante que estamos enviando um número inteiro
    const dadosParaEnvio = {
        ...formData,
        polo: parseInt(formData.polo) // Converte string para inteiro
    };

    const res = await createEscola(dadosParaEnvio);
    
    if (res.error) alert(res.error);
    else {
      alert("Escola criada!");
      setShowModal(false);
      setFormData({ nome: '', cidade: '', estado: '', email: '', telefone: '', diretor: '', polo: '' });
      loadEscolas();
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans">
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-2 mb-10 border-b border-slate-700 pb-4">
          <ShieldCheck className="text-blue-400" />
          <span className="text-xl font-bold">SGE-GSU</span>
        </div>
        <Link href="/" className="flex items-center gap-3 p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl mb-2 transition-all">
          <ArrowLeft size={20} /> <span>Voltar</span>
        </Link>
        <div className="flex items-center gap-3 p-3 bg-blue-600 rounded-xl text-white font-medium shadow-lg">
          <School size={20} /> <span>Escolas</span>
        </div>
      </aside>

      <main className="flex-1 p-10 overflow-auto">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-black">Escolas Registradas</h1>
          <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg">
            <Plus size={20} /> Nova Escola
          </button>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {escolas.map(escola => (
            <div key={escola.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                    <div className="p-3 bg-blue-50 w-fit rounded-xl text-blue-600 h-fit">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">{escola.nome}</h3>
                        {/* Exibição do Polo como número */}
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-1 rounded-md">
                            Polo {escola.polo}
                        </span>
                    </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-slate-600 border-t pt-4 border-slate-50">
                <p className="flex items-center gap-2"><MapPin size={16} className="text-slate-400"/> {escola.cidade} - {escola.estado}</p>
                <p className="flex items-center gap-2"><User size={16} className="text-slate-400"/> Dir. {escola.diretor}</p>
                <p className="flex items-center gap-2"><Phone size={16} className="text-slate-400"/> {escola.telefone}</p>
                <p className="flex items-center gap-2 truncate"><Mail size={16} className="text-slate-400"/> {escola.email}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
             <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl animate-in zoom-in duration-200">
                <h3 className="font-black text-xl mb-6 text-slate-800">Nova Escola</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Linha 1: Nome e Polo */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nome da Escola</label>
                        <input required value={formData.nome} onChange={e=>setFormData({...formData, nome: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 ring-blue-500 outline-none"/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Polo Regional (Nº)</label>
                        {/* INPUT TYPE NUMBER */}
                        <input 
                            required 
                            type="number" 
                            min="1"
                            value={formData.polo} 
                            onChange={e=>setFormData({...formData, polo: e.target.value})} 
                            className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 ring-blue-500 outline-none" 
                            placeholder="Ex: 1"
                        />
                    </div>
                  </div>

                  {/* Demais campos iguais... */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Diretor(a)</label>
                        <input required value={formData.diretor} onChange={e=>setFormData({...formData, diretor: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 ring-blue-500 outline-none"/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">E-mail</label>
                        <input required type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 ring-blue-500 outline-none"/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Telefone</label>
                        <input required value={formData.telefone} onChange={e=>setFormData({...formData, telefone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 ring-blue-500 outline-none"/>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Cidade</label>
                        <input required value={formData.cidade} onChange={e=>setFormData({...formData, cidade: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 ring-blue-500 outline-none"/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">UF</label>
                        <input required maxLength={2} value={formData.estado} onChange={e=>setFormData({...formData, estado: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 ring-blue-500 outline-none"/>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                      <button type="button" onClick={() => setShowModal(false)} className="flex-1 text-slate-500 font-bold p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
                      <button type="submit" className="flex-1 bg-blue-600 text-white font-bold p-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">Salvar Escola</button>
                  </div>
                </form>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}