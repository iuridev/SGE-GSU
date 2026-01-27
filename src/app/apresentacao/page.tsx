"use client";

import React from 'react';
import { 
  ShieldCheck, Home, FileText, Bell, Users, Lock, Download, BarChart3, 
  CheckCircle2, Server, Globe, Droplets, ClipboardList, Zap, LayoutDashboard, 
  School, FileCheck, FileDown 
} from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';

export default function InfograficoPage() {

  // --- FUNÇÃO DE GERAÇÃO DO PDF ---
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Configurações de estilo
    const blueColor = '#1e3a8a'; // slate-900 like
    const lightBlue = '#2563eb'; // blue-600 like
    
    let y = 20; // Cursor vertical

    // 1. CAPA / CABEÇALHO
    doc.setFillColor(30, 58, 138); // Fundo Azul Escuro
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("SGE-GSU", 20, 25);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Sistema de Gestão Escolar e Zeladorias", 20, 32);
    doc.text("Unidade Regional de Ensino Guarulhos Sul", 20, 38);

    y = 65;

    // 2. SEÇÃO OPERACIONAL (ESCOLAS)
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("1. Perfil Operacional (Para a Escola)", 20, y);
    y += 10;

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    
    const itemsOperacional = [
        { title: "Controle de Água Inteligente", desc: "Cálculo automático de consumo e meta diária por aluno. Alerta de excessos." },
        { title: "Fiscalização Semanal", desc: "Check-in rápido da limpeza terceirizada com histórico digital." },
        { title: "Gestão de Zeladoria", desc: "Visualização transparente do fluxo de ocupação e prazos." }
    ];

    itemsOperacional.forEach(item => {
        doc.setFont("helvetica", "bold");
        doc.text(`• ${item.title}`, 20, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        // Quebra de linha manual simples para descrição
        const splitDesc = doc.splitTextToSize(item.desc, 170);
        doc.text(splitDesc, 26, y);
        y += (splitDesc.length * 6) + 4;
        doc.setTextColor(50, 50, 50);
    });

    y += 10;

    // 3. SEÇÃO ADMINISTRATIVA (DIRETORIA)
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("2. Perfil Administrativo (Para a Diretoria)", 20, y);
    y += 10;

    const itemsAdmin = [
        { title: "Painel de Decisão (Dashboard)", desc: "KPIs globais, médias de consumo e totais de processos em tempo real." },
        { title: "Gestão de Alertas", desc: "Central de justificativas de água e ações corretivas das escolas." },
        { title: "Relatórios Oficiais", desc: "PDFs padronizados com cabeçalho institucional prontos para impressão." },
        { title: "Controle de Acesso", desc: "Gerenciamento hierárquico de usuários, escolas e fiscais." }
    ];

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);

    itemsAdmin.forEach(item => {
        // Verifica quebra de página
        if (y > 270) { doc.addPage(); y = 20; }

        doc.setFont("helvetica", "bold");
        doc.text(`• ${item.title}`, 20, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        const splitDesc = doc.splitTextToSize(item.desc, 170);
        doc.text(splitDesc, 26, y);
        y += (splitDesc.length * 6) + 4;
        doc.setTextColor(50, 50, 50);
    });

    y += 10;
    if (y > 250) { doc.addPage(); y = 20; }

    // 4. FLUXO DE TRABALHO
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("3. Fluxo Padronizado de Zeladoria", 20, y);
    y += 10;

    const etapas = [
        "1. Processo SEI", "2. Vistoria/Fotos", "3. Análise SEFISC", 
        "4. Laudo CECIG", "5. Ciência do Valor", "6. Aut. Casa Civil", "7. Assinatura Termo"
    ];

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    
    // Desenha as etapas em caixas simples
    let xStep = 20;
    etapas.forEach((etapa, i) => {
        // Verifica largura
        if (xStep > 150) { xStep = 20; y += 15; }
        
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(xStep, y, 40, 10, 2, 2);
        doc.text(etapa, xStep + 2, y + 6);
        xStep += 45;
    });

    // Rodapé
    const date = new Date().toLocaleDateString('pt-BR');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Documento gerado em ${date} via SGE-GSU`, 20, pageHeight - 10);

    doc.save('apresentacao_sistema_sge.pdf');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 relative">
      
      {/* BOTÃO FLUTUANTE DE PDF (FIXO NO CANTO) */}
      <button 
        onClick={handleExportPDF}
        className="fixed bottom-8 right-8 z-50 bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-2xl flex items-center gap-2 transition-transform hover:scale-110 group"
        title="Baixar Apresentação em PDF"
      >
        <FileDown size={24} />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-bold whitespace-nowrap">
            Baixar PDF
        </span>
      </button>

      {/* HERO SECTION */}
      <header className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-20 text-center rounded-b-[4rem] shadow-2xl mb-16 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        
        <div className="relative z-10 flex flex-col items-center">
            {/* ... Conteúdo do Header ... */}
            <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-md mb-6 border border-white/10 shadow-xl">
                <ShieldCheck size={72} className="text-blue-400" />
            </div>
            <h1 className="text-6xl font-black mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-white">
              SGE-GSU
            </h1>
            <p className="text-2xl font-medium text-blue-100 max-w-3xl mx-auto leading-relaxed">
              O Ecossistema Digital da <span className="font-bold text-white">Unidade Regional de Ensino Guarulhos Sul</span>
            </p>
            
            {/* Botão de PDF também no Header para visibilidade */}
            <div className="mt-8 flex gap-4 justify-center">
                <button onClick={handleExportPDF} className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all">
                    <FileDown size={20}/> Baixar Apresentação
                </button>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 space-y-24">

        {/* --- SEÇÃO 1: PARA A ESCOLA (OPERACIONAL) --- */}
        <section>
            <div className="flex flex-col md:flex-row items-center gap-6 mb-12">
                <div className="bg-green-100 p-4 rounded-2xl text-green-700 shadow-sm">
                    <School size={40} />
                </div>
                <div>
                    <h2 className="text-4xl font-black text-slate-800">Para a Unidade Escolar</h2>
                    <p className="text-xl text-slate-500 mt-2">Agilidade e transparência para o Perfil Operacional.</p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Card Água */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-lg hover:shadow-xl transition-all group">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                        <Droplets size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Controle de Água Inteligente</h3>
                    <p className="text-slate-600 leading-relaxed mb-4">
                        Acabe com as planilhas. Lance a leitura do hidrômetro e o sistema <strong className="text-blue-600">calcula o consumo automaticamente</strong>.
                    </p>
                    <ul className="space-y-2 text-sm text-slate-500">
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500"/> Meta diária calculada por aluno</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500"/> Bloqueio de erros de digitação</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500"/> Justificativa integrada em caso de excesso</li>
                    </ul>
                </div>

                {/* Card Fiscalização */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-lg hover:shadow-xl transition-all group">
                    <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                        <ClipboardList size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Fiscalização Semanal</h3>
                    <p className="text-slate-600 leading-relaxed mb-4">
                        Receba notificações direto no painel quando for hora de avaliar a limpeza terceirizada.
                    </p>
                    <ul className="space-y-2 text-sm text-slate-500">
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500"/> Check-in rápido de conformidade</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500"/> Histórico digitalizado</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500"/> Alertas visuais de pendências</li>
                    </ul>
                </div>

                {/* Card Zeladoria */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-lg hover:shadow-xl transition-all group">
                    <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform">
                        <Home size={28} /> 
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Ocupação de Zeladoria</h3>
                    <p className="text-slate-600 leading-relaxed mb-4">
                        Acompanhe em tempo real em qual etapa está o processo de ocupação da sua unidade.
                    </p>
                    <ul className="space-y-2 text-sm text-slate-500">
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500"/> Transparência total do fluxo</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500"/> Visualização de Prazos</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500"/> Saber exatamente onde o processo está</li>
                    </ul>
                </div>
            </div>
        </section>

        {/* DIVIDER */}
        <div className="w-full h-px bg-slate-200"></div>

        {/* --- SEÇÃO 2: PARA A DIRETORIA (ADMINISTRATIVO) --- */}
        <section>
            <div className="flex flex-col md:flex-row items-center gap-6 mb-12 justify-end text-right">
                <div>
                    <h2 className="text-4xl font-black text-slate-800">Para a Diretoria de Ensino</h2>
                    <p className="text-xl text-slate-500 mt-2">Gestão macro e controle total para o Perfil Administrativo.</p>
                </div>
                <div className="bg-blue-100 p-4 rounded-2xl text-blue-700 shadow-sm order-first md:order-last">
                    <LayoutDashboard size={40} />
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-900 text-white p-6 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 rounded-full blur-[60px] opacity-50"></div>
                    <BarChart3 className="mb-4 text-blue-400" size={32}/>
                    <h3 className="text-lg font-bold mb-2">Painel de Decisão</h3>
                    <p className="text-slate-400 text-sm">Dashboard com KPIs globais: total de processos, taxas de resposta e médias de consumo de todas as escolas em uma única tela.</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md">
                    <Bell className="mb-4 text-red-500" size={32}/>
                    <h3 className="text-lg font-bold mb-2 text-slate-800">Gestão de Alertas</h3>
                    <p className="text-slate-500 text-sm">Visualize centralizadamente quais escolas estouraram a meta de água e analise as justificativas e ações corretivas enviadas.</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md">
                    <FileDown className="mb-4 text-green-500" size={32}/>
                    <h3 className="text-lg font-bold mb-2 text-slate-800">Relatórios Oficiais</h3>
                    <p className="text-slate-500 text-sm">Geração de PDFs profissionais com cabeçalho institucional para Zeladorias, Consumo de Água e Fiscalizações.</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-md">
                    <Users className="mb-4 text-purple-500" size={32}/>
                    <h3 className="text-lg font-bold mb-2 text-slate-800">Controle de Acesso</h3>
                    <p className="text-slate-500 text-sm">Gerencie usuários, crie novas escolas, cadastre fiscais de contrato e mantenha a base de dados organizada.</p>
                </div>
            </div>
        </section>

        {/* --- SEÇÃO 3: FLUXO DE TRABALHO --- */}
        <section className="bg-white rounded-[3rem] p-12 shadow-xl border border-slate-100">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-black text-slate-800">Fluxo de Zeladoria Padronizado</h2>
                <p className="text-slate-500 mt-2">O sistema guia o processo administrativo através das 7 etapas obrigatórias.</p>
            </div>
            
            <div className="relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -z-0 hidden md:block transform -translate-y-1/2"></div>
                <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
                    {[
                        {n:1, t:"Processo SEI", i: <FileText size={18}/>}, 
                        {n:2, t:"Vistoria", i: <CheckCircle2 size={18}/>}, 
                        {n:3, t:"Análise SEFISC", i: <Server size={18}/>}, // Substitui Search por Server
                        {n:4, t:"Laudo CECIG", i: <FileCheck size={18}/>}, 
                        {n:5, t:"Ciência Valor", i: <DollarSignIcon size={18}/>}, 
                        {n:6, t:"Casa Civil", i: <School size={18}/>}, 
                        {n:7, t:"Assinatura", i: <Zap size={18}/>}
                    ].map((step, i) => (
                        <div key={i} className="flex flex-col items-center gap-4 relative z-10 group">
                            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 font-bold flex items-center justify-center shadow-sm group-hover:border-blue-500 group-hover:text-blue-600 group-hover:shadow-blue-200 transition-all">
                                {step.i}
                            </div>
                            <div className="text-center">
                                <span className="block text-xs font-black text-slate-300 mb-1">ETAPA {step.n}</span>
                                <span className="text-xs font-bold text-slate-700 uppercase leading-tight">{step.t}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* --- FOOTER CTA --- */}
        <div className="text-center pt-10">
             <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-full font-black text-xl shadow-xl hover:scale-105 transition-transform flex items-center justify-center gap-3 mx-auto w-fit">
                <LayoutDashboard /> Acessar Sistema Agora
             </Link>
             <p className="mt-4 text-slate-400 text-sm">Desenvolvido para modernizar a Gestão Pública</p>
        </div>

      </main>
    </div>
  );
}

// Icone auxiliar
const DollarSignIcon = ({size}: {size:number}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
);