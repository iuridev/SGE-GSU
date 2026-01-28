"use client";

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, FileDown, Search, Droplets, Calendar, Filter, Loader2, AlertTriangle 
} from 'lucide-react';
import Link from 'next/link';
import { getRelatorioConsumoGeral } from '@/app/actions'; // Importa a função nova
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Certifique-se de ter instalado: npm install jspdf jspdf-autotable

export default function RelatorioAguaAdmin() {
  const [loading, setLoading] = useState(false);
  const [registros, setRegistros] = useState<any[]>([]);
  const [mediaGeral, setMediaGeral] = useState(0);
  
  // Datas Padrão (Início e Fim do Mês Atual)
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];

  const [filtro, setFiltro] = useState({
    inicio: primeiroDia,
    fim: ultimoDia
  });

  const buscarDados = async () => {
    setLoading(true);
    const res = await getRelatorioConsumoGeral(filtro.inicio, filtro.fim);
    if (res.success && res.data) {
        setRegistros(res.data);
        
        // Calcular Média
        if (res.data.length > 0) {
            const total = res.data.reduce((acc: number, r: any) => acc + (Number(r.consumo_dia) || 0), 0);
            setMediaGeral(total / res.data.length);
        } else {
            setMediaGeral(0);
        }
    } else {
        alert("Erro ao buscar dados: " + res.error);
    }
    setLoading(false);
  };

  // Busca inicial ao carregar
  useEffect(() => {
    buscarDados();
  }, []);

  const gerarPDF = () => {
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFillColor(6, 182, 212); // Cor Ciano
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Relatório Geral de Água", 14, 25);
    
    doc.setFontSize(10);
    doc.text(`Período: ${new Date(filtro.inicio).toLocaleDateString()} a ${new Date(filtro.fim).toLocaleDateString()}`, 14, 35);

    // Resumo
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Total de Registros: ${registros.length}`, 14, 50);
    doc.text(`Média de Consumo no Período: ${mediaGeral.toFixed(2)} m³`, 14, 56);

    // Tabela
    const tableData = registros.map(r => [
        new Date(r.data_leitura).toLocaleDateString('pt-BR'),
        r.escolas?.nome || 'Desconhecida',
        r.leitura_atual,
        r.consumo_dia,
        r.excedeu_limite ? 'SIM' : 'Não',
        r.usuarios?.nome || '-'
    ]);

    autoTable(doc, {
        startY: 65,
        head: [['Data', 'Escola', 'Leitura', 'Consumo (m³)', 'Alerta?', 'Responsável']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [6, 182, 212] },
        styles: { fontSize: 8 },
    });

    doc.save(`relatorio_agua_${filtro.inicio}_${filtro.fim}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
            <Link href="/" className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600">
                <ArrowLeft size={20} />
            </Link>
            <div>
                <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                    <Droplets className="text-cyan-500" fill="currentColor" /> Relatório Geral
                </h1>
                <p className="text-slate-500 font-medium">Histórico consolidado de todas as escolas</p>
            </div>
        </div>
      </div>

      {/* Filtros e Ações */}
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Data Início</label>
                <div className="flex items-center gap-2 bg-slate-50 border p-3 rounded-xl">
                    <Calendar size={18} className="text-slate-400"/>
                    <input type="date" value={filtro.inicio} onChange={e => setFiltro({...filtro, inicio: e.target.value})} className="bg-transparent outline-none w-full text-slate-700 font-bold"/>
                </div>
            </div>
            <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Data Fim</label>
                <div className="flex items-center gap-2 bg-slate-50 border p-3 rounded-xl">
                    <Calendar size={18} className="text-slate-400"/>
                    <input type="date" value={filtro.fim} onChange={e => setFiltro({...filtro, fim: e.target.value})} className="bg-transparent outline-none w-full text-slate-700 font-bold"/>
                </div>
            </div>
            <button onClick={buscarDados} disabled={loading} className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all">
                {loading ? <Loader2 className="animate-spin"/> : <Search size={20}/>} Filtrar
            </button>
            <button onClick={gerarPDF} disabled={registros.length === 0} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50">
                <FileDown size={20}/> PDF
            </button>
        </div>
      </div>

      {/* Card de Média */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-6 rounded-3xl shadow-lg flex items-center justify-between">
            <div>
                <p className="text-cyan-100 font-bold text-sm uppercase mb-1">Média Geral do Período</p>
                <h2 className="text-4xl font-black">{mediaGeral.toFixed(2)} <span className="text-xl font-medium opacity-80">m³</span></h2>
            </div>
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                <Filter size={32} className="text-white" />
            </div>
        </div>
      </div>

      {/* Tabela de Resultados */}
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider font-bold">
                    <tr>
                        <th className="p-5">Data</th>
                        <th className="p-5">Escola</th>
                        <th className="p-5">Leitura</th>
                        <th className="p-5">Consumo</th>
                        <th className="p-5">Status</th>
                        <th className="p-5">Responsável</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm text-slate-700 font-medium">
                    {registros.length === 0 ? (
                        <tr><td colSpan={6} className="p-10 text-center text-slate-400">Nenhum registro encontrado neste período.</td></tr>
                    ) : (
                        registros.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-5">{new Date(r.data_leitura).toLocaleDateString('pt-BR')}</td>
                                <td className="p-5 font-bold text-slate-800">{r.escolas?.nome}</td>
                                <td className="p-5 text-slate-500">{r.leitura_atual}</td>
                                <td className="p-5">
                                    <span className="bg-cyan-50 text-cyan-700 px-3 py-1 rounded-lg font-bold">{r.consumo_dia} m³</span>
                                </td>
                                <td className="p-5">
                                    {r.excedeu_limite ? (
                                        <span className="flex items-center gap-1 text-red-600 font-bold bg-red-50 px-3 py-1 rounded-full text-xs w-fit">
                                            <AlertTriangle size={12}/> Alerta
                                        </span>
                                    ) : (
                                        <span className="text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full text-xs">Normal</span>
                                    )}
                                </td>
                                <td className="p-5 text-slate-500 text-xs">{r.usuarios?.nome}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

    </div>
  );
}