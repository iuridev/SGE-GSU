"use client";

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Loader2, ArrowLeft, UserCheck, Trash2, Search, X } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { createFiscal, deleteFiscal } from '../actions';
import Link from 'next/link';

export default function FiscaisPage() {
  const [loading, setLoading] = useState(true);
  const [fiscais, setFiscais] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ nome: '', cpf: '', rg: '', telefone: '' });

  useEffect(() => { loadFiscais(); }, []);

  const loadFiscais = async () => {
    setLoading(true);
    const { data } = await supabase.from('fiscais').select('*').order('nome');
    if (data) setFiscais(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createFiscal(formData);
    if (res.error) alert(res.error);
    else { alert("Fiscal cadastrado!"); setShowModal(false); setFormData({ nome: '', cpf: '', rg: '', telefone: '' }); loadFiscais(); }
  };

  const handleDelete = async (id: string) => {
    if(confirm("Excluir fiscal?")) {
        const res = await deleteFiscal(id);
        if(res.error) alert(res.error);
        else loadFiscais();
    }
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-2 mb-10 pb-4 border-b border-slate-700"><ShieldCheck className="text-blue-400" /><span className="text-xl font-bold">SGE-GSU</span></div>
        <Link href="/" className="flex items-center gap-3 p-3 text-slate-400 hover:bg-slate-800 rounded-xl mb-2"><ArrowLeft size={20} /> Voltar</Link>
        <div className="flex items-center gap-3 p-3 bg-blue-600 rounded-xl font-medium"><UserCheck size={20} /> Fiscais</div>
      </aside>

      <main className="flex-1 p-10 overflow-auto">
        <header className="flex justify-between mb-8">
          <h1 className="text-3xl font-black">Fiscais de Contrato</h1>
          <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex gap-2 shadow-lg"><Plus /> Novo Fiscal</button>
        </header>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                    <tr><th className="p-6">Nome</th><th className="p-6">Contato</th><th className="p-6">Documentos</th><th className="p-6 text-right">Ações</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                    {fiscais.map(f => (
                        <tr key={f.id} className="hover:bg-slate-50">
                            <td className="p-6 font-bold text-slate-700">{f.nome}</td>
                            <td className="p-6 text-slate-500">{f.telefone}</td>
                            <td className="p-6 text-slate-500">CPF: {f.cpf} | RG: {f.rg}</td>
                            <td className="p-6 text-right">
                                <button onClick={() => handleDelete(f.id)} className="p-2 text-slate-300 hover:text-red-600 rounded-lg"><Trash2 size={18}/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
             <div className="bg-white rounded-3xl p-6 w-full max-w-md animate-in zoom-in duration-200">
                <h3 className="font-black text-xl mb-6">Novo Fiscal</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input required placeholder="Nome Completo" value={formData.nome} onChange={e=>setFormData({...formData, nome: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl"/>
                    <input placeholder="Telefone" value={formData.telefone} onChange={e=>setFormData({...formData, telefone: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl"/>
                    <div className="grid grid-cols-2 gap-4">
                        <input placeholder="CPF" value={formData.cpf} onChange={e=>setFormData({...formData, cpf: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl"/>
                        <input placeholder="RG" value={formData.rg} onChange={e=>setFormData({...formData, rg: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl"/>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 font-bold p-3 rounded-xl">Cancelar</button>
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