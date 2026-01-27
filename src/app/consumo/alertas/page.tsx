"use client";

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, ArrowLeft, Loader2, AlertTriangle, FileDown, Search, Filter, 
  Droplets, Calendar, User, Home // Adicionado Home
} from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { getConsumoHistorico } from '../../actions'; 
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AlertasConsumoPage() {
  const [loading, setLoading] = useState(true);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [escolas, setEscolas] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [filtroEscola, setFiltroEscola] = useState('');
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1);
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear());

  useEffect(() => { init(); }, []);

  const init = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }

    const { data: profile } = await supabase.from('usuarios').select('perfil, escola_id').eq('email', user.email).single();
    const admin = profile?.perfil === 'Regional';
    setIsAdmin(admin);

    if (admin) {
        const { data: esc } = await supabase.from('escolas').select('id, nome').order('nome');
        if (esc) setEscolas(esc);
    }

    await loadAlertas(admin ? '' : profile?.escola_id);
    setLoading(false);
  };

  const loadAlertas = async (escolaId?: string) => {
    const dados = await getConsumoHistorico(escolaId, filtroMes.toString(), filtroAno.toString(), true);
    setAlertas(dados || []);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFillColor(220, 38, 38); 
    doc.rect(0, 0, 297, 30, 'F');
    doc.setTextColor(255, 255, 255); 
    doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("Relatório de Justificativas de Consumo (Excedentes)", 14, 12);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`Competência: ${filtroMes}/${filtroAno}`, 14, 18);

    const tableData = alertas.map(r => [
        new Date(r.data_leitura).toLocaleDateString('pt-BR', {timeZone: 'UTC'}),
        r.escolas.nome,
        `${r.consumo_dia.toFixed(0)} m³ (Meta: ${r.limite_calculado.toFixed(0)})`,
        r.justificativa || 'Sem justificativa',
        r.acao_corretiva || 'Sem ação'
    ]);

    autoTable(doc, {
        head: [['Data', 'Unidade Escolar', 'Consumo vs Meta', 'Justificativa do Excesso', 'Ação Corretiva Adotada']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [185, 28, 28] },
        styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 40 },
            2: { cellWidth: 30 },
            3: { cellWidth: 90 },
            4: { cellWidth: 90 }
        }
    });

    doc.save(`justificativas_agua_${filtroMes}_${filtroAno}.pdf`);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-red-600"/></div>;

  return (
    <div className="flex h-screen bg-red-50/30 font-sans text-slate-900">
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-2 mb-10 pb-4 border-b border-slate-700"><ShieldCheck className="text-blue-400" /><span className="text-xl font-bold">SGE-GSU</span></div>
        <Link href="/" className="flex items-center gap-3 p-3 text-slate-400 hover:bg-slate-800 rounded-xl mb-2"><Home size={20} /> Dashboard</Link>
        <Link href="/consumo" className="flex items-center gap-3 p-3 text-slate-400 hover:bg-slate-800 rounded-xl mb-2"><ArrowLeft size={20} /> Voltar</Link>
        <div className="flex items-center gap-3 p-3 bg-red-600 rounded-xl font-medium"><AlertTriangle size={20} /> Justificativas</div>
      </aside>

      <main className="flex-1 p-10 overflow-auto">
        <header className="flex justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-red-900">Gestão de Justificativas</h1>
            <p className="text-red-600 font-medium">Registros de consumo acima da média permitida</p>
          </div>
          <button onClick={handleExportPDF} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold flex gap-2 shadow-lg shadow-red-600/20">
            <FileDown size={20}/> Exportar Relatório PDF
          </button>
        </header>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-red-100 mb-8 flex gap-4 items-center flex-wrap">
            <div className="flex items-center gap-2 text-slate-500 font-bold text-sm"><Filter size={18} /> Filtros:</div>
            {isAdmin && (
                <select value={filtroEscola} onChange={e => { setFiltroEscola(e.target.value); loadAlertas(e.target.value); }} className="bg-slate-50 border p-2 rounded-xl text-sm">
                    <option value="">Todas as Escolas</option>
                    {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
            )}
            <select value={filtroMes} onChange={e => { setFiltroMes(Number(e.target.value)); }} className="bg-slate-50 border p-2 rounded-xl text-sm w-32">
                {[...Array(12)].map((_, i) => <option key={i} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', {month: 'long'})}</option>)}
            </select>
            <input type="number" value={filtroAno} onChange={e => setFiltroAno(Number(e.target.value))} className="bg-slate-50 border p-2 rounded-xl text-sm w-24"/>
            <button onClick={() => loadAlertas(isAdmin ? filtroEscola : undefined)} className="bg-red-100 text-red-700 px-3 py-2 rounded-xl text-sm font-bold"><Search size={16}/></button>
        </div>

        <div className="space-y-4">
            {alertas.length === 0 && <div className="text-center py-20 text-slate-400">Nenhuma ocorrência de excesso neste período.</div>}
            
            {alertas.map(alerta => (
                <div key={alerta.id} className="bg-white rounded-2xl p-6 border-l-8 border-red-500 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row justify-between mb-4 border-b border-slate-100 pb-4">
                        <div>
                            <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                                {alerta.escolas.nome}
                            </h3>
                            <span className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                <Calendar size={14}/> {new Date(alerta.data_leitura).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                                <span className="mx-2 text-slate-300">|</span>
                                <User size={14}/> Resp: {alerta.usuarios?.nome || 'N/A'}
                            </span>
                        </div>
                        <div className="text-right mt-2 md:mt-0">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Excesso</div>
                            <div className="text-2xl font-black text-red-600">
                                {alerta.consumo_dia.toFixed(0)} <span className="text-sm text-red-400">m³</span>
                            </div>
                            <div className="text-xs text-slate-400 font-medium">Meta: {alerta.limite_calculado.toFixed(1)} m³</div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-red-50/50 p-4 rounded-xl">
                            <h4 className="text-xs font-black text-red-800 uppercase mb-2 flex items-center gap-2"><AlertTriangle size={14}/> Justificativa</h4>
                            <p className="text-sm text-slate-700 leading-relaxed italic">"{alerta.justificativa}"</p>
                        </div>
                        <div className="bg-green-50/50 p-4 rounded-xl">
                            <h4 className="text-xs font-black text-green-800 uppercase mb-2 flex items-center gap-2"><ShieldCheck size={14}/> Ação Corretiva</h4>
                            <p className="text-sm text-slate-700 leading-relaxed">"{alerta.acao_corretiva}"</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </main>
    </div>
  );
}