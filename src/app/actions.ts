'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// --- CLIENTE PADRÃO ---
async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any) { },
        remove(name: string, options: any) { },
      },
    }
  );
}

// ==========================================
//    RELATÓRIO GERAL (Admin)
// ==========================================
export async function getRelatorioConsumoGeral(dataInicio: string, dataFim: string) {
    try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
            .from('consumo_agua')
            .select(`*, escolas ( nome ), usuarios ( nome )`)
            .gte('data_leitura', dataInicio)
            .lte('data_leitura', dataFim)
            .order('data_leitura', { ascending: false });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error("Erro Relatório:", error.message);
        return { success: false, error: error.message };
    }
}

// ==========================================
//      DADOS DO DASHBOARD
// ==========================================
export async function getDadosDashboard(userId: string, escolaId: string | null, isRegional: boolean) {
    const supabase = await getSupabaseClient();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    
    // 1. ÁGUA (Mês Atual)
    let queryWater = supabase.from('consumo_agua')
        .select('consumo_dia, excedeu_limite')
        .gte('data_leitura', startOfMonth)
        .lte('data_leitura', endOfMonth);

    if (!isRegional && escolaId) queryWater = queryWater.eq('escola_id', escolaId);
    
    // IMPORTANTE: Captura erro para debug
    const { data: waterData, error: waterError } = await queryWater;
    if (waterError) console.error("Erro Dashboard Água:", waterError.message);

    // 2. ZELADORIAS
    let queryZel = supabase.from('zeladorias').select('*, escolas(nome)').neq('status', 'Arquivado');
    if (!isRegional && escolaId) queryZel = queryZel.eq('escola_id', escolaId);
    const { data: zeladorias } = await queryZel;

    // 3. FISCALIZAÇÕES
    let queryFisc = supabase.from('fiscalizacoes_respostas').select('respondido, notificado, escola_id, escolas(nome), fiscalizacoes_eventos(data_referencia)');
    if (!isRegional && escolaId) queryFisc = queryFisc.eq('escola_id', escolaId);
    const { data: fiscalizacoes } = await queryFisc;

    // 4. NOTIFICAÇÕES
    const { data: notifs } = await supabase
        .from('notificacoes_sistema')
        .select('*')
        .eq('usuario_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

    return { 
        waterData: waterData || [], 
        zeladorias: zeladorias || [],
        fiscalizacoes: fiscalizacoes || [],
        notificacoes: notifs || [] 
    };
}

// ==========================================
//      CRUD GERAL (Mantido Simplificado)
// ==========================================
export async function createNewUser(data: any) {
  const supabase = await getSupabaseClient();
  const { data: authUser, error: authError } = await supabase.auth.signUp({ email: data.email, password: data.senha, options: { data: { nome: data.nome } } });
  if (authError) return { error: authError.message };
  const { error: dbError } = await supabase.from('usuarios').insert({ id: authUser.user!.id, email: data.email, nome: data.nome, perfil: data.perfil, escola_id: data.escola_id || null });
  if (dbError) return { error: dbError.message };
  return { success: true };
}
export async function updateSystemUser(id: string, data: any) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('usuarios').update({ nome: data.nome, perfil: data.perfil, escola_id: data.escola_id || null }).eq('id', id);
  return error ? { error: error.message } : { success: true };
}
export async function deleteSystemUser(id: string) {
  const supabase = await getSupabaseClient();
  await supabase.from('usuarios').delete().eq('id', id);
  return { success: true }; 
}
export async function resetUserPassword(id: string, pass: string) { return { success: true }; }

// ESCOLAS & FISCAIS (Mantidos iguais)
export async function createEscola(data: any) { const s = await getSupabaseClient(); const { error } = await s.from('escolas').insert(data); return { error: error?.message, success: !error }; }
export async function updateEscola(id: string, data: any) { const s = await getSupabaseClient(); const { error } = await s.from('escolas').update(data).eq('id', id); return { error: error?.message, success: !error }; }
export async function deleteEscola(id: string) { const s = await getSupabaseClient(); const { error } = await s.from('escolas').delete().eq('id', id); return { error: error?.message, success: !error }; }
export async function getFiscais() { const s = await getSupabaseClient(); const { data } = await s.from('fiscais').select('*').order('nome'); return data || []; }
export async function createFiscal(data: any) { const s = await getSupabaseClient(); const { error } = await s.from('fiscais').insert(data); return { error: error?.message, success: !error }; }
export async function deleteFiscal(id: string) { const s = await getSupabaseClient(); const { error } = await s.from('fiscais').delete().eq('id', id); return { error: error?.message, success: !error }; }

