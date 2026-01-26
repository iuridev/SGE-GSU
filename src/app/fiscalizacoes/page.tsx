"use client";

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowLeft, Loader2, Plus, Calendar, CheckSquare, Bell, Trash2, Search, X, ClipboardList } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { createFiscalizacaoEvent, toggleFiscalizacaoRespondido, toggleFiscalizacaoNotificacao, deleteFiscalizacaoEvent } from '../actions';
import Link from 'next/link';

export default function FiscalizacoesPage() {
  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [novaData, setNovaData] = useState('');
  
  // Estado para controlar qual accordion (data) está aberto
  const [openEventId, setOpenEventId] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }

    const { data: profile } = await supabase.from('usuarios').select('perfil').eq('email', user.email).single();
    setIsAdmin(profile?.perfil === 'Regional');

    // Carregar Eventos e suas Respostas (Aninhado)
    const { data } = await supabase
      .from('fiscalizacoes_eventos')
      .select(`
        *,
        fiscalizacoes_respostas (
          id, respondido, notificado,
          escolas ( id, nome, polo )
        )
      `)
      .order('data_referencia', { ascending: false });

    if (data) setEventos(data);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaData) return;
    const res = await createFiscalizacaoEvent(novaData);
    if (res.error) alert(res.error);
    else { alert('Lista de fiscalização gerada!'); setShowModal(false); init(); }
  };

  const handleCheck = async (respId: string, currentStatus: boolean) => {
    await toggleFiscalizacaoRespondido(respId, currentStatus);
    init(); // Recarrega para atualizar UI
  };

  const handleNotify = async (respId: string, currentStatus: boolean) => {
    await toggleFiscalizacaoNotificacao(respId, currentStatus);
    init();
  };

  const handleDelete = async (id: string) => {
    if(confirm("Tem certeza? Isso apagará todo o histórico deste dia.")) {
        await deleteFiscalizacaoEvent(id);
        init();
    }
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-2 mb-10 pb-4 border-b border-slate-700"><ShieldCheck className="text-blue-400" /><span className="text-xl font-bold">SGE-GSU</span></div>
        <Link href="/" className="flex items-center gap-3 p-3 text-slate-400 hover:bg-slate-800 rounded-xl mb-2"><ArrowLeft size={20} /> Voltar</Link>
        <div className="flex items-center gap-3 p-3 bg-blue-600 rounded-xl font-medium"><ClipboardList size={20} /> Fiscalização</div>
      </aside>

      <main className="flex-1 p-10 overflow-auto">
        <header className="flex justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black">Fiscalização de Serviços</h1>
            <p className="text-slate-500">Controle de resposta semanal das escolas (Limpeza)</p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex gap-2 shadow-lg"><Plus /> Nova Semana</button>
          )}
        </header>

        <div className="space-y-6">
          {eventos.length === 0 && <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400">Nenhuma fiscalização registrada.</div>}

          {eventos.map(evento => {
            const total = evento.fiscalizacoes_respostas.length;
            const respondidos = evento.fiscalizacoes_respostas.filter((r: any) => r.respondido).length;
            const percent = total > 0 ? Math.round((respondidos / total) * 100) : 0;
            const isOpen = openEventId === evento.id;

            return (
              <div key={evento.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Cabeçalho do Card (Clicável) */}
                <div 
                    onClick={() => setOpenEventId(isOpen ? null : evento.id)}
                    className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl font-bold">
                            {new Date(evento.data_referencia).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg">Questionário Semanal</h3>
                            <p className="text-sm text-slate-500">{respondidos} de {total} escolas responderam</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="w-32 bg-slate-100 rounded-full h-2.5">
                            <div className="bg-green-500 h-2.5 rounded-full transition-all" style={{ width: `${percent}%` }}></div>
                        </div>
                        <span className="font-bold text-slate-700">{percent}%</span>
                        {isAdmin && (
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(evento.id); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                        )}
                    </div>
                </div>

                {/* Lista de Escolas (Accordion) */}
                {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-6 animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {evento.fiscalizacoes_respostas
                                .sort((a: any, b: any) => a.escolas.nome.localeCompare(b.escolas.nome)) // Ordem alfabética
                                .map((resp: any) => (
                                <div key={resp.id} className={`p-4 rounded-xl border flex justify-between items-center transition-all ${resp.respondido ? 'bg-white border-green-200 shadow-sm' : 'bg-white border-slate-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => handleCheck(resp.id, resp.respondido)}
                                            className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${resp.respondido ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-blue-500'}`}
                                        >
                                            {resp.respondido && <CheckSquare size={16}/>}
                                        </button>
                                        <div>
                                            <div className={`font-bold text-sm ${resp.respondido ? 'text-slate-800' : 'text-slate-500'}`}>{resp.escolas.nome}</div>
                                            {!resp.respondido && <div className="text-[10px] text-red-500 font-bold uppercase">Pendente</div>}
                                        </div>
                                    </div>
                                    
                                    {!resp.respondido && (
                                        <button 
                                            onClick={() => handleNotify(resp.id, resp.notificado)}
                                            className={`p-2 rounded-lg transition-colors ${resp.notificado ? 'bg-orange-100 text-orange-600 animate-pulse' : 'text-slate-300 hover:bg-slate-100'}`}
                                            title="Enviar Notificação / Cobrança"
                                        >
                                            <Bell size={18} fill={resp.notificado ? "currentColor" : "none"} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Nova Data */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm animate-in zoom-in duration-200">
              <h3 className="font-black text-xl mb-4">Nova Fiscalização</h3>
              <p className="text-slate-500 text-sm mb-6">Selecione a sexta-feira de referência. Isso criará uma lista de pendências para todas as escolas.</p>
              <form onSubmit={handleCreate}>
                <input required type="date" value={novaData} onChange={e => setNovaData(e.target.value)} className="w-full bg-slate-50 border p-3 rounded-xl mb-4 text-slate-700"/>
                <div className="flex gap-2">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 text-slate-500 font-bold p-3 rounded-xl">Cancelar</button>
                    <button type="submit" className="flex-1 bg-blue-600 text-white font-bold p-3 rounded-xl">Criar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}