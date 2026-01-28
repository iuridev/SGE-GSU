'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// --- HELPER: CLIENTE ADMIN ---
async function getSupabaseAdmin() {
  const cookieStore = await cookies();
  
  // VERIFICAÇÃO DE SEGURANÇA
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("🚨 ERRO GRAVE: SUPABASE_SERVICE_ROLE_KEY não encontrada! O Admin não verá dados de outras escolas.");
  }

  // Tenta usar a chave de serviço. Se falhar, cai na anonima (que tem bloqueio RLS)
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    adminKey!,
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
//    RELATÓRIO GERAL DE ÁGUA (ADMIN)
// ==========================================
export async function getRelatorioConsumoGeral(dataInicio: string, dataFim: string) {
    try {
        const admin = await getSupabaseAdmin();
        
        console.log(`🔍 Buscando relatório de ${dataInicio} até ${dataFim}...`);

        // Busca registros de TODAS as escolas no intervalo
        // Importante: Select explicito para garantir join
        const { data, error } = await admin
            .from('consumo_agua')
            .select(`
                id,
                data_leitura,
                leitura_atual,
                consumo_dia,
                excedeu_limite,
                escolas ( nome ),
                usuarios ( nome )
            `)
            .gte('data_leitura', dataInicio)
            .lte('data_leitura', dataFim)
            .order('data_leitura', { ascending: false });

        if (error) {
            console.error("❌ Erro no Supabase:", error.message);
            throw error;
        }

        console.log(`✅ Sucesso! Encontrados ${data?.length || 0} registros.`);
        return { success: true, data: data || [] };

    } catch (error: any) {
        console.error("Erro relatorio agua:", error);
        return { success: false, error: error.message };
    }
}

// ==========================================
//      DADOS DO DASHBOARD (CENTRALIZADO)
// ==========================================
export async function getDadosDashboard(userId: string, escolaId: string | null, isRegional: boolean) {
    const admin = await getSupabaseAdmin();
    
    // Datas
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    
    // 1. ÁGUA
    let queryWater = admin.from('consumo_agua').select('consumo_dia, excedeu_limite').gte('data_leitura', startOfMonth).lte('data_leitura', endOfMonth);
    if (!isRegional && escolaId) queryWater = queryWater.eq('escola_id', escolaId);
    const { data: waterData } = await queryWater;

    // 2. ZELADORIAS
    let queryZel = admin.from('zeladorias').select('*, escolas(nome)').neq('status', 'Arquivado');
    if (!isRegional && escolaId) queryZel = queryZel.eq('escola_id', escolaId);
    const { data: zeladorias } = await queryZel;

    // 3. FISCALIZAÇÕES
    let queryFisc = admin.from('fiscalizacoes_respostas').select('respondido, notificado, escola_id, escolas(nome), fiscalizacoes_eventos(data_referencia)');
    if (!isRegional && escolaId) queryFisc = queryFisc.eq('escola_id', escolaId);
    const { data: fiscalizacoes } = await queryFisc;

    // 4. NOTIFICAÇÕES
    const { data: notifs } = await admin.from('notificacoes_sistema').select('*').eq('usuario_id', userId).order('created_at', { ascending: false }).limit(20);

    return { 
        waterData: waterData || [], 
        zeladorias: zeladorias || [],
        fiscalizacoes: fiscalizacoes || [],
        notificacoes: notifs || [] 
    };
}

// ==========================================
//           OUTRAS FUNÇÕES (MANTIDAS)
// ==========================================

// USUÁRIOS
export async function createNewUser(data: any) {
  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get(name: string) { return cookieStore.get(name)?.value } } });
  const { data: authUser, error: authError } = await supabase.auth.signUp({ email: data.email, password: data.senha, options: { data: { nome: data.nome } } });
  if (authError) return { error: authError.message };
  const admin = await getSupabaseAdmin();
  const { error: dbError } = await admin.from('usuarios').insert({ id: authUser.user!.id, email: data.email, nome: data.nome, perfil: data.perfil, escola_id: data.escola_id || null });
  if (dbError) return { error: dbError.message };
  return { success: true };
}
export async function updateSystemUser(id: string, data: any) {
  const admin = await getSupabaseAdmin();
  const { error } = await admin.from('usuarios').update({ nome: data.nome, perfil: data.perfil, escola_id: data.escola_id || null }).eq('id', id);
  return error ? { error: error.message } : { success: true };
}
export async function deleteSystemUser(id: string) {
  const admin = await getSupabaseAdmin();
  await admin.from('usuarios').delete().eq('id', id);
  await admin.auth.admin.deleteUser(id);
  return { success: true };
}
export async function resetUserPassword(id: string, pass: string) {
  const admin = await getSupabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(id, { password: pass });
  return error ? { error: error.message } : { success: true };
}

// ESCOLAS
export async function createEscola(data: any) { const s = await getSupabaseAdmin(); const { error } = await s.from('escolas').insert(data); return { error: error?.message, success: !error }; }
export async function updateEscola(id: string, data: any) { const s = await getSupabaseAdmin(); const { error } = await s.from('escolas').update(data).eq('id', id); return { error: error?.message, success: !error }; }
export async function deleteEscola(id: string) { const s = await getSupabaseAdmin(); const { error } = await s.from('escolas').delete().eq('id', id); return { error: error?.message, success: !error }; }

// FISCAIS
export async function getFiscais() { const s = await getSupabaseAdmin(); const { data } = await s.from('fiscais').select('*').order('nome'); return data || []; }
export async function createFiscal(data: any) { const s = await getSupabaseAdmin(); const { error } = await s.from('fiscais').insert(data); return { error: error?.message, success: !error }; }
export async function deleteFiscal(id: string) { const s = await getSupabaseAdmin(); const { error } = await s.from('fiscais').delete().eq('id', id); return { error: error?.message, success: !error }; }