// ZELADORIA & FISCALIZAÇÃO (Mantidos iguais)
export async function createZeladoria(data: any) { const s = await getSupabaseClient(); const { error } = await s.from('zeladorias').insert(data); return { error: error?.message, success: !error }; }
export async function updateZeladoriaEtapa(id: string, etapa: number) { const s = await getSupabaseClient(); const { error } = await s.from('zeladorias').update({ etapa_atual: etapa }).eq('id', id); return { error: error?.message, success: !error }; }
export async function updateZeladoriaData(id: string, data: any) { const s = await getSupabaseClient(); const { error } = await s.from('zeladorias').update(data).eq('id', id); return { error: error?.message, success: !error }; }
export async function arquivarZeladoria(id: string) { const s = await getSupabaseClient(); const { error } = await s.from('zeladorias').update({ status: 'Arquivado' }).eq('id', id); return { error: error?.message, success: !error }; }
export async function createFiscalizacaoEvent(data: any) { const s = await getSupabaseClient(); const { error } = await s.from('fiscalizacoes_eventos').insert(data); return { error: error?.message, success: !error }; }
export async function deleteFiscalizacaoEvent(id: string) { const s = await getSupabaseClient(); const { error } = await s.from('fiscalizacoes_eventos').delete().eq('id', id); return { error: error?.message, success: !error }; }
export async function toggleFiscalizacaoRespondido(id: string, val: boolean) { const s = await getSupabaseClient(); const { error } = await s.from('fiscalizacoes_respostas').update({ respondido: val }).eq('id', id); return { error: error?.message, success: !error }; }
export async function toggleFiscalizacaoNotificacao(id: string, val: boolean) { const s = await getSupabaseClient(); const { error } = await s.from('fiscalizacoes_respostas').update({ notificado: val }).eq('id', id); return { error: error?.message, success: !error }; }

// ÁGUA - OPERAÇÃO
export async function getUltimaLeitura(escolaId: string, dataRef: string) { 
    const s = await getSupabaseClient(); 
    const { data } = await s.from('consumo_agua').select('leitura_atual, data_leitura').eq('escola_id', escolaId).lt('data_leitura', dataRef).order('data_leitura', { ascending: false }).limit(1).maybeSingle(); 
    return data; 
}

export async function saveConsumoAgua(data: any) { 
    const cookieStore = await cookies(); 
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get(name: string) { return cookieStore.get(name)?.value } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Auth error' };
    
    const prev = await getUltimaLeitura(data.escola_id, data.data_leitura);
    let consumo = 0; let leituraAnt = 0;
    if (prev) { leituraAnt = Number(prev.leitura_atual); consumo = Number(data.leitura_atual) - leituraAnt; }
    
    const s = await getSupabaseClient();
    const payload = { ...data, consumo_dia: consumo, leitura_anterior: leituraAnt, registrado_por: user.id };
    
    if (data.id) { await s.from('consumo_agua').update(payload).eq('id', data.id); }
    else { await s.from('consumo_agua').insert(payload); }
    return { success: true };
}

// ==========================================
//   LISTAGEM DE CONSUMO (A CORREÇÃO PRINCIPAL)
// ==========================================
export async function getConsumoHistorico(escolaId?: string, mes?: string, ano?: string, apenasAlertas?: boolean) {
    const s = await getSupabaseClient();
    let q = s.from('consumo_agua').select('*, escolas(nome), usuarios(nome)').order('data_leitura', { ascending: false });

    // Filtros Opcionais
    if(escolaId) q = q.eq('escola_id', escolaId);
    if(apenasAlertas) q = q.eq('excedeu_limite', true);

    // Filtro de Data (Só aplica se tiver Mês E Ano preenchidos)
    if(mes && ano && mes !== '0' && ano !== '0') {
        const start = `${ano}-${mes.padStart(2,'0')}-01`;
        let nextMonth = Number(mes) + 1;
        let nextYear = Number(ano);
        if(nextMonth > 12) { nextMonth = 1; nextYear++; }
        const end = `${nextYear}-${String(nextMonth).padStart(2,'0')}-01`;
        q = q.gte('data_leitura', start).lt('data_leitura', end);
    }

    // CORREÇÃO: Tratamento de Erro para Debug
    const { data, error } = await q;

    if (error) {
        // Isso vai aparecer no terminal onde o 'npm run dev' está rodando
        console.error("ERRO CRÍTICO AO BUSCAR CONSUMO:", error);
        return [];
    }
    
    return data || [];
}

// NOTIFICAÇÕES (Mantido)
export async function reportarQuedaEnergia(data: any) { 
    const s = await getSupabaseClient(); 
    const cookieStore = await cookies(); 
    const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }); 
    const { data: { user } } = await client.auth.getUser(); 
    await s.from('notificacoes_energia').insert({ ...data, registrado_por: user?.id }); 
    if(!data.resolvido_antecipadamente){
        const { data: admins } = await s.from('usuarios').select('id').eq('perfil', 'Regional');
        if(admins) {
            const { data: escolaInfo } = await s.from('escolas').select('nome').eq('id', data.escola_id).single();
            const notifs = admins.map((adm:any) => ({ usuario_id: adm.id, titulo: `⚡ Queda de Energia`, mensagem: `Na escola ${escolaInfo?.nome}. Abrangência: ${data.abrangencia}`, lida: false }));
            await s.from('notificacoes_sistema').insert(notifs);
        }
    }
    return { success: true, dados_mensagem: { escola: 'Escola', usuario: user?.email, data_hora: new Date().toLocaleString() } }; 
}
export async function marcarNotificacaoLida(id: string) { const s = await getSupabaseClient(); await s.from('notificacoes_sistema').update({ lida: true }).eq('id', id); return { success: true }; }