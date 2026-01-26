"use client";

import React, { useState, useEffect } from 'react';
// Adicionei icones de filtro e busca (Filter, Search, X)
import { School, ShieldCheck, Plus, Loader2, ArrowLeft, Building2, MapPin, User, Phone, Mail, Edit, Filter, Search, X } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { createEscola, updateEscola } from '../actions';
import Link from 'next/link';

export default function EscolasPage() {
  const [loading, setLoading] = useState(true);
  const [escolas, setEscolas] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // --- NOVOS ESTADOS DE FILTRO ---
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroPolo, setFiltroPolo] = useState('');
  const [filtroDiretor, setFiltroDiretor] = useState('');

  const [formData, setFormData] = useState({ 
    id: '', nome: '', cidade: '', estado: '', email: '', telefone: '', diretor: '', polo: '' 
  });

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('usuarios').select('perfil').eq('email', user.email).single();
        if (profile?.perfil === 'Regional') {
          loadEscolas();
          setLoading(false);
          return;
        }
      }
      window.location.href = '/';
    };
    init();
  }, []);

  const loadEscolas = async () => {
    const { data } = await supabase.from('escolas').select('*').order('polo', { ascending: true });
    if (data) setEscolas(data);
  };

  // --- LÓGICA DE FILTRAGEM ---
  const escolasFiltradas = escolas.filter(escola => {
    const matchNome = escola.nome.toLowerCase().includes(filtroNome.toLowerCase());
    const matchDiretor = escola.diretor?.toLowerCase().includes(filtroDiretor.toLowerCase()) ?? true;
    // Para o polo, convertemos para string para permitir busca parcial (ex: digitar "1" acha polo 1 e 10)
    const matchPolo = filtroPolo ? escola.polo.toString().includes(filtroPolo) : true;

    return matchNome && matchDiretor && matchPolo;
  });

  const limparFiltros = () => {
    setFiltroNome('');
    setFiltroPolo('');
    setFiltroDiretor('');
  }

  // --- ACTIONS ---

  const openCreate = () => {
    setFormData({ id: '', nome: '', cidade: '', estado: '', email: '', telefone: '', diretor: '', polo: '' });
    setIsEditing(false);
    setShowModal(true);
  }

  const openEdit = (escola: any) => {
    setFormData({ ...escola, polo: escola.polo.toString() });
    setIsEditing(true);
    setShowModal(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, polo: parseInt(formData.polo) };
    
    let res;
    if (isEditing) {
      res = await updateEscola(formData.id, payload);
    } else {
      res = await createEscola(payload);
    }

    if (res.error) alert(res.error);
    else {
      alert(isEditing ? "Escola atualizada!" : "Escola criada!");
      setShowModal(false);
      loadEscolas();
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-2 mb-10 pb-4 border-b border-slate-700">
          <ShieldCheck className="text-blue-400" /><span className="text-xl font-bold">SGE-GSU</span>
        </div>
        <Link href="/" className="flex items-center gap-3 p-3 text-slate-400 hover:bg-slate-800 rounded-xl mb-2"><ArrowLeft size={20} /> Voltar</Link>
        <div className="flex items-center gap-3 p-3 bg-blue-600 rounded-xl font-medium"><School size={20} /> Escolas</div>
      </aside>

      <main className="flex-1 p-10 overflow-auto">
        <header className="flex justify-between mb-8">
          <h1 className="text-3xl font-black">Escolas</h1>
          <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex gap-2 shadow-lg"><Plus /> Nova Escola</button>
        </header>

        {/* --- BARRA DE FILTROS --- */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex items-center gap-2 text-slate-500 font-bold text-sm min-w-fit">
                <Filter size={18} /> Filtros:
            </div>

            {/* Filtro Nome */}
            <div className="relative w-full md:w-auto flex-1">
                <Search size={16} className="absolute left-3 top-3 text-slate-400"/>
                <input 
                    placeholder="Buscar por nome da escola..." 
                    value={filtroNome}
                    onChange={e => setFiltroNome(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 pl-10 p-2.5 rounded-xl text-sm focus:ring-blue-500 outline-none"
                />
            </div>

            {/* Filtro Diretor */}
            <div className="relative w-full md:w-auto flex-1">
                <User size={16} className="absolute left-3 top-3 text-slate-400"/>
                <input 
                    placeholder="Buscar por diretor..." 
                    value={filtroDiretor}
                    onChange={e => setFiltroDiretor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 pl-10 p-2.5 rounded-xl text-sm focus:ring-blue-500 outline-none"
                />
            </div>

            {/* Filtro Polo */}
            <div className="relative w-full md:w-40">
                <input 
                    placeholder="Polo (Nº)" 
                    type="number"
                    value={filtroPolo}
                    onChange={e => setFiltroPolo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm focus:ring-blue-500 outline-none"
                />
            </div>

            {/* Botão Limpar */}
            {(filtroNome || filtroPolo || filtroDiretor) && (
                <button onClick={limparFiltros} className="flex items-center gap-1 text-sm text-red-500 font-bold hover:bg-red-50 px-3 py-2 rounded-xl transition-colors ml-auto md:ml-0">
                    <X size={16} /> Limpar
                </button>
            )}
        </div>

        {/* --- LISTA DE ESCOLAS (FILTRADA) --- */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {escolasFiltradas.length === 0 && (
             <div className="col-span-full text-center py-20 text-slate-400 font-medium">Nenhuma escola encontrada com esses filtros.</div>
          )}

          {escolasFiltradas.map(escola => (
            <div key={escola.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3 group hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="p-3 bg-blue-50 rounded-xl text-blue-600 h-fit"><Building2 size={24} /></div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">{escola.nome}</h3>
                    <span className="text-xs font-bold uppercase text-purple-600 bg-purple-50 px-2 py-1 rounded-md">Polo {escola.polo}</span>
                  </div>
                </div>
                {/* Botão de Editar */}
                <button onClick={() => openEdit(escola)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={18}/></button>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-slate-600 border-t pt-4 border-slate-50">
                <p className="flex gap-2"><MapPin size={16} className="text-slate-400"/> {escola.cidade}-{escola.estado}</p>
                <p className="flex gap-2"><User size={16} className="text-slate-400"/> {escola.diretor}</p>
                <p className="flex gap-2"><Phone size={16} className="text-slate-400"/> {escola.telefone}</p>
                <p className="flex gap-2 truncate"><Mail size={16} className="text-slate-400"/> {escola.email}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Modal (Mantido Igual) */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
             <div className="bg-white rounded-3xl p-6 w-full max-w-2xl animate-in zoom-in duration-200">
                <h3 className="font-black text-xl mb-6">{isEditing ? 'Editar Escola' : 'Nova Escola'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase ml-1">Nome</label><input required value={formData.nome} onChange={e=>setFormData({...formData, nome: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl"/></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Polo (Nº)</label><input required type="number" min="1" value={formData.polo} onChange={e=>setFormData({...formData, polo: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl"/></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Diretor</label><input required value={formData.diretor} onChange={e=>setFormData({...formData, diretor: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl"/></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">E-mail</label><input required type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl"/></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Telefone</label><input required value={formData.telefone} onChange={e=>setFormData({...formData, telefone: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl"/></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2"><label className="text-xs font-bold text-slate-500 uppercase ml-1">Cidade</label><input required value={formData.cidade} onChange={e=>setFormData({...formData, cidade: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl"/></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">UF</label><input required maxLength={2} value={formData.estado} onChange={e=>setFormData({...formData, estado: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl"/></div>
                  </div>
                  <div className="flex gap-3 pt-4">
                      <button type="button" onClick={() => setShowModal(false)} className="flex-1 text-slate-500 font-bold p-3 bg-slate-100 rounded-xl">Cancelar</button>
                      <button type="submit" className="flex-1 bg-blue-600 text-white font-bold p-3 rounded-xl">Salvar</button>
                  </div>
                </form>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}