// ZELADORIA
export async function createZeladoria(data: any) { const s = await getSupabaseAdmin(); const { error } = await s.from('zeladorias').insert(data); return { error: error?.message, success: !error }; }
export async function updateZeladoriaEtapa(id: string, etapa: number) { const s = await getSupabaseAdmin(); const { error } = await s.from('zeladorias').update({ etapa_atual: etapa }).eq('id', id); return { error: error?.message, success: !error }; }
export async function updateZeladoriaData(id: string, data: any) { const s = await getSupabaseAdmin(); const { error } = await s.from('zeladorias').update(data).eq('id', id); return { error: error?.message, success: !error }; }
export async function arquivarZeladoria(id: string) { const s = await getSupabaseAdmin(); const { error } = await s.from('zeladorias').update({ status: 'Arquivado' }).eq('id', id); return { error: error?.message, success: !error }; }

// FISCALIZAÇÃO
export async function createFiscalizacaoEvent(data: any) { const s = await getSupabaseAdmin(); const { error } = await s.from('fiscalizacoes_eventos').insert(data); return { error: error?.message, success: !error }; }
export async function deleteFiscalizacaoEvent(id: string) { const s = await getSupabaseAdmin(); const { error } = await s.from('fiscalizacoes_eventos').delete().eq('id', id); return { error: error?.message, success: !error }; }
export async function toggleFiscalizacaoRespondido(id: string, val: boolean) { const s = await getSupabaseAdmin(); const { error } = await s.from('fiscalizacoes_respostas').update({ respondido: val }).eq('id', id); return { error: error?.message, success: !error }; }
export async function toggleFiscalizacaoNotificacao(id: string, val: boolean) { const s = await getSupabaseAdmin(); const { error } = await s.from('fiscalizacoes_respostas').update({ notificado: val }).eq('id', id); return { error: error?.message, success: !error }; }

// ÁGUA (OPERAÇÃO)
export async function getUltimaLeitura(escolaId: string, dataRef: string) { const s = await getSupabaseAdmin(); const { data } = await s.from('consumo_agua').select('leitura_atual, data_leitura').eq('escola_id', escolaId).lt('data_leitura', dataRef).order('data_leitura', { ascending: false }).limit(1).maybeSingle(); return data; }
export async function saveConsumoAgua(data: any) { 
    const cookieStore = await cookies(); 
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get(name: string) { return cookieStore.get(name)?.value } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Auth error' };
    
    const prev = await getUltimaLeitura(data.escola_id, data.data_leitura);
    let consumo = 0; let leituraAnt = 0;
    if (prev) { leituraAnt = Number(prev.leitura_atual); consumo = Number(data.leitura_atual) - leituraAnt; }
    
    // Salva usando Admin para garantir que nada bloqueie a escrita
    const admin = await getSupabaseAdmin();
    const payload = { ...data, consumo_dia: consumo, leitura_anterior: leituraAnt, registrado_por: user.id };
    
    if (data.id) { await admin.from('consumo_agua').update(payload).eq('id', data.id); }
    else { await admin.from('consumo_agua').insert(payload); }
    return { success: true };
}

// ENERGIA E NOTIFICAÇÃO
export async function reportarQuedaEnergia(data: any) { 
    const s = await getSupabaseAdmin(); 
    const cookieStore = await cookies(); 
    const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }); 
    const { data: { user } } = await client.auth.getUser(); 
    
    await s.from('notificacoes_energia').insert({ ...data, registrado_por: user?.id }); 
    
    // Notificar Admin
    if(!data.resolvido_antecipadamente){
        const { data: escola } = await s.from('escolas').select('nome').eq('id', data.escola_id).single();
        const { data: admins } = await s.from('usuarios').select('id').eq('perfil', 'Regional');
        if(admins) {
            const notifs = admins.map((adm:any) => ({
                usuario_id: adm.id,
                titulo: `⚡ Queda de Energia: ${escola?.nome}`,
                mensagem: `Relatado por ${user?.email}. Abrangência: ${data.abrangencia}`,
                lida: false
            }));
            await s.from('notificacoes_sistema').insert(notifs);
        }
    }

    const { data: escolaInfo } = await s.from('escolas').select('nome').eq('id', data.escola_id).single();
    return { success: true, dados_mensagem: { escola: escolaInfo?.nome || 'Escola', usuario: user?.email, data_hora: new Date().toLocaleString() } }; 
}

export async function marcarNotificacaoLida(id: string) { const s = await getSupabaseAdmin(); await s.from('notificacoes_sistema').update({ lida: true }).eq('id', id); return { success: true }; }

// HISTÓRICO ESPECÍFICO (Para tabelas de detalhe)
export async function getConsumoHistorico(escolaId?: string, mes?: string, ano?: string, apenasAlertas?: boolean) {
    const s = await getSupabaseAdmin();
    let q = s.from('consumo_agua').select('*, escolas(nome), usuarios(nome)').order('data_leitura', { ascending: false });
    if(escolaId) q = q.eq('escola_id', escolaId);
    if(apenasAlertas) q = q.eq('excedeu_limite', true);
    if(mes && ano) {
        const start = `${ano}-${mes.padStart(2,'0')}-01`;
        let nextMonth = Number(mes) + 1;
        let nextYear = Number(ano);
        if(nextMonth > 12) { nextMonth = 1; nextYear++; }
        const end = `${nextYear}-${String(nextMonth).padStart(2,'0')}-01`;
        q = q.gte('data_leitura', start).lt('data_leitura', end);
    }
    const { data } = await q;
    return data || [];
}