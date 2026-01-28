"use client";

import React, { useState, useEffect } from 'react';
import {
    ShieldCheck, ArrowLeft, Home, Loader2, Plus, Droplets, AlertTriangle,
    CheckCircle2, FileDown, Search, Filter, X, Edit, Info
} from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { getConsumoHistorico, saveConsumoAgua, getUltimaLeitura } from '../actions';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ConsumoAguaPage() {
    const [loading, setLoading] = useState(true);
    const [registros, setRegistros] = useState<any[]>([]);
    const [escolas, setEscolas] = useState<any[]>([]);
    const [userProfile, setUserProfile] = useState<any>(null);

    // CORREÇÃO: Filtros podem ser string vazia '' (para "Todos")
    const [filtroEscola, setFiltroEscola] = useState('');
    const [filtroMes, setFiltroMes] = useState<string | number>(new Date().getMonth() + 1);
    const [filtroAno, setFiltroAno] = useState<string | number>(new Date().getFullYear());

    const [showModal, setShowModal] = useState(false);
    const [leituraAnteriorDados, setLeituraAnteriorDados] = useState<any>(null);
    const [calculoPreview, setCalculoPreview] = useState({ consumo: 0, limite: 0, excedeu: false, isPrimeiroMes: false });

    const [formData, setFormData] = useState({
        id: '',
        escola_id: '',
        data_leitura: new Date().toISOString().split('T')[0],
        leitura_atual: '',
        populacao: '',
        justificativa: '',
        acao_corretiva: ''
    });

    useEffect(() => {
        init();
    }, []);

    useEffect(() => {
        if (userProfile) {
            const escolaParaBuscar = userProfile.is_admin ? filtroEscola : userProfile.escola_id;
            loadRegistros(escolaParaBuscar);
        }
    }, [filtroMes, filtroAno]);

    useEffect(() => {
        if (showModal && formData.escola_id && formData.data_leitura) {
            atualizarPreview();
        }
    }, [formData.leitura_atual, formData.populacao, formData.data_leitura, formData.escola_id]);

    const init = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '/login'; return; }

        const { data: profile } = await supabase.from('usuarios').select('perfil, escola_id').eq('email', user.email).single();
        setUserProfile({ ...profile, is_admin: profile?.perfil === 'Regional' });

        if (profile?.perfil === 'Regional') {
            const { data: esc } = await supabase.from('escolas').select('id, nome').order('nome');
            if (esc) setEscolas(esc);
        } else {
            setFormData(prev => ({ ...prev, escola_id: profile?.escola_id }));
        }

        await loadRegistros(profile?.perfil === 'Regional' ? '' : profile?.escola_id);
        setLoading(false);
    };

    const loadRegistros = async (escolaId?: string) => {
        // Se filtro for "0" ou "", manda vazio para buscar tudo
        const mesParaBuscar = filtroMes ? filtroMes.toString() : '';
        const anoParaBuscar = filtroAno ? filtroAno.toString() : '';
        
        const dados = await getConsumoHistorico(escolaId, mesParaBuscar, anoParaBuscar);
        setRegistros(dados || []);
    };

    const atualizarPreview = async () => {
        const anteriorObj = await getUltimaLeitura(formData.escola_id, formData.data_leitura);
        setLeituraAnteriorDados(anteriorObj);

        const atual = Number(formData.leitura_atual) || 0;
        const pop = Number(formData.populacao) || 0;
        const mesAtual = formData.data_leitura.substring(0, 7);
        const mesAnterior = anteriorObj?.data_leitura?.substring(0, 7);
        const isPrimeiroMes = !anteriorObj || mesAtual !== mesAnterior;

        let leituraAnteriorValor = 0;
        let consumo = 0;

        if (isPrimeiroMes) {
            consumo = 0;
        } else {
            leituraAnteriorValor = Number(anteriorObj.leitura_atual);
            consumo = atual - leituraAnteriorValor;
        }

        const limite = pop * 0.008;
        const excedeu = !isPrimeiroMes && (consumo > limite);

        setCalculoPreview({ consumo, limite, excedeu, isPrimeiroMes });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!calculoPreview.isPrimeiroMes && leituraAnteriorDados) {
            if (Number(formData.leitura_atual) < Number(leituraAnteriorDados.leitura_atual)) {
                alert("Erro: A leitura atual não pode ser menor que a anterior dentro do mesmo mês.");
                return;
            }
        }
        const res = await saveConsumoAgua(formData);
        if (res.error) alert(res.error);
        else {
            alert("Salvo com sucesso!");
            setShowModal(false);
            resetForm();
            loadRegistros(userProfile.is_admin ? filtroEscola : userProfile.escola_id);
        }
    };

    const resetForm = () => {
        setFormData({
            id: '',
            escola_id: userProfile.is_admin ? '' : userProfile.escola_id,
            data_leitura: new Date().toISOString().split('T')[0],
            leitura_atual: '',
            populacao: '',
            justificativa: '',
            acao_corretiva: ''
        });
        setCalculoPreview({ consumo: 0, limite: 0, excedeu: false, isPrimeiroMes: false });
        setLeituraAnteriorDados(null);
    };

    const openEdit = (reg: any) => {
        setFormData({
            id: reg.id,
            escola_id: reg.escola_id,
            data_leitura: reg.data_leitura,
            leitura_atual: reg.leitura_atual,
            populacao: reg.populacao,
            justificativa: reg.justificativa || '',
            acao_corretiva: reg.acao_corretiva || ''
        });
        setShowModal(true);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFillColor(37, 99, 235); doc.rect(0, 0, 297, 30, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.text("Relatório de Consumo de Água", 14, 12);
        doc.setFontSize(10); doc.text("SGE-GSU | Relatório de Lista", 14, 18);
        doc.text(`Filtro: ${filtroMes ? filtroMes : 'Todos'} / ${filtroAno ? filtroAno : 'Todos'}`, 14, 24);

        const tableData = registros.map(r => [
            new Date(r.data_leitura).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
            r.escolas?.nome || 'Escola',
            r.leitura_anterior,
            r.leitura_atual,
            r.consumo_dia === 0 && r.leitura_anterior === r.leitura_atual ? '0 (Inicial)' : `${r.consumo_dia.toFixed(0)} m³`,
            `${r.limite_calculado?.toFixed(1) || 0} m³`,
            r.populacao,
            r.excedeu_limite ? 'EXCEDEU' : 'NORMAL',
            r.usuarios?.nome || '-'
        ]);

        autoTable(doc, {
            head: [['Data', 'Escola', 'Leitura Ant.', 'Leitura Atual', 'Consumo', 'Meta', 'População', 'Status', 'Resp.']],
            body: tableData,
            startY: 35,
            theme: 'grid',
            didParseCell: function (data) {
                if (data.section === 'body') {
                    if (data.column.index === 7 && data.cell.raw === 'EXCEDEU') {
                        data.cell.styles.textColor = [220, 38, 38];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });

        doc.save(`consumo_agua.pdf`);
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
            <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col shrink-0">
                <div className="flex items-center gap-2 mb-10 pb-4 border-b border-slate-700"><ShieldCheck className="text-blue-400" /><span className="text-xl font-bold">SGE-GSU</span></div>
                <Link href="/" className="flex items-center gap-3 p-3 text-slate-400 hover:bg-slate-800 rounded-xl mb-2"><Home size={20} /> Dashboard</Link>
                <div className="flex items-center gap-3 p-3 bg-blue-600 rounded-xl font-medium"><Droplets size={20} /> Hidrômetro</div>
            </aside>

            <main className="flex-1 p-10 overflow-auto">
                <header className="flex justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black">Consumo de Água</h1>
                        <p className="text-slate-500">Controle diário de utilidade pública</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/consumo/alertas" className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-3 rounded-xl font-bold flex gap-2 border border-red-200 items-center transition-colors">
                            <AlertTriangle size={20} /> Justificativas
                        </Link>
                        <button onClick={handleExportPDF} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-3 rounded-xl font-bold flex gap-2 border border-slate-200"><FileDown size={20} /> PDF</button>
                        <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex gap-2 shadow-lg"><Plus /> Novo Registro</button>
                    </div>
                </header>

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-8 flex gap-4 items-center flex-wrap">
                    <div className="flex items-center gap-2 text-slate-500 font-bold text-sm"><Filter size={18} /> Filtros:</div>
                    
                    {userProfile?.is_admin && (
                        <select value={filtroEscola} onChange={e => { setFiltroEscola(e.target.value); loadRegistros(e.target.value); }} className="bg-slate-50 border p-2 rounded-xl text-sm">
                            <option value="">Todas as Escolas</option>
                            {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                        </select>
                    )}

                    {/* CORREÇÃO: Opção "Todos" adicionada */}
                    <select value={filtroMes} onChange={e => { setFiltroMes(e.target.value); }} className="bg-slate-50 border p-2 rounded-xl text-sm w-32">
                        <option value="">Todos</option>
                        {[...Array(12)].map((_, i) => <option key={i} value={i + 1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}</option>)}
                    </select>

                    {/* CORREÇÃO: Opção "Todos" adicionada */}
                    <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className="bg-slate-50 border p-2 rounded-xl text-sm w-28">
                         <option value="">Todos</option>
                         <option value="2024">2024</option>
                         <option value="2025">2025</option>
                         <option value="2026">2026</option>
                    </select>

                    <button onClick={() => loadRegistros(userProfile?.is_admin ? filtroEscola : userProfile?.escola_id)} className="bg-blue-100 text-blue-700 px-3 py-2 rounded-xl text-sm font-bold"><Search size={16} /></button>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                            <tr>
                                <th className="p-4">Data</th>
                                <th className="p-4">Escola</th>
                                <th className="p-4">Leituras (m³)</th>
                                <th className="p-4">Consumo</th>
                                <th className="p-4">Meta</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-sm">
                            {registros.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-400">Nenhum registro encontrado para este filtro.</td></tr>}
                            {registros.map(reg => (
                                <tr key={reg.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-bold">{new Date(reg.data_leitura).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                    <td className="p-4">{reg.escolas?.nome}</td>
                                    <td className="p-4 text-xs text-slate-500">Ant: {reg.leitura_anterior} <br /> Atual: <strong>{reg.leitura_atual}</strong></td>
                                    <td className="p-4 font-bold text-lg">{reg.consumo_dia === 0 && reg.leitura_anterior == reg.leitura_atual ? <span className="text-blue-500 text-xs">0 (Início)</span> : `${reg.consumo_dia.toFixed(0)} m³`}</td>
                                    <td className="p-4 text-slate-500">{reg.limite_calculado?.toFixed(1)}</td>
                                    <td className="p-4">{reg.excedeu_limite ? <span className="text-red-600 font-bold flex items-center gap-1"><AlertTriangle size={14} /> Excedeu</span> : <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={14} /> OK</span>}</td>
                                    <td className="p-4 text-right">{userProfile?.is_admin && <button onClick={() => openEdit(reg)} className="text-blue-600 hover:bg-blue-50 p-2 rounded"><Edit size={16} /></button>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-3xl p-6 w-full max-w-lg animate-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-xl">{formData.id ? 'Corrigir Leitura' : 'Novo Registro Diário'}</h3>
                                <button onClick={() => setShowModal(false)}><X className="text-slate-400" /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {userProfile?.is_admin && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-500">Escola</label>
                                        <select required value={formData.escola_id} onChange={e => setFormData({ ...formData, escola_id: e.target.value })} className="w-full bg-slate-50 border p-3 rounded-xl mb-2">
                                            <option value="">Selecione...</option>
                                            {escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500">Data da Leitura</label>
                                        <input required type="date" value={formData.data_leitura} onChange={e => setFormData({ ...formData, data_leitura: e.target.value })} className="w-full bg-slate-50 border p-3 rounded-xl" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500">População Total</label>
                                        <input required type="number" placeholder="Alunos + Func." value={formData.populacao} onChange={e => setFormData({ ...formData, populacao: e.target.value })} className="w-full bg-slate-50 border p-3 rounded-xl" />
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100">
                                    <div className="flex justify-between items-end mb-2">
                                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Droplets size={18} className="text-blue-500" /> Leitura do Hidrômetro</label>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            {calculoPreview.isPrimeiroMes
                                                ? "Novo Mês: Leitura Inicial"
                                                : `Anterior: ${leituraAnteriorDados?.leitura_atual || 0} m³`
                                            }
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            required type="number" step="1" placeholder="0000"
                                            value={formData.leitura_atual}
                                            onChange={e => setFormData({ ...formData, leitura_atual: e.target.value })}
                                            className="w-full bg-white border-2 border-slate-300 p-4 rounded-xl text-3xl font-black text-slate-900 tracking-widest text-center focus:border-blue-500 focus:ring-4 ring-blue-500/10 outline-none"
                                        />
                                        <div className="text-center mt-2 flex justify-center items-center gap-2 text-xs text-slate-500">
                                            <Info size={14} /> Digite apenas os <strong className="text-slate-800">NÚMEROS PRETOS</strong> (m³)
                                        </div>
                                    </div>

                                    {formData.leitura_atual && (
                                        <div className="mt-6 bg-blue-50 rounded-xl p-4 flex justify-between items-center border border-blue-100">
                                            <div>
                                                <span className="block text-xs font-bold text-blue-400 uppercase tracking-wider">Consumo Calculado</span>
                                                <div className="flex items-baseline gap-1">
                                                    <span className={`text-2xl font-black ${calculoPreview.consumo < 0 ? 'text-red-500' : 'text-blue-700'}`}>
                                                        {calculoPreview.consumo.toFixed(0)}
                                                    </span>
                                                    <span className="text-sm font-bold text-blue-400">m³</span>
                                                </div>
                                                <span className="text-[10px] text-blue-300">
                                                    {calculoPreview.isPrimeiroMes ? "(Leitura Inicial do Mês = 0)" : "(Leitura Atual - Anterior)"}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Meta Diária</span>
                                                <span className="text-lg font-bold text-slate-600">{calculoPreview.limite.toFixed(1)} m³</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {calculoPreview.excedeu && (
                                    <div className="animate-in slide-in-from-top-2">
                                        <div className="bg-red-50 border border-red-100 p-3 rounded-xl mb-3 flex items-center gap-2 text-red-700 text-sm font-bold">
                                            <AlertTriangle size={18} /> Consumo acima da meta! Justifique.
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500">Justificativa do Vazamento/Excesso</label>
                                                <textarea required minLength={5} rows={2} value={formData.justificativa} onChange={e => setFormData({ ...formData, justificativa: e.target.value })} className="w-full bg-slate-50 border-red-200 border p-3 rounded-xl" placeholder="Ex: Vazamento no banheiro dos alunos..."></textarea>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500">Ação Corretiva Adotada</label>
                                                <textarea required minLength={5} rows={2} value={formData.acao_corretiva} onChange={e => setFormData({ ...formData, acao_corretiva: e.target.value })} className="w-full bg-slate-50 border-red-200 border p-3 rounded-xl" placeholder="Ex: Registro fechado e prestador acionado..."></textarea>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <button type="submit" className="w-full bg-blue-600 text-white font-bold p-4 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">Salvar Leitura</button>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}