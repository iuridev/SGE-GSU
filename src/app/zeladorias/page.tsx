"use client";

import React, { useState, useEffect } from 'react';
// Adicionei o ícone 'Filter' e 'X'
import { ShieldCheck, Plus, Loader2, ArrowLeft, Home, CheckCircle2, Clock, FileText, ArrowRight, Archive, Briefcase, Hash, Banknote, CalendarClock, AlertTriangle, Edit, Filter, X } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { createZeladoria, updateZeladoriaEtapa, arquivarZeladoria, updateZeladoriaData } from '../actions';
import Link from 'next/link';

const ETAPAS = [
  { id: 1, label: "Processo SEI" },
  { id: 2, label: "Vistoria/Fotos" },
  { id: 3, label: "Análise SEFISC" },
  { id: 4, label: "Laudo CECIG" },
  { id: 5, label: "Ciência Valor" },
  { id: 6, label: "Aut. Casa Civil" },
  { id: 7, label: "Assinatura Termo" },
];

export default function ZeladoriasPage() {
  const [loading, setLoading] = useState(true);
  const [processos, setProcessos] = useState<any[]>([]);
  const [escolas, setEscolas] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Estados para Edição e Filtros
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState('');
  
  // --- NOVOS ESTADOS DE FILTRO ---
  const [filtroEscola, setFiltroEscola] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState('');

  const [formData, setFormData] = useState({ 
    escola_id: '', nome_zelador: '', cpf_zelador: '', numero_sei: '', cargo_zelador: '', data_inicio: '',
    isento_pagamento: false
  });

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }

      const { data: profile } = await supabase.from('usuarios').select('perfil, escola_id').eq('email', user.email).single();
      const admin = profile?.perfil === 'Regional';
      setIsAdmin(admin);

      await loadData(admin, profile?.escola_id);
      setLoading(false);
    };
    init();
  }, []);

  const loadData = async (admin: boolean, escolaVinculadaId: string) => {
    let query = supabase.from('zeladorias').select('*, escolas(nome)').neq('status', 'Arquivado').order('created_at', { ascending: false });
    if (!admin && escolaVinculadaId) query = query.eq('escola_id', escolaVinculadaId);

    const { data: listaProcessos } = await query;
    if (listaProcessos) setProcessos(listaProcessos);

    if (admin) {
      const { data: listaEscolas } = await supabase.from('escolas').select('id, nome').order('nome');
      if (listaEscolas) setEscolas(listaEscolas);
    }
  };

  // --- LÓGICA DE FILTRAGEM (CLIENT-SIDE) ---
  const processosFiltrados = processos.filter(proc => {
    // Filtro de Escola
    if (filtroEscola && proc.escola_id !== filtroEscola) return false;
    // Filtro de Etapa
    if (filtroEtapa && proc.etapa_atual.toString() !== filtroEtapa) return false;
    return true;
  });

  const limparFiltros = () => {
    setFiltroEscola('');
    setFiltroEtapa('');
  }

  // --- ACTIONS ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    let res;
    if (isEditing) res = await updateZeladoriaData(currentId, formData);
    else res = await createZeladoria(formData);

    if (res.error) alert(res.error);
    else { alert(isEditing ? "Atualizado!" : "Criado!"); setShowModal(false); window.location.reload(); }
  };

  const openNew = () => {
    setFormData({ escola_id: '', nome_zelador: '', cpf_zelador: '', numero_sei: '', cargo_zelador: '', data_inicio: '', isento_pagamento: false });
    setIsEditing(false); setCurrentId(''); setShowModal(true);
  }

  const openEdit = (proc: any) => {
    setFormData({
      escola_id: proc.escola_id,
      nome_zelador: proc.nome_zelador,
      cpf_zelador: proc.cpf_zelador,
      numero_sei: proc.numero_sei,
      cargo_zelador: proc.cargo_zelador,
      data_inicio: proc.data_inicio ? proc.data_inicio.split('T')[0] : '',
      isento_pagamento: proc.isento_pagamento
    });
    setIsEditing(true); setCurrentId(proc.id); setShowModal(true);
  }

  const avanvarEtapa = async (id: string, etapaAtual: number) => {
    if (etapaAtual >= 7) return;
    if (!confirm(`Confirmar conclusão da etapa?`)) return;
    const res = await updateZeladoriaEtapa(id, etapaAtual + 1);
    if (res.error) alert(res.error); else window.location.reload();
  };

  const arquivar = async (id: string) => {
    if (!confirm("Arquivar processo?")) return;
    await arquivarZeladoria(id); window.location.reload();
  }

  const getValidadeInfo = (proc: any) => {
    if (!proc.data_etapa_6) return null;
    const dataBase = new Date(proc.data_etapa_6);
    const validade = new Date(dataBase);
    validade.setFullYear(dataBase.getFullYear() + 2);
    const hoje = new Date();
    const diasRestantes = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    let cor = "text-green-600 bg-green-50 border-green-200";
    if (diasRestantes < 90) cor = "text-orange-600 bg-orange-50 border-orange-200";
    if (diasRestantes < 0) cor = "text-red-600 bg-red-50 border-red-200";
    return { dataFim: validade.toLocaleDateString('pt-BR'), dias: diasRestantes, classe: cor };
  };

  const RenderStepper = ({ processo }: { processo: any }) => {
     return (
      <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center w-full mt-6 px-2 gap-4 md:gap-0">
        <div className="absolute top-4 left-0 w-full h-1 bg-slate-100 -z-10 hidden md:block"></div>
        {ETAPAS.map((etapa) => {
          const isCompleted = processo.etapa_atual > etapa.id;
          const isCurrent = processo.etapa_atual === etapa.id;
          const dateKey = `data_etapa_${etapa.id}`;
          const dateValue = processo[dateKey] ? new Date(processo[dateKey]).toLocaleDateString('pt-BR') : null;
          return (
            <div key={etapa.id} className="flex md:flex-col items-center gap-3 md:gap-2 w-full md:w-auto">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${isCompleted ? 'bg-green-500 border-green-500 text-white' : isCurrent ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-300'}`}>
                {isCompleted ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{etapa.id}</span>}
              </div>
              <div className="flex flex-col md:items-center">
                <span className={`text-xs font-bold ${isCurrent ? 'text-blue-700' : 'text-slate-500'}`}>{etapa.label}</span>
                {dateValue && <span className="text-[10px] text-slate-400">{dateValue}</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-2 mb-10 pb-4 border-b border-slate-700"><ShieldCheck className="text-blue-400" /><span className="text-xl font-bold">SGE-GSU</span></div>
        <Link href="/" className="flex items-center gap-3 p-3 text-slate-400 hover:bg-slate-800 rounded-xl mb-2"><ArrowLeft size={20} /> Voltar</Link>
        <div className="flex items-center gap-3 p-3 bg-blue-600 rounded-xl font-medium"><Home size={20} /> Zeladorias</div>
      </aside>

      <main className="flex-1 p-10 overflow-auto">
        <header className="flex justify-between mb-8">
          <h1 className="text-3xl font-black">Gestão de Zeladorias</h1>
          {isAdmin && (
            <button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex gap-2 shadow-lg"><Plus /> Novo Processo</button>
          )}
        </header>

        {/* --- BARRA DE FILTROS --- */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                <Filter size={18} /> Filtros:
            </div>
            
            {/* Filtro Escola (Só Admin) */}
            {isAdmin && (
                <select 
                    value={filtroEscola} 
                    onChange={e => setFiltroEscola(e.target.value)} 
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 focus:ring-blue-500 outline-none w-full md:w-auto"
                >
                    <option value="">Todas as Escolas</option>
                    {escolas.map(e => (
                        <option key={e.id} value={e.id}>{e.nome}</option>
                    ))}
                </select>
            )}

            {/* Filtro Etapa */}
            <select 
                value={filtroEtapa} 
                onChange={e => setFiltroEtapa(e.target.value)} 
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 focus:ring-blue-500 outline-none w-full md:w-auto"
            >
                <option value="">Todas as Etapas</option>
                {ETAPAS.map(etapa => (
                    <option key={etapa.id} value={etapa.id}>{etapa.id} - {etapa.label}</option>
                ))}
            </select>

            {/* Botão Limpar */}
            {(filtroEscola || filtroEtapa) && (
                <button onClick={limparFiltros} className="flex items-center gap-1 text-sm text-red-500 font-bold hover:bg-red-50 px-3 py-2 rounded-xl transition-colors ml-auto md:ml-0">
                    <X size={16} /> Limpar
                </button>
            )}
        </div>

        {/* Lista Filtrada */}
        <div className="space-y-8">
          {processosFiltrados.length === 0 && <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300"><p className="text-slate-400 font-medium">Nenhum processo encontrado.</p></div>}

          {processosFiltrados.map(proc => {
            const validade = getValidadeInfo(proc);
            return (
              <div key={proc.id} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold uppercase">{proc.escolas?.nome}</span>
                      <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-lg text-xs font-bold flex gap-1 border border-purple-100"><Hash size={12}/> SEI: {proc.numero_sei || 'N/A'}</span>
                      {proc.isento_pagamento ? (
                        <span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-xs font-bold flex gap-1 border border-green-100"><Banknote size={12}/> Isento</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-xs font-bold flex gap-1 border border-slate-200"><Banknote size={12}/> Pagamento Mensal</span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText size={20} className="text-slate-400"/> {proc.nome_zelador}
                        {isAdmin && (
                            <button onClick={() => openEdit(proc)} className="ml-2 p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                <Edit size={16}/>
                            </button>
                        )}
                    </h3>

                    <div className="flex items-center gap-4 mt-1 ml-7 text-sm text-slate-500">
                      <p>CPF: {proc.cpf_zelador}</p>
                      <p className="flex items-center gap-1 text-slate-400 border-l pl-4"><Briefcase size={14}/> {proc.cargo_zelador}</p>
                    </div>

                    {validade && (
                        <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${validade.classe}`}>
                            <CalendarClock size={16}/>
                            <span className="text-sm font-bold">Validade: {validade.dataFim} <span className="opacity-75 font-normal ml-1">({validade.dias > 0 ? `Vence em ${validade.dias} dias` : `Venceu há ${Math.abs(validade.dias)} dias`})</span></span>
                        </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex gap-2">
                      {proc.etapa_atual < 7 ? (
                        <button onClick={() => avanvarEtapa(proc.id, proc.etapa_atual)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex gap-2 shadow-lg"><ArrowRight size={16} /> Próxima</button>
                      ) : (
                        <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-sm font-bold flex gap-2"><CheckCircle2 size={16}/> Concluído</div>
                      )}
                      <button onClick={() => arquivar(proc.id)} className="p-2 text-slate-300 hover:bg-slate-50 rounded-xl" title="Arquivar"><Archive size={20}/></button>
                    </div>
                  )}
                </div>
                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-50"><RenderStepper processo={proc} /></div>
              </div>
            )
          })}
        </div>

        {/* Modal Único */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-lg animate-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
              <h3 className="font-black text-xl mb-6">{isEditing ? 'Editar Processo' : 'Iniciar Ocupação'}</h3>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 uppercase ml-1">Escola</label><select required value={formData.escola_id} onChange={e => setFormData({...formData, escola_id: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl"><option value="">Selecione...</option>{escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Protocolo SEI</label><input required value={formData.numero_sei} onChange={e => setFormData({...formData, numero_sei: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl"/></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Data de Início</label><input required type="date" value={formData.data_inicio} onChange={e => setFormData({...formData, data_inicio: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl"/></div>
                </div>
                <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Nome</label><input required value={formData.nome_zelador} onChange={e => setFormData({...formData, nome_zelador: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl"/></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">CPF</label><input required value={formData.cpf_zelador} onChange={e => setFormData({...formData, cpf_zelador: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl"/></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Cargo</label><input required value={formData.cargo_zelador} onChange={e => setFormData({...formData, cargo_zelador: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl"/></div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                    <input type="checkbox" id="isentoCheck" checked={formData.isento_pagamento} onChange={e => setFormData({...formData, isento_pagamento: e.target.checked})} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"/>
                    <label htmlFor="isentoCheck" className="cursor-pointer"><span className="block font-bold text-sm text-slate-700">Isento de Pagamento de Locação</span><span className="text-xs text-slate-400">Marque apenas se o cargo permite isenção legal.</span></label>
                </div>
                <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 text-slate-500 font-bold p-3 rounded-xl">Cancelar</button><button type="submit" className="flex-1 bg-blue-600 text-white font-bold p-3 rounded-xl">Salvar</button></div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}