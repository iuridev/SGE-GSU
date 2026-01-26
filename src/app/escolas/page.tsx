"use client";

import React, { useState, useEffect } from 'react';
// Adicionei 'Trash2' nos imports
import { School, ShieldCheck, Plus, Loader2, ArrowLeft, Building2, MapPin, User, Phone, Mail, Edit, Filter, Search, X, UserCheck, Trash2 } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
// Importe a nova função deleteEscola
import { createEscola, updateEscola, deleteEscola, getFiscais } from '../actions';
import Link from 'next/link';

export default function EscolasPage() {
  const [loading, setLoading] = useState(true);
  const [escolas, setEscolas] = useState<any[]>([]);
  const [fiscais, setFiscais] = useState<any[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroPolo, setFiltroPolo] = useState('');
  const [filtroDiretor, setFiltroDiretor] = useState('');

  const [formData, setFormData] = useState({ 
    id: '', nome: '', cidade: '', estado: '', email: '', telefone: '', diretor: '', polo: '',
    fiscal_id: '' 
  });

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: profile } = await supabase.from('usuarios').select('perfil').eq('email', user.email).single();
        if (profile?.perfil === 'Regional') {
          await loadEscolas();
          const listaFiscais = await getFiscais();
          setFiscais(listaFiscais);
          setLoading(false);
          return;
        }
    }
    window.location.href = '/';
  };

  const loadEscolas = async () => {
    const { data } = await supabase
        .from('escolas')
        .select('*, fiscais(nome, telefone)')
        .order('polo', { ascending: true });
    if (data) setEscolas(data);
  };

  const escolasFiltradas = escolas.filter(escola => {
    const matchNome = escola.nome.toLowerCase().includes(filtroNome.toLowerCase());
    const matchDiretor = escola.diretor?.toLowerCase().includes(filtroDiretor.toLowerCase()) ?? true;
    const matchPolo = filtroPolo ? escola.polo.toString().includes(filtroPolo) : true;
    return matchNome && matchDiretor && matchPolo;
  });
  
  const limparFiltros = () => { setFiltroNome(''); setFiltroPolo(''); setFiltroDiretor(''); }

  const openCreate = () => {
    setFormData({ id: '', nome: '', cidade: '', estado: '', email: '', telefone: '', diretor: '', polo: '', fiscal_id: '' });
    setIsEditing(false); setShowModal(true);
  }

  const openEdit = (escola: any) => {
    setFormData({ ...escola, polo: escola.polo.toString(), fiscal_id: escola.fiscal_id || '' });
    setIsEditing(true); setShowModal(true);
  }

  // --- NOVA FUNÇÃO DE EXCLUSÃO ---
  const handleDelete = async (id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja EXCLUIR a escola "${nome}"?\n\nEssa ação não pode ser desfeita.`)) {
        setLoading(true);
        const res = await deleteEscola(id);
        if (res.error) {
            alert(res.error);
        } else {
            alert("Escola excluída com sucesso!");
            await loadEscolas();
        }
        setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, polo: parseInt(formData.polo) };
    let res;
    if (isEditing) res = await updateEscola(formData.id, payload);
    else res = await createEscola(payload);

    if (res.error) alert(res.error);
    else { alert("Salvo!"); setShowModal(false); loadEscolas(); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-2 mb-10 pb-4 border-b border-slate-700"><ShieldCheck className="text-blue-400" /><span className="text-xl font-bold">SGE-GSU</span></div>
        <Link href="/" className="flex items-center gap-3 p-3 text-slate-400 hover:bg-slate-800 rounded-xl mb-2"><ArrowLeft size={20} /> Voltar</Link>
        <div className="flex items-center gap-3 p-3 bg-blue-600 rounded-xl font-medium"><School size={20} /> Escolas</div>
        <Link href="/fiscais" className="flex items-center gap-3 p-3 text-slate-400 hover:bg-slate-800 rounded-xl mt-2"><UserCheck size={20} /> Gerir Fiscais</Link>
      </aside>

      <main className="flex-1 p-10 overflow-auto">
        <header className="flex justify-between mb-8">
          <h1 className="text-3xl font-black">Escolas</h1>
          <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex gap-2 shadow-lg"><Plus /> Nova Escola</button>
        </header>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex items-center gap-2 text-slate-500 font-bold text-sm"><Filter size={18} /> Filtros:</div>
            <div className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><input placeholder="Nome da escola..." value={filtroNome} onChange={e => setFiltroNome(e.target.value)} className="w-full bg-slate-50 border border-slate-200 pl-10 p-2.5 rounded-xl text-sm outline-none"/></div>
            <div className="relative flex-1"><User size={16} className="absolute left-3 top-3 text-slate-400"/><input placeholder="Diretor..." value={filtroDiretor} onChange={e => setFiltroDiretor(e.target.value)} className="w-full bg-slate-50 border border-slate-200 pl-10 p-2.5 rounded-xl text-sm outline-none"/></div>
            <div className="relative w-40"><input placeholder="Polo (Nº)" type="number" value={filtroPolo} onChange={e => setFiltroPolo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm outline-none"/></div>
            {(filtroNome || filtroPolo || filtroDiretor) && <button onClick={limparFiltros} className="flex items-center gap-1 text-sm text-red-500 font-bold hover:bg-red-50 px-3 py-2 rounded-xl transition-colors"><X size={16} /> Limpar</button>}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {escolasFiltradas.map(escola => (
            <div key={escola.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="p-3 bg-blue-50 rounded-xl text-blue-600 h-fit"><Building2 size={24} /></div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">{escola.nome}</h3>
                    <div className="flex gap-2 mt-1">
                        <span className="text-xs font-bold uppercase text-purple-600 bg-purple-50 px-2 py-1 rounded-md">Polo {escola.polo}</span>
                        {escola.fiscais ? 
                            <span className="text-xs font-bold uppercase text-green-600 bg-green-50 px-2 py-1 rounded-md flex items-center gap-1"><UserCheck size={10}/> {escola.fiscais.nome}</span> : 
                            <span className="text-xs font-bold uppercase text-orange-600 bg-orange-50 px-2 py-1 rounded-md">Sem Fiscal</span>
                        }
                    </div>
                  </div>
                </div>
                
                {/* BOTÕES DE AÇÃO */}
                <div className="flex gap-2">
                    <button onClick={() => openEdit(escola)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar"><Edit size={18}/></button>
                    <button onClick={() => handleDelete(escola.id, escola.nome)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir"><Trash2 size={18}/></button>
                </div>

              </div>
              <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-slate-600 border-t pt-4 border-slate-50">
                <p className="flex gap-2"><User size={16} className="text-slate-400"/> {escola.diretor}</p>
                <p className="flex gap-2"><Phone size={16} className="text-slate-400"/> {escola.telefone}</p>
              </div>
            </div>
          ))}
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
             <div className="bg-white rounded-3xl p-6 w-full max-w-2xl animate-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
                <h3 className="font-black text-xl mb-6">{isEditing ? 'Editar Escola' : 'Nova Escola'}</h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  <div>
                      <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3 border-b border-blue-100 pb-1">Dados da Unidade</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 ml-1">Nome</label><input required value={formData.nome} onChange={e=>setFormData({...formData, nome: e.target.value})} className="w-full bg-slate-50 border p-2.5 rounded-xl text-sm"/></div>
                        <div><label className="text-xs font-bold text-slate-500 ml-1">Polo</label><input required type="number" value={formData.polo} onChange={e=>setFormData({...formData, polo: e.target.value})} className="w-full bg-slate-50 border p-2.5 rounded-xl text-sm"/></div>
                        <div><label className="text-xs font-bold text-slate-500 ml-1">Diretor</label><input required value={formData.diretor} onChange={e=>setFormData({...formData, diretor: e.target.value})} className="w-full bg-slate-50 border p-2.5 rounded-xl text-sm"/></div>
                        <div><label className="text-xs font-bold text-slate-500 ml-1">Telefone</label><input required value={formData.telefone} onChange={e=>setFormData({...formData, telefone: e.target.value})} className="w-full bg-slate-50 border p-2.5 rounded-xl text-sm"/></div>
                        <div><label className="text-xs font-bold text-slate-500 ml-1">Cidade</label><input required value={formData.cidade} onChange={e=>setFormData({...formData, cidade: e.target.value})} className="w-full bg-slate-50 border p-2.5 rounded-xl text-sm"/></div>
                      </div>
                  </div>

                  <div>
                      <h4 className="text-xs font-black text-green-600 uppercase tracking-widest mb-3 border-b border-green-100 pb-1 flex items-center gap-2"><UserCheck size={14}/> Vínculo de Fiscalização</h4>
                      <div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
                        <label className="text-xs font-bold text-slate-500 ml-1">Selecione o Fiscal Responsável</label>
                        <select 
                            value={formData.fiscal_id} 
                            onChange={e => setFormData({...formData, fiscal_id: e.target.value})}
                            className="w-full bg-white border p-3 rounded-xl text-sm mt-1 outline-none focus:ring-2 ring-green-500/20"
                        >
                            <option value="">-- Sem Fiscal Vinculado --</option>
                            {fiscais.map(f => (
                                <option key={f.id} value={f.id}>{f.nome} (Setor {f.polo ? f.polo : ''})</option>
                            ))}
                        </select>
                        <div className="mt-2 text-xs text-right">
                            <Link href="/fiscais" className="text-blue-600 font-bold hover:underline">+ Gerenciar Fiscais</Link>
                        </div>
                      </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setShowModal(false)} className="flex-1 text-slate-500 font-bold p-3 bg-slate-100 rounded-xl hover:bg-slate-200">Cancelar</button>
                      <button type="submit" className="flex-1 bg-blue-600 text-white font-bold p-3 rounded-xl hover:bg-blue-700">Salvar Dados</button>
                  </div>
                </form>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}