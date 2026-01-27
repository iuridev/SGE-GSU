"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, ShieldCheck, Plus, Loader2, LogOut, Trash2, X, School, Edit, Key, 
  Home, LayoutDashboard, FileText, CheckCircle2, AlertTriangle, Clock, 
  Banknote, BarChart3, Presentation, Bell, Droplets, ClipboardList, FileDown 
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
  
  // Novos Indicadores
  const [waterAvg, setWaterAvg] = useState(0);
  const [inspectionRate, setInspectionRate] = useState(0);

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
    // --- 1. NOTIFICAÇÕES (Pendências) ---
    if (!userProfile.is_admin && userProfile.escola_id) {
        const { data: cobrancas } = await supabase
            .from('fiscalizacoes_respostas')
            .select('*, fiscalizacoes_eventos(data_referencia)')
            .eq('escola_id', userProfile.escola_id)
            .eq('notificado', true)
            .eq('respondido', false);

        if (cobrancas) setNotificacoesPendentes(cobrancas);
    }

    // --- 2. ZELADORIAS (KPIs Principais) ---
    let queryZel = supabase.from('zeladorias').select('*, escolas(nome)').neq('status', 'Arquivado');
    if (!userProfile.is_admin && userProfile.escola_id) {
        queryZel = queryZel.eq('escola_id', userProfile.escola_id);
    }
    const { data: dataZel } = await queryZel;
    
    if (dataZel) {
        setZeladorias(dataZel);
        
        const counts = new Array(7).fill(0);
        dataZel.forEach(z => {
            if (z.etapa_atual >= 1 && z.etapa_atual <= 7) {
                counts[z.etapa_atual - 1]++;
            }
        });
        setEtapasCount(counts);

        setStats({
            total: dataZel.length,
            emAndamento: dataZel.filter(z => z.etapa_atual < 7).length,
            concluidos: dataZel.filter(z => z.etapa_atual === 7).length,
            isentos: dataZel.filter(z => z.isento_pagamento).length
        });

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

    // --- 3. ÁGUA (Média Diária do Mês Atual) ---
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(); // Ultimo dia do mes

    let queryWater = supabase.from('consumo_agua').select('consumo_dia').gte('data_leitura', startOfMonth).lte('data_leitura', endOfMonth);
    if (!userProfile.is_admin && userProfile.escola_id) queryWater = queryWater.eq('escola_id', userProfile.escola_id);
    
    const { data: waterData } = await queryWater;
    if (waterData && waterData.length > 0) {
        const totalConsumo = waterData.reduce((acc, curr) => acc + (Number(curr.consumo_dia) || 0), 0);
        setWaterAvg(totalConsumo / waterData.length); // Média aritmética dos registros do mês
    } else {
        setWaterAvg(0);
    }

    // --- 4. FISCALIZAÇÃO (Taxa de Resposta) ---
    let queryInsp = supabase.from('fiscalizacoes_respostas').select('respondido');
    if (!userProfile.is_admin && userProfile.escola_id) queryInsp = queryInsp.eq('escola_id', userProfile.escola_id);

    const { data: inspData } = await queryInsp;
    if (inspData && inspData.length > 0) {
        const respondidos = inspData.filter(i => i.respondido).length;
        setInspectionRate(Math.round((respondidos / inspData.length) * 100));
    } else {
        setInspectionRate(0);
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
    const time = new Date().toLocaleTimeString('pt-BR');

    // Cabeçalho Azul
    doc.setFillColor(37, 99, 235); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255); 
    doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.text("SGE-GSU | Relatório Gerencial", 14, 20);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(`Gerado em: ${date} às ${time}`, 14, 30);
    doc.text(`Usuário: ${usuarioLogado?.nome || usuarioLogado?.email}`, 14, 35);

    doc.setTextColor(0, 0, 0);
    let y = 55;

    // Seção 1: Indicadores Gerais
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text("1. Indicadores de Performance (KPIs)", 14, y);
    y += 10;
    
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    const kpis = [
        `Total de Processos de Zeladoria: ${stats.total}`,
        `Processos Em Andamento: ${stats.emAndamento}`,
        `Ocupações Vigentes (Concluídos): ${stats.concluidos}`,
        `Isentos de Pagamento: ${stats.isentos}`,
        `Média Consumo Água (Mês Atual): ${waterAvg.toFixed(1)} m³/dia`,
        `Taxa de Resposta Fiscalização: ${inspectionRate}%`
    ];

    kpis.forEach(kpi => {
        doc.text(`• ${kpi}`, 14, y);
        y += 7;
    });

    y += 10;

    // Seção 2: Funil de Processos
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text("2. Distribuição por Etapa (Funil)", 14, y);
    y += 10;
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    NOMES_ETAPAS.forEach((nome, i) => {
        doc.text(`${nome}: ${etapasCount[i]} processos`, 14, y);
        y += 7;
    });

    y += 10;

    // Seção 3: Alertas
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text("3. Alertas Críticos (Vencimentos Próximos)", 14, y);
    y += 10;
    doc.setFontSize(10);
    if (alertasVencimento.length === 0) {
        doc.setTextColor(0, 100, 0); doc.text("Nenhum alerta crítico no momento.", 14, y);
    } else {
        doc.setTextColor(200, 0, 0);
        alertasVencimento.forEach(a => {
            doc.text(`[${a.diasRestantes} dias] ${a.escolas?.nome} - ${a.nome_zelador}`, 14, y);
            y += 6;
        });
    }

    doc.save(`dashboard_sge_${new Date().toISOString().split('T')[0]}.pdf`);
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
        {/* Notificações */}
        {notificacoesPendentes.length > 0 && (
             <div className="mb-8 bg-red-50 border-l-8 border-red-500 p-6 rounded-r-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between animate-pulse">
                <div>
                    <h3 className="text-red-700 font-black text-xl flex items-center gap-2"><Bell size={24} fill="currentColor"/> Atenção: Pendência de Fiscalização</h3>
                    <p className="text-red-600 mt-2 font-medium">Preencha o questionário de limpeza referente à(s) data(s):</p>
                    <ul className="mt-2 list-disc list-inside text-red-800 font-bold ml-2">
                        {notificacoesPendentes.map(n => (<li key={n.id}>{new Date(n.fiscalizacoes_eventos.data_referencia).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</li>))}
                    </ul>
                </div>
                <Link href="/fiscalizacoes" className="mt-4 md:mt-0 bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 shadow-lg transition-transform hover:scale-105">Responder Agora</Link>
             </div>
        )}

        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Painel de Controle</h1>
            <p className="text-slate-500 font-medium">Bem-vindo, <span className="text-blue-600 font-bold">{usuarioLogado?.nome || usuarioLogado?.email}</span></p>
          </div>
          <button onClick={handleExportDashboard} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold flex gap-2 border border-slate-200 shadow-sm transition-all">
            <FileDown size={20}/> Exportar Dashboard
          </button>
        </header>

        {/* --- CARDS DE STATUS GERAL --- */}
        <section className="mb-12">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><LayoutDashboard size={20} className="text-blue-500"/> Visão Geral e Indicadores</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* 1. Zeladorias Totais */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-2 relative overflow-hidden">
                    <div className="absolute right-[-10px] top-[-10px] bg-blue-50 w-24 h-24 rounded-full opacity-50"></div>
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider z-10">Total de Zeladorias</span>
                    <div className="flex items-center gap-3 z-10">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Home size={24} /></div>
                        <span className="text-4xl font-black text-slate-800">{stats.total}</span>
                    </div>
                </div>

                {/* 2. Em Andamento */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-2 relative overflow-hidden">
                    <div className="absolute right-[-10px] top-[-10px] bg-orange-50 w-24 h-24 rounded-full opacity-50"></div>
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider z-10">Processos Ativos</span>
                    <div className="flex items-center gap-3 z-10">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><Clock size={24} /></div>
                        <span className="text-4xl font-black text-slate-800">{stats.emAndamento}</span>
                    </div>
                </div>

                {/* 3. Média Água (NOVO) */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-2 relative overflow-hidden">
                    <div className="absolute right-[-10px] top-[-10px] bg-cyan-50 w-24 h-24 rounded-full opacity-50"></div>
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider z-10">Consumo Médio (Água)</span>
                    <div className="flex items-center gap-3 z-10">
                        <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl"><Droplets size={24} /></div>
                        <div>
                            <span className="text-3xl font-black text-slate-800">{waterAvg.toFixed(1)}</span>
                            <span className="text-xs font-bold text-slate-400 ml-1">m³/dia</span>
                        </div>
                    </div>
                    <span className="text-[10px] text-slate-400 z-10 mt-1">Média diária no mês atual</span>
                </div>

                {/* 4. Taxa Fiscalização (NOVO) */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-2 relative overflow-hidden">
                    <div className="absolute right-[-10px] top-[-10px] bg-indigo-50 w-24 h-24 rounded-full opacity-50"></div>
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider z-10">Conformidade (Fiscal)</span>
                    <div className="flex items-center gap-3 z-10">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><ClipboardList size={24} /></div>
                        <div>
                            <span className="text-3xl font-black text-slate-800">{inspectionRate}%</span>
                        </div>
                    </div>
                    <span className="text-[10px] text-slate-400 z-10 mt-1">Taxa de resposta aos questionários</span>
                </div>
            </div>
        </section>

        <section className="mb-16">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* --- GRÁFICO DE BARRAS (FUNIL) --- */}
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 className="text-blue-600" />
                        <h3 className="text-lg font-bold text-slate-800">Distribuição por Etapa</h3>
                    </div>
                    <div className="space-y-5">
                        {NOMES_ETAPAS.map((nome, index) => {
                            const count = etapasCount[index];
                            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                            const isConcluido = index === 6;
                            return (
                                <div key={index} className="group">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className={`text-sm font-bold ${count > 0 ? 'text-slate-700' : 'text-slate-400'}`}>{nome}</span>
                                        <span className={`text-sm font-black ${isConcluido ? 'text-green-600' : 'text-blue-600'}`}>{count}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${isConcluido ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${percentage > 0 ? Math.max(percentage, 2) : 0}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* --- ALERTAS DE VENCIMENTO --- */}
                <div className="lg:col-span-1">
                    {alertasVencimento.length > 0 ? (
                        <div className="bg-red-50/50 p-6 rounded-3xl border border-red-100 h-full">
                            <div className="flex items-center gap-2 mb-4"><AlertTriangle className="text-red-500 animate-pulse"/><h3 className="text-lg font-bold text-slate-800">Vencimentos</h3></div>
                            <div className="flex flex-col gap-3">
                                {alertasVencimento.map(alerta => (
                                    <div key={alerta.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-1">
                                        <h4 className="font-bold text-slate-800 text-sm truncate">{alerta.escolas?.nome}</h4>
                                        <p className="text-xs text-slate-500">{alerta.nome_zelador}</p>
                                        <div className={`mt-1 flex items-center gap-1.5 px-2 py-1 rounded-lg w-fit text-[10px] font-bold ${alerta.diasRestantes < 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                            <Clock size={10}/> {alerta.diasRestantes < 0 ? `Venceu há ${Math.abs(alerta.diasRestantes)} dias` : `Vence em ${alerta.diasRestantes} dias`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-green-50/50 p-8 rounded-3xl border border-green-100 h-full flex flex-col items-center justify-center text-center gap-4">
                            <div className="bg-green-100 p-4 rounded-full text-green-600"><CheckCircle2 size={32}/></div>
                            <div><h3 className="font-bold text-green-800 text-lg">Tudo em dia!</h3><p className="text-green-600 text-sm">Nenhum contrato vencendo nos próximos 90 dias.</p></div>
                        </div>
                    )}
                </div>
            </div>
        </section>

        {/* --- SISTEMA / USUÁRIOS --- */}
        <section className="border-t border-slate-200 pt-10">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3"><div className="p-2 bg-slate-100 rounded-xl text-slate-500"><Users size={20} /></div><h2 className="text-xl font-bold text-slate-800">Usuários do Sistema</h2></div>
                {usuarioLogado?.is_admin && (
                    <button onClick={() => { resetForm(); setModalType('create'); }} className="text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2"><Plus size={16}/> Adicionar Usuário</button>
                )}
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

        {/* Modais */}
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