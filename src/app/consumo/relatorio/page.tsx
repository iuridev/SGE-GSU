"use client";

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, FileDown, Search, Droplets, Calendar, Filter, Loader2, AlertTriangle, Building2
} from 'lucide-react';
import Link from 'next/link';
import { getRelatorioConsumoGeral } from '@/app/actions'; //
import { supabase } from '@/app/lib/supabase'; //
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function RelatorioAguaPage() {
  const [loading, setLoading] = useState(true);
  
  // Dados
  const [registros, setRegistros] = useState<any[]>([]);
  const [registrosFiltrados, setRegistrosFiltrados] = useState<any[]>([]);
  const [mediaGeral, setMediaGeral] = useState(0);

  // Controle de Perfil
  const [isAdmin, setIsAdmin] = useState(false);
  const [listaEscolas, setListaEscolas] = useState<any[]>([]);

  // Filtros (Padrão: Mês Atual)
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];

  const [filtro, setFiltro] = useState({
    inicio: primeiroDia,
    fim: ultimoDia,
    escolaId: '' // Usado apenas pelo Regional
  });

  // 1. Inicialização
  useEffect(() => {
    init();
  }, []);

  // 2. Reaplica filtros locais quando muda a seleção de escola (apenas visual)
  useEffect(() => {
    filtrarDadosLocais();
  }, [filtro.escolaId, registros]);

  const init = async () => {
    setLoading(true);
    
    // A. Identificar quem é o usuário
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        // Busca o perfil na tabela usuarios
        const { data: profile } = await supabase
            .from('usuarios')
            .select('perfil')
            .eq('id', user.id) // Busca pelo ID vinculado ao Auth
            .single();
        
        const ehRegional = profile?.perfil === 'Regional';
        setIsAdmin(ehRegional);

        // B. Se for Regional, carrega a lista de escolas para o dropdown
        if (ehRegional) {
            const { data: escolas } = await supabase.from('escolas').select('id, nome').order('nome');
            setListaEscolas(escolas || []);
        }
    }

    // C. Buscar Relatório
    // O RLS do banco de dados vai decidir o que volta aqui.
    // Se for Regional, volta TUDO. Se for Operacional, volta SÓ A ESCOLA DELE.
    await buscarDadosServidor();
    
    setLoading(false);
  };

  const buscarDadosServidor = async () => {
    setLoading(true);
    const res = await getRelatorioConsumoGeral(filtro.inicio, filtro.fim);
    
    if (res.success && res.data) {
        setRegistros(res.data);
    } else {
        alert("Erro ao buscar dados: " + (res.error || "Erro desconhecido"));
    }
    setLoading(false);
  };

  const filtrarDadosLocais = () => {
    let dados = [...registros];

    // Se for Admin e escolheu uma escola específica no dropdown
    if (isAdmin && filtro.escolaId) {
        dados = dados.filter(r => r.escola_id === filtro.escolaId);
    }

    setRegistrosFiltrados(dados);

    // Calcular Média da visualização atual
    if (dados.length > 0) {
        const total = dados.reduce((acc: number, r: any) => acc + (Number(r.consumo_dia) || 0), 0);
        setMediaGeral(total / dados.length);
    } else {
        setMediaGeral(0);
    }
  };

  const gerarPDF = () => {
    const doc = new jsPDF();
    
    // Cabeçalho PDF
    doc.setFillColor(6, 182, 212); // Ciano
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Relatório de Consumo de Água", 14, 25);
    doc.setFontSize(10);
    doc.text(`Período: ${new Date(filtro.inicio).toLocaleDateString()} a ${new Date(filtro.fim).toLocaleDateString()}`, 14, 35);

    // Corpo PDF
    const tableData = registrosFiltrados.map(r => [
        new Date(r.data_leitura).toLocaleDateString('pt-BR', {timeZone: 'UTC'}),
        r.escolas?.nome || 'Indefinida',
        r.leitura_anterior,
        r.leitura_atual,
        `${r.consumo_dia} m³`,
        r.excedeu_limite ? 'SIM' : 'Não',
        r.usuarios?.nome || '-'
    ]);

    autoTable(doc, {
        startY: 50,
        head: [['Data', 'Escola', 'Leit. Ant', 'Leit. Atual', 'Consumo', 'Alerta', 'Resp.']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [6, 182, 212] },
        styles: { fontSize: 8 },
        didParseCell: function(data) {
            // Destaca alertas em vermelho
            if (data.section === 'body' && data.column.index === 5 && data.cell.raw === 'SIM') {
                data.cell.styles.textColor = [220, 38, 38];
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });

    doc.save('relatorio_consumo.pdf');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      
      {/* --- CABEÇALHO --- */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full">
            <Link href="/consumo" className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors">
                <ArrowLeft size={20} />
            </Link>
            <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-2">
                    <Droplets className="text-cyan-500" fill="currentColor" /> 
                    {isAdmin ? "Relatório Geral (Regional)" : "Histórico de Consumo"}
                </h1>
                <p className="text-slate-500 font-medium text-sm">
                    {isAdmin ? "Visão consolidada de todas as unidades" : "Registros da sua unidade escolar"}
                </p>
            </div>
        </div>
      </div>

      {/* --- FILTROS --- */}
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            
            {/* Data Início */}
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Data Início</label>
                <div className="flex items-center gap-2 bg-slate-50 border p-3 rounded-xl focus-within:ring-2 ring-cyan-100 transition-all">
                    <Calendar size={18} className="text-slate-400"/>
                    <input type="date" value={filtro.inicio} onChange={e => setFiltro({...filtro, inicio: e.target.value})} className="bg-transparent outline-none w-full text-slate-700 font-bold"/>
                </div>
            </div>

            {/* Data Fim */}
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Data Fim</label>
                <div className="flex items-center gap-2 bg-slate-50 border p-3 rounded-xl focus-within:ring-2 ring-cyan-100 transition-all">
                    <Calendar size={18} className="text-slate-400"/>
                    <input type="date" value={filtro.fim} onChange={e => setFiltro({...filtro, fim: e.target.value})} className="bg-transparent outline-none w-full text-slate-700 font-bold"/>
                </div>
            </div>

            {/* Filtro de Escola (APARECE APENAS SE FOR ADMIN REGIONAL) */}
            {isAdmin ? (
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Filtrar Escola</label>
                    <div className="flex items-center gap-2 bg-slate-50 border p-3 rounded-xl focus-within:ring-2 ring-cyan-100 transition-all">
                        <Building2 size={18} className="text-slate-400"/>
                        <select 
                            value={filtro.escolaId} 
                            onChange={e => setFiltro({...filtro, escolaId: e.target.value})} 
                            className="bg-transparent outline-none w-full text-slate-700 font-bold text-sm truncate"
                        >
                            <option value="">Todas as Escolas</option>
                            {listaEscolas.map(e => (
                                <option key={e.id} value={e.id}>{e.nome}</option>
                            ))}
                        </select>
                    </div>
                </div>
            ) : (
                <div className="hidden md:block"></div> // Espaçador para layout
            )}

            {/* Botões */}
            <div className="flex gap-2">
                <button onClick={buscarDadosServidor} disabled={loading} className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-lg shadow-cyan-200">
                    {loading ? <Loader2 className="animate-spin"/> : <Search size={20}/>} <span className="hidden lg:inline">Buscar</span>
                </button>
                <button onClick={gerarPDF} disabled={registrosFiltrados.length === 0} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white px-4 py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all disabled:opacity-50">
                    <FileDown size={20}/> <span className="hidden lg:inline">PDF</span>
                </button>
            </div>
        </div>
      </div>

      {/* --- CARDS RESUMO --- */}
      <div className="max-w-6xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white p-6 rounded-3xl shadow-lg flex items-center justify-between relative overflow-hidden">
            <div className="relative z-10">
                <p className="text-cyan-100 font-bold text-xs uppercase mb-1">Média de Consumo (Seleção)</p>
                <h2 className="text-3xl font-black">{mediaGeral.toFixed(1)} <span className="text-lg font-medium opacity-80">m³</span></h2>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm relative z-10">
                <Filter size={24} className="text-white" />
            </div>
        </div>
        
        <div className="bg-white text-slate-700 p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
             <div>
                <p className="text-slate-400 font-bold text-xs uppercase mb-1">Registros Encontrados</p>
                <h2 className="text-3xl font-black">{registrosFiltrados.length}</h2>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl">
                <Calendar size={24} className="text-slate-400" />
            </div>
        </div>
      </div>

      {/* --- TABELA DE DADOS --- */}
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] uppercase tracking-widest font-bold">
                    <tr>
                        <th className="p-4">Data</th>
                        <th className="p-4">Escola</th>
                        <th className="p-4">Leituras (m³)</th>
                        <th className="p-4">Consumo</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Responsável</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm text-slate-700 font-medium">
                    {registrosFiltrados.length === 0 ? (
                        <tr><td colSpan={6} className="p-10 text-center text-slate-400">Nenhum registro encontrado para este período.</td></tr>
                    ) : (
                        registrosFiltrados.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 whitespace-nowrap">
                                    <div className="font-bold text-slate-800">{new Date(r.data_leitura).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</div>
                                </td>
                                <td className="p-4">
                                    <div className="font-bold text-slate-700 text-xs md:text-sm">{r.escolas?.nome}</div>
                                </td>
                                <td className="p-4 text-xs text-slate-500">
                                    <div className="flex flex-col gap-1">
                                        <span>Ant: {r.leitura_anterior}</span>
                                        <span className="font-bold text-slate-700">Atual: {r.leitura_atual}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className="bg-cyan-50 text-cyan-700 px-3 py-1 rounded-lg font-bold text-xs md:text-sm whitespace-nowrap">
                                        {r.consumo_dia} m³
                                    </span>
                                </td>
                                <td className="p-4">
                                    {r.excedeu_limite ? (
                                        <span className="flex items-center gap-1 text-red-600 font-bold bg-red-50 px-2 py-1 rounded-md text-xs w-fit border border-red-100">
                                            <AlertTriangle size={12}/> Alerta
                                        </span>
                                    ) : (
                                        <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded-md text-xs border border-green-100">Normal</span>
                                    )}
                                </td>
                                <td className="p-4 text-slate-400 text-xs">
                                    {r.usuarios?.nome ? r.usuarios.nome.split(' ')[0] : '-'}
                                </td>
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