"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, ShieldCheck, Plus, Loader2, LogOut, Trash2, X, School, Edit, Key, 
  Home, LayoutDashboard, CheckCircle2, AlertTriangle, Clock, 
  Banknote, BarChart3, Presentation, Bell, Droplets, ClipboardList, FileDown, 
  FileWarning, ListX 
} from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { createNewUser, updateSystemUser, deleteSystemUser, resetUserPassword } from './actions';
import Link from 'next/link';
import jsPDF from 'jspdf';

const NOMES_ETAPAS = [
  "1. Processo SEI",
  "2. Vistoria e Relatório",
  "3. Análise do SEFISC",
  "4. Laudo CECIG",
  "5. Ciência do Valor",
  "6. Aut. Casa Civil",
  "7. Assinatura do Termo"
];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
  
  // Dados do Dashboard
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [zeladorias, setZeladorias] = useState<any[]>([]); 
  const [alertasVencimento, setAlertasVencimento] = useState<any[]>([]); 
  const [notificacoesPendentes, setNotificacoesPendentes] = useState<any[]>([]);
  
  // Estatísticas
  const [stats, setStats] = useState({ total: 0, emAndamento: 0, concluidos: 0, isentos: 0 });
  const [etapasCount, setEtapasCount] = useState<number[]>(new Array(7).fill(0));
  
  // Novos Indicadores e Gráficos
  const [waterAvg, setWaterAvg] = useState(0);
  const [inspectionRate, setInspectionRate] = useState(0);
  const [justificativasMes, setJustificativasMes] = useState(0); 
  const [rankingPendencias, setRankingPendencias] = useState<any[]>([]);

  // Dados Auxiliares
  const [escolas, setEscolas] = useState<any[]>([]);
  
  // Modais
  const [modalType, setModalType] = useState<'create' | 'edit' | 'reset' | null>(null);
  const [formData, setFormData] = useState({ id: '', nome: '', email: '', senha: '', perfil: 'Operacional', escola_id: '' });
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('usuarios').select('perfil, escola_id').eq('email', user.email).single();
        const userData = { ...profile, email: user.email, is_admin: profile?.perfil === 'Regional' };
        setUsuarioLogado(userData);
        
        if (userData.is_admin) await loadEscolas();
        await loadDashboardData(userData);
      } else {
        window.location.href = '/login';
      }
      setLoading(false);
    };
    init();
  }, []);

  const loadDashboardData = async (userProfile: any) => {
    // --- 1. NOTIFICAÇÕES ---
    if (!userProfile.is_admin && userProfile.escola_id) {
        const { data: cobrancas } = await supabase
            .from('fiscalizacoes_respostas')
            .select('*, fiscalizacoes_eventos(data_referencia)')
            .eq('escola_id', userProfile.escola_id)
            .eq('notificado', true)
            .eq('respondido', false);

        if (cobrancas) setNotificacoesPendentes(cobrancas);
    }

    // --- 2. ZELADORIAS ---
    let queryZel = supabase.from('zeladorias').select('*, escolas(nome)').neq('status', 'Arquivado');
    if (!userProfile.is_admin && userProfile.escola_id) {
        queryZel = queryZel.eq('escola_id', userProfile.escola_id);
    }
    const { data: dataZel } = await queryZel;
    
    if (dataZel) {
        setZeladorias(dataZel);
        const counts = new Array(7).fill(0);
        dataZel.forEach(z => {
            if (z.etapa_atual >= 1 && z.etapa_atual <= 7) counts[z.etapa_atual - 1]++;
        });
        setEtapasCount(counts);
        setStats({
            total: dataZel.length,
            emAndamento: dataZel.filter(z => z.etapa_atual < 7).length,
            concluidos: dataZel.filter(z => z.etapa_atual === 7).length,
            isentos: dataZel.filter(z => z.isento_pagamento).length
        });

        // Alertas de Vencimento
        const hoje = new Date();
        const alertas = dataZel
            .filter(z => z.etapa_atual >= 6 && z.data_etapa_6)
            .map(z => {
                const dataBase = new Date(z.data_etapa_6);
                const validade = new Date(dataBase);
                validade.setFullYear(dataBase.getFullYear() + 2);
                const diasRestantes = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                return { ...z, validade, diasRestantes };
            })
            .filter(z => z.diasRestantes < 90)
            .sort((a, b) => a.diasRestantes - b.diasRestantes);
        setAlertasVencimento(alertas);
    }

    // --- 3. ÁGUA ---
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    let queryWater = supabase.from('consumo_agua').select('consumo_dia, excedeu_limite').gte('data_leitura', startOfMonth).lte('data_leitura', endOfMonth);
    if (!userProfile.is_admin && userProfile.escola_id) {
        queryWater = queryWater.eq('escola_id', userProfile.escola_id);
    }
    
    const { data: waterData } = await queryWater;
    if (waterData && waterData.length > 0) {
        const totalConsumo = waterData.reduce((acc, curr) => acc + (Number(curr.consumo_dia) || 0), 0);
        setWaterAvg(totalConsumo / waterData.length);
        const totalJustificativas = waterData.filter(r => r.excedeu_limite).length;
        setJustificativasMes(totalJustificativas);
    } else {
        setWaterAvg(0);
        setJustificativasMes(0);
    }

    // --- 4. FISCALIZAÇÃO (Correção do Erro de Tipo) ---
    let queryInsp = supabase.from('fiscalizacoes_respostas').select('respondido, escola_id, escolas(nome)');
    if (!userProfile.is_admin && userProfile.escola_id) queryInsp = queryInsp.eq('escola_id', userProfile.escola_id);

    const { data: inspData } = await queryInsp;
    
    if (inspData && inspData.length > 0) {
        const respondidos = inspData.filter(i => i.respondido).length;
        setInspectionRate(Math.round((respondidos / inspData.length) * 100));

        const pendentes = inspData.filter(i => !i.respondido);
        const rankingMap: Record<string, number> = {};
        
        pendentes.forEach(p => {
            // CORREÇÃO: Tratamento robusto para 'escolas' que pode vir como array ou objeto
            const escola: any = p.escolas;
            const nomeEscola = (Array.isArray(escola) ? escola[0]?.nome : escola?.nome) || 'Desconhecida';
            rankingMap[nomeEscola] = (rankingMap[nomeEscola] || 0) + 1;
        });

        const rankingArray = Object.entries(rankingMap)
            .map(([nome, qtd]) => ({ nome, qtd }))
            .sort((a, b) => b.qtd - a.qtd)
            .slice(0, 5); 

        setRankingPendencias(rankingArray);
    } else {
        setInspectionRate(0);
        setRankingPendencias([]);
    }

    // --- 5. USUÁRIOS ---
    let queryUser = supabase.from('usuarios').select('*, escolas(nome)').order('created_at', { ascending: false });
    if (!userProfile.is_admin && userProfile.escola_id) {
      queryUser = queryUser.eq('escola_id', userProfile.escola_id);
    }
    const { data: dataUser } = await queryUser;
    if (dataUser) setUsuarios(dataUser);
  };

  const loadEscolas = async () => {
    const { data } = await supabase.from('escolas').select('id, nome');
    if (data) setEscolas(data);
  };

  const handleExportDashboard = () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('pt-BR');
    
    doc.setFillColor(37, 99, 235); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255); 
    doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.text("SGE-GSU | Relatório Gerencial", 14, 20);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(`Gerado em: ${date}`, 14, 30);

    doc.setTextColor(0, 0, 0);
    let y = 55;

    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text("1. KPIs Gerais", 14, y);
    y += 10;
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    
    const kpis = [
        `Total Zeladorias: ${stats.total}`,
        `Consumo Médio Água: ${waterAvg.toFixed(1)} m³/dia`,
        `Justificativas de Água (Mês): ${justificativasMes}`,
        `Taxa Resposta Fiscalização: ${inspectionRate}%`
    ];
    kpis.forEach(k => { doc.text(`• ${k}`, 14, y); y += 7; });

    y += 10;
    
    if (rankingPendencias.length > 0) {
        doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text("2. Ranking de Pendências (Top 5)", 14, y);
        y += 10;
        doc.setFontSize(11); doc.setFont("helvetica", "normal");
        rankingPendencias.forEach((r, i) => {
            doc.text(`${i+1}. ${r.nome}: ${r.qtd} pendências`, 14, y);
            y += 7;
        });
    }

    doc.save(`dashboard_${date.replace(/\//g, '-')}.pdf`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true);
    let res;
    if (modalType === 'create') res = await createNewUser(formData);
    if (modalType === 'edit') res = await updateSystemUser(formData.id, formData);
    if (modalType === 'reset') res = await resetUserPassword(formData.id, formData.senha);
    if (res?.error) alert(res.error);
    else { alert('Sucesso!'); setModalType(null); resetForm(); loadDashboardData(usuarioLogado); }
    setLoadingAction(false);
  };

  const handleDelete = async (userId: string, name: string) => {
    if (confirm(`Remover ${name}?`)) { await deleteSystemUser(userId); loadDashboardData(usuarioLogado); }
  };
  
  const resetForm = () => setFormData({ id: '', nome: '', email: '', senha: '', perfil: 'Operacional', escola_id: '' });
  const openEdit = (user: any) => { setFormData({ id: user.id, nome: user.nome, email: user.email, senha: '', perfil: user.perfil, escola_id: user.escola_id || '' }); setModalType('edit'); };
  const openReset = (user: any) => { setFormData({ ...formData, id: user.id, nome: user.nome, senha: '' }); setModalType('reset'); };


  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-2 mb-10 pb-4 border-b border-slate-700"><ShieldCheck className="text-blue-400" /><span className="text-xl font-bold">SGE-GSU</span></div>
        <nav className="flex-1 space-y-2">
          <div className="flex items-center gap-3 p-3 bg-blue-600 rounded-xl text-white font-medium shadow-lg"><LayoutDashboard size={20} /> <span>Painel</span></div>
          <Link href="/zeladorias" className="flex items-center gap-3 p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"><Home size={20} /> <span>Zeladorias</span></Link>
          <Link href="/consumo" className="flex items-center gap-3 p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"><Droplets size={20} /> <span>Hidrômetro</span></Link>
          {usuarioLogado?.is_admin && <Link href="/escolas" className="flex items-center gap-3 p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"><School size={20} /> <span>Escolas</span></Link>}
          <Link href="/apresentacao" className="flex items-center gap-3 p-3 text-yellow-400 hover:text-white hover:bg-yellow-600/20 rounded-xl transition-all border border-dashed border-yellow-600/30 mt-4"><Presentation size={20} /> <span>Apresentação</span></Link>
        </nav>
        <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }} className="flex items-center gap-3 p-3 text-slate-400 hover:text-red-400 rounded-xl"><LogOut size={20} /> <span>Sair</span></button>
      </aside>

      <main className="flex-1 p-10 overflow-auto relative">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Painel de Controle</h1>
            <p className="text-slate-500 font-medium">Bem-vindo, <span className="text-blue-600 font-bold">{usuarioLogado?.nome || usuarioLogado?.email}</span></p>
          </div>
          <button onClick={handleExportDashboard} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold flex gap-2 border border-slate-200 shadow-sm transition-all">
            <FileDown size={20}/> Exportar Relatório
          </button>
        </header>

        {notificacoesPendentes.length > 0 && (
             <div className="mb-8 bg-red-50 border-l-8 border-red-500 p-6 rounded-r-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between animate-pulse">
                <div>
                    <h3 className="text-red-700 font-black text-xl flex items-center gap-2"><Bell size={24} fill="currentColor"/> Pendência de Fiscalização</h3>
                    <p className="text-red-600 mt-1 font-medium">Você possui questionários não respondidos.</p>
                </div>
                <Link href="/fiscalizacoes" className="mt-4 md:mt-0 bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 shadow-lg">Resolver</Link>
             </div>
        )}

        {/* INDICADORES */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Home size={24} /></div>
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Zeladorias</span>
                </div>
                <div><span className="text-4xl font-black text-slate-800">{stats.total}</span><p className="text-slate-400 text-xs mt-1">Processos cadastrados</p></div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl"><Droplets size={24} /></div>
                    <span className="bg-cyan-100 text-cyan-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Média Mensal</span>
                </div>
                <div>
                    <span className="text-4xl font-black text-slate-800">{waterAvg.toFixed(1)}</span>
                    <span className="text-sm font-bold text-slate-400 ml-1">m³/dia</span>
                    <p className="text-slate-400 text-xs mt-1">Consumo médio diário</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl"><FileWarning size={24} /></div>
                    <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Alertas Água</span>
                </div>
                <div><span className="text-4xl font-black text-slate-800">{justificativasMes}</span><p className="text-slate-400 text-xs mt-1">Justificativas este mês</p></div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><ClipboardList size={24} /></div>
                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Respostas</span>
                </div>
                <div><span className="text-4xl font-black text-slate-800">{inspectionRate}%</span><p className="text-slate-400 text-xs mt-1">Taxa de conformidade</p></div>
            </div>
        </section>

        {/* GRÁFICOS */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-6"><BarChart3 className="text-blue-600" /><h3 className="text-lg font-bold text-slate-800">Status dos Processos (Funil)</h3></div>
                <div className="space-y-4">
                    {NOMES_ETAPAS.map((nome, index) => {
                        const count = etapasCount[index];
                        const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                        const isConcluido = index === 6;
                        return (
                            <div key={index} className="group">
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`text-xs font-bold ${count > 0 ? 'text-slate-700' : 'text-slate-300'}`}>{nome}</span>
                                    <span className={`text-xs font-black ${isConcluido ? 'text-green-600' : 'text-blue-600'}`}>{count}</span>
                                </div>
                                <div className="w-full bg-slate-50 rounded-full h-2 overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-1000 ${isConcluido ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${percentage > 0 ? Math.max(percentage, 2) : 0}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-6"><ListX className="text-red-500" /><h3 className="text-lg font-bold text-slate-800">Ranking de Pendências</h3></div>
                {rankingPendencias.length > 0 ? (
                    <div className="space-y-5">
                        {rankingPendencias.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 font-bold flex items-center justify-center text-xs shrink-0">{idx + 1}º</div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]" title={item.nome}>{item.nome}</span>
                                        <span className="text-xs font-black text-red-600">{item.qtd} un.</span>
                                    </div>
                                    <div className="w-full bg-slate-50 rounded-full h-2">
                                        <div className="bg-red-400 h-2 rounded-full" style={{ width: `${Math.min((item.qtd / rankingPendencias[0].qtd) * 100, 100)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center pb-8 opacity-50">
                        <CheckCircle2 size={48} className="text-green-500 mb-2"/>
                        <p className="text-sm font-bold text-slate-500">Tudo em dia!</p>
                        <p className="text-xs text-slate-400">Nenhuma pendência crítica.</p>
                    </div>
                )}
            </div>
        </section>

        {/* ALERTAS VENCIMENTO */}
        <section className="mb-10">
             {alertasVencimento.length > 0 ? (
                <div className="bg-red-50/50 p-6 rounded-3xl border border-red-100">
                    <div className="flex items-center gap-2 mb-4"><AlertTriangle className="text-red-500 animate-pulse"/><h3 className="text-lg font-bold text-slate-800">Próximos Vencimentos (Zeladoria)</h3></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {alertasVencimento.map(alerta => (
                            <div key={alerta.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm truncate w-40">{alerta.escolas?.nome}</h4>
                                    <p className="text-xs text-slate-500">{alerta.nome_zelador}</p>
                                </div>
                                <div className={`px-3 py-1 rounded-lg text-xs font-bold ${alerta.diasRestantes < 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {alerta.diasRestantes < 0 ? `${Math.abs(alerta.diasRestantes)} dias atrasado` : `${alerta.diasRestantes} dias`}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
        </section>

        {/* USUÁRIOS */}
        <section className="border-t border-slate-200 pt-10">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3"><div className="p-2 bg-slate-100 rounded-xl text-slate-500"><Users size={20} /></div><h2 className="text-xl font-bold text-slate-800">Usuários do Sistema</h2></div>
                {usuarioLogado?.is_admin && <button onClick={() => { resetForm(); setModalType('create'); }} className="text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2"><Plus size={16}/> Adicionar Usuário</button>}
            </div>
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-widest font-bold"><tr><th className="p-6">Nome</th><th className="p-6">Escola</th><th className="p-6">Perfil</th><th className="p-6 text-right">Ações</th></tr></thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                    {usuarios.map(user => (
                        <tr key={user.id} className="hover:bg-slate-50/50">
                        <td className="p-6"><div className="font-bold">{user.nome}</div><div className="text-slate-400 text-xs">{user.email}</div></td>
                        <td className="p-6 text-slate-500">{user.escolas?.nome || '-'}</td>
                        <td className="p-6"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${user.perfil === 'Regional' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>{user.perfil}</span></td>
                        <td className="p-6 flex justify-end gap-2">
                            {usuarioLogado?.is_admin && (
                            <>
                                <button onClick={() => openReset(user)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Key size={18}/></button>
                                <button onClick={() => openEdit(user)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={18}/></button>
                                <button onClick={() => handleDelete(user.id, user.nome)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                            </>
                            )}
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </section>

        {modalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md animate-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6"><h3 className="font-black text-xl">{modalType === 'create' ? 'Novo Usuário' : modalType === 'edit' ? 'Editar' : 'Nova Senha'}</h3><button onClick={() => setModalType(null)}><X className="text-slate-400"/></button></div>
              <form onSubmit={handleSave} className="space-y-4">
                {modalType !== 'reset' && (
                  <>
                    <input required placeholder="Nome" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl"/>
                    <input required type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl"/>
                    <select value={formData.escola_id} onChange={e => setFormData({...formData, escola_id: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl">
                        <option value="">Sem vínculo</option>
                        {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                    <div className="flex gap-2">{['Operacional', 'Regional'].map(p => <button key={p} type="button" onClick={() => setFormData({...formData, perfil: p})} className={`flex-1 p-2 rounded-xl border text-xs font-bold ${formData.perfil === p ? 'bg-slate-800 text-white' : 'bg-white'}`}>{p}</button>)}</div>
                  </>
                )}
                {(modalType === 'create' || modalType === 'reset') && <input required type="password" placeholder="Senha" minLength={6} value={formData.senha} onChange={e => setFormData({...formData, senha: e.target.value})} className="w-full bg-white border border-yellow-300 p-3 rounded-xl"/>}
                <button disabled={loadingAction} className="w-full bg-blue-600 text-white font-bold p-3 rounded-xl">{loadingAction ? <Loader2 className="animate-spin mx-auto"/> : 'Salvar'}</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}