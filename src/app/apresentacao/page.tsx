"use client";

import React from 'react';
import { ShieldCheck, FileText, Bell, Users, Lock, Download, BarChart3, CheckCircle2, Server, Globe } from 'lucide-react';
import Link from 'next/link';

export default function InfograficoPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* HEADER / HERO SECTION */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-16 text-center rounded-b-[3rem] shadow-2xl mb-12">
        <div className="flex justify-center mb-6">
            <div className="bg-white/10 p-4 rounded-full backdrop-blur-sm">
                <ShieldCheck size={64} className="text-blue-200" />
            </div>
        </div>
        <h1 className="text-5xl font-black mb-4 tracking-tight">SGE-GSU</h1>
        <p className="text-2xl font-medium text-blue-100 max-w-2xl mx-auto">
          Sistema de Gestão Escolar e Controle de Zeladorias
        </p>
        <div className="mt-8 inline-block bg-white/20 px-6 py-2 rounded-full text-sm font-bold tracking-widest uppercase">
          Unidade Regional de Ensino Guarulhos Sul
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 space-y-16">

        {/* 1. O PROBLEMA VS SOLUÇÃO */}
        <section className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-xl font-bold text-slate-400 uppercase mb-4">O Desafio</h3>
                <ul className="space-y-3 text-slate-600 font-medium">
                    <li className="flex items-center gap-2"><span className="text-red-500">✕</span> Controle manual em planilhas</li>
                    <li className="flex items-center gap-2"><span className="text-red-500">✕</span> Perda de prazos de validade</li>
                    <li className="flex items-center gap-2"><span className="text-red-500">✕</span> Dificuldade em gerar relatórios</li>
                </ul>
            </div>
            <div className="bg-blue-600 text-white p-8 rounded-3xl shadow-lg shadow-blue-600/20">
                <h3 className="text-xl font-bold text-blue-200 uppercase mb-4">A Solução SGE-GSU</h3>
                <ul className="space-y-3 font-bold text-lg">
                    <li className="flex items-center gap-2"><CheckCircle2 className="text-green-300"/> Centralização Digital</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="text-green-300"/> Alertas Automáticos</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="text-green-300"/> Workflow de Aprovação</li>
                </ul>
            </div>
        </section>

        {/* 2. O FLUXO DA ZELADORIA (STEPPER VISUAL) */}
        <section>
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><FileText size={24}/></div>
                <h2 className="text-3xl font-black text-slate-800">Fluxo de Processo Inteligente</h2>
            </div>
            
            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500"></div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-center">
                    {[
                        {n:1, t:"Processo SEI"}, {n:2, t:"Vistoria"}, {n:3, t:"Análise SEFISC"},
                        {n:4, t:"Laudo CECIG"}, {n:5, t:"Ciência Valor"}, {n:6, t:"Casa Civil"}, {n:7, t:"Assinatura"}
                    ].map((step, i) => (
                        <div key={i} className="flex flex-col items-center gap-3 relative group">
                            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 font-black flex items-center justify-center text-xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm border-2 border-slate-100 group-hover:border-blue-600 z-10">
                                {step.n}
                            </div>
                            <span className="text-xs font-bold text-slate-600 uppercase leading-tight">{step.t}</span>
                            {i < 6 && <div className="hidden lg:block absolute top-6 left-[50%] w-full h-0.5 bg-slate-100 -z-0"></div>}
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* 3. FUNCIONALIDADES CHAVE (GRID) */}
        <section>
             <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg"><Server size={24}/></div>
                <h2 className="text-3xl font-black text-slate-800">Funcionalidades do Sistema</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Card 1 */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <Bell className="text-orange-500 mb-4 h-8 w-8" />
                    <h3 className="font-bold text-lg mb-2">Monitoramento de Validade</h3>
                    <p className="text-slate-500 text-sm">Cálculo automático de 2 anos após a Casa Civil. Alertas visuais (Farol) para contratos vencendo em 90 dias.</p>
                </div>
                {/* Card 2 */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <Download className="text-blue-500 mb-4 h-8 w-8" />
                    <h3 className="font-bold text-lg mb-2">Relatórios em PDF</h3>
                    <p className="text-slate-500 text-sm">Exportação profissional com cabeçalho institucional oficial da Diretoria de Ensino e Seção de Fiscalização.</p>
                </div>
                {/* Card 3 */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <Lock className="text-green-500 mb-4 h-8 w-8" />
                    <h3 className="font-bold text-lg mb-2">Segurança Hierárquica</h3>
                    <p className="text-slate-500 text-sm">Perfil <strong>Regional</strong> (Admin Total) vs Perfil <strong>Operacional</strong> (Acesso restrito à própria escola).</p>
                </div>
            </div>
        </section>

        {/* 4. DASHBOARD PREVIEW */}
        <section className="bg-slate-900 rounded-3xl p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-50"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                <div className="flex-1">
                    <h2 className="text-3xl font-black mb-4">Gestão à Vista (Dashboard)</h2>
                    <p className="text-slate-400 mb-6 text-lg">Uma tela inicial que permite aos gestores tomarem decisões rápidas baseadas em dados.</p>
                    <ul className="space-y-2">
                        <li className="flex items-center gap-2"><BarChart3 size={18} className="text-blue-400"/> Gráfico de distribuição por etapas</li>
                        <li className="flex items-center gap-2"><Users size={18} className="text-purple-400"/> Indicador de Isenção de Pagamento</li>
                        <li className="flex items-center gap-2"><Globe size={18} className="text-green-400"/> Filtros por Escola e Polo</li>
                    </ul>
                </div>
                <div className="flex-1 bg-white/10 p-6 rounded-xl backdrop-blur-sm border border-white/10 w-full">
                    <div className="flex gap-4 mb-4">
                        <div className="bg-blue-500 h-20 w-1/2 rounded-lg animate-pulse"></div>
                        <div className="bg-orange-500 h-20 w-1/2 rounded-lg animate-pulse"></div>
                    </div>
                    <div className="bg-slate-800 h-32 w-full rounded-lg"></div>
                </div>
            </div>
        </section>

        <div className="text-center pt-10">
             <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl hover:scale-105 transition-transform">
                Acessar Sistema Agora
             </Link>
        </div>

      </main>
    </div>
  );
}