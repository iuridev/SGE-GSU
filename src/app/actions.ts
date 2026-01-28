'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// --- 1. CLIENTE PADRÃO (Para Usuários Operacionais) ---
// Respeita as regras de segurança (RLS) do banco.
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

// --- 2. CLIENTE SUPER ADMIN (Para Administradores Regionais) ---
// USA A CHAVE DE SERVIÇO. Ignora RLS. Vê tudo.
async function getSupabaseAdmin() {
  const cookieStore = await cookies();
  
  // Tenta pegar a chave mestra. Se não achar, avisa no log.
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!adminKey) {
      console.error("🚨 ERRO CRÍTICO: Chave SUPABASE_SERVICE_ROLE_KEY não encontrada no Vercel!");
      // Fallback para a chave anonima (vai falhar se o RLS estiver bloqueando)
      return getSupabaseClient();
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    adminKey, 
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
//    RELATÓRIO GERAL (ADMIN - VÊ TUDO)
// ==========================================
export async function getRelatorioConsumoGeral(dataInicio: string, dataFim: string) {
    try {
        // FORÇA O USO DO CLIENTE ADMIN
        const admin = await getSupabaseAdmin();
        
        const { data, error } = await admin
            .from('consumo_agua')
            .select(`*, escolas ( nome ), usuarios ( nome )`)
            .gte('data_leitura', dataInicio)
            .lte('data_leitura', dataFim)
            .order('data_leitura', { ascending: false });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ==========================================
//      DADOS DO DASHBOARD (HÍBRIDO)
// ==========================================
export async function getDadosDashboard(userId: string, escolaId: string | null, isRegional: boolean) {
    // AQUI ESTÁ O PULO DO GATO:
    // Se for Regional, usa o ADMIN (vê tudo). Se for Operacional, usa o CLIENT (vê o seu).
    const supabase = isRegional ? await getSupabaseAdmin() : await getSupabaseClient();
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    
    // 1. ÁGUA
    let queryWater = supabase.from('consumo_agua')
        .select('consumo_dia, excedeu_limite')
        .gte('data_leitura', startOfMonth)
        .lte('data_leitura', endOfMonth);

    // Se NÃO for admin, filtra pela escola dele. 
    // Se FOR admin, o client 'supabase' já é o Admin, então ele vê tudo sem filtro.
    if (!isRegional && escolaId) {
        queryWater = queryWater.eq('escola_id', escolaId);
    }
    const { data: waterData } = await queryWater;

    // 2. ZELADORIAS
    let queryZel = supabase.from('zeladorias').select('*, escolas(nome)').neq('status', 'Arquivado');
    if (!isRegional && escolaId) queryZel = queryZel.eq('escola_id', escolaId);
    const { data: zeladorias } = await queryZel;

    // 3. FISCALIZAÇÕES
    let queryFisc = supabase.from('fiscalizacoes_respostas').select('respondido, notificado, escola_id, escolas(nome)');
    if (!isRegional && escolaId) queryFisc = queryFisc.eq('escola_id', escolaId);
    const { data: fiscalizacoes } = await queryFisc;

    // 4. NOTIFICAÇÕES (Sempre busca com Admin para garantir leitura de sistema)
    const admin = await getSupabaseAdmin();
    const { data: notifs } = await admin
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
//           MÓDULO DE USUÁRIOS
// ==========================================

export async function createNewUser(data: any) {
  const supabase = await getSupabaseClient();
  const { data: authUser, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.senha,
    options: { data: { nome: data.nome } }
  });

  if (authError) return { error: authError.message };
  
  // Usa ADMIN para inserir na tabela usuarios (garante permissão)
  const admin = await getSupabaseAdmin();
  const { error: dbError } = await admin.from('usuarios').insert({
    id: authUser.user!.id,
    email: data.email,
    nome: data.nome,
    perfil: data.perfil,
    escola_id: data.escola_id || null
  });

  if (dbError) return { error: "Erro DB: " + dbError.message };
  return { success: true };
}

export async function updateSystemUser(id: string, data: any) {
  const admin = await getSupabaseAdmin();
  const { error } = await admin.from('usuarios').update({
    nome: data.nome,
    perfil: data.perfil,
    escola_id: data.escola_id || null
  }).eq('id', id);
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

// ==========================================
//           OUTRAS FUNÇÕES (ADMIN FORÇADO)
// ==========================================
// Para evitar problemas de permissão em outras partes, vamos usar o Admin
// nas funções de leitura de listas globais também.

export async function createEscola(data: any) { const s = await getSupabaseAdmin(); const { error } = await s.from('escolas').insert(data); return { success: !error, error: error?.message }; }
export async function updateEscola(id: string, data: any) { const s = await getSupabaseAdmin(); const { error } = await s.from('escolas').update(data).eq('id', id); return { success: !error, error: error?.message }; }
export async function deleteEscola(id: string) { const s = await getSupabaseAdmin(); const { error } = await s.from('escolas').delete().eq('id', id); return { success: !error, error: error?.message }; }

export async function getFiscais() { const s = await getSupabaseAdmin(); const { data } = await s.from('fiscais').select('*').order('nome'); return data || []; }
export async function createFiscal(data: any) { const s = await getSupabaseAdmin(); const { error } = await s.from('fiscais').insert(data); return { success: !error, error: error?.message }; }
export async function deleteFiscal(id: string) { const s = await getSupabaseAdmin(); const { error } = await s.from('fiscais').delete().eq('id', id); return { success: !error, error: error?.message }; }

// Zeladorias (Criação é Operacional, então usa Client Normal)
export async function createZeladoria(data: any) { const s = await getSupabaseClient(); const { error } = await s.from('zeladorias').insert(data); return { success: !error, error: error?.message }; }
export async function updateZeladoriaEtapa(id: string, etapa: number) { const s = await getSupabaseClient(); const { error } = await s.from('zeladorias').update({ etapa_atual: etapa }).eq('id', id); return { success: !error, error: error?.message }; }
export async function updateZeladoriaData(id: string, data: any) { const s = await getSupabaseClient(); const { error } = await s.from('zeladorias').update(data).eq('id', id); return { success: !error, error: error?.message }; }
export async function arquivarZeladoria(id: string) { const s = await getSupabaseClient(); const { error } = await s.from('zeladorias').update({ status: 'Arquivado' }).eq('id', id); return { success: !error, error: error?.message }; }

// Fiscalização
export async function createFiscalizacaoEvent(data: any) { const s = await getSupabaseClient(); const { error } = await s.from('fiscalizacoes_eventos').insert(data); return { success: !error, error: error?.message }; }
export async function deleteFiscalizacaoEvent(id: string) { const s = await getSupabaseClient(); const { error } = await s.from('fiscalizacoes_eventos').delete().eq('id', id); return { success: !error, error: error?.message }; }
export async function toggleFiscalizacaoRespondido(id: string, val: boolean) { const s = await getSupabaseClient(); const { error } = await s.from('fiscalizacoes_respostas').update({ respondido: val }).eq('id', id); return { success: !error, error: error?.message }; }
export async function toggleFiscalizacaoNotificacao(id: string, val: boolean) { const s = await getSupabaseClient(); const { error } = await s.from('fiscalizacoes_respostas').update({ notificado: val }).eq('id', id); return { success: !error, error: error?.message }; }

// ÁGUA
export async function getUltimaLeitura(escolaId: string, dataRef: string) { const s = await getSupabaseClient(); const { data } = await s.from('consumo_agua').select('leitura_atual, data_leitura').eq('escola_id', escolaId).lt('data_leitura', dataRef).order('data_leitura', { ascending: false }).limit(1).maybeSingle(); return data; }
export async function saveConsumoAgua(data: any) { 
    const s = await getSupabaseClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return { error: 'Auth error' };
    
    const prev = await getUltimaLeitura(data.escola_id, data.data_leitura);
    let consumo = 0; let leituraAnt = 0;
    if (prev) { leituraAnt = Number(prev.leitura_atual); consumo = Number(data.leitura_atual) - leituraAnt; }
    
    const payload = { ...data, consumo_dia: consumo, leitura_anterior: leituraAnt, registrado_por: user.id };
    
    if (data.id) { await s.from('consumo_agua').update(payload).eq('id', data.id); }
    else { await s.from('consumo_agua').insert(payload); }
    return { success: true };
}

// ENERGIA
export async function reportarQuedaEnergia(data: any) { 
    const s = await getSupabaseClient(); 
    const { data: { user } } = await s.auth.getUser(); 
    
    await s.from('notificacoes_energia').insert({ ...data, registrado_por: user?.id }); 
    
    if(!data.resolvido_antecipadamente){
        // Busca admins com permissão elevada para garantir que encontra
        const adminClient = await getSupabaseAdmin();
        const { data: admins } = await adminClient.from('usuarios').select('id').eq('perfil', 'Regional');
        const { data: escola } = await adminClient.from('escolas').select('nome').eq('id', data.escola_id).single();
        
        if(admins) {
            const notifs = admins.map((adm:any) => ({
                usuario_id: adm.id,
                titulo: `⚡ Queda de Energia: ${escola?.nome}`,
                mensagem: `Relatado por ${user?.email}. Abrangência: ${data.abrangencia}`,
                lida: false
            }));
            await adminClient.from('notificacoes_sistema').insert(notifs);
        }
    }
    // Para retornar dados para o zap, precisamos ler a escola
    const adminClient = await getSupabaseAdmin();
    const { data: escolaInfo } = await adminClient.from('escolas').select('nome').eq('id', data.escola_id).single();
    return { success: true, dados_mensagem: { escola: escolaInfo?.nome || 'Escola', usuario: user?.email, data_hora: new Date().toLocaleString() } }; 
}

export async function marcarNotificacaoLida(id: string) { 
    const s = await getSupabaseClient(); 
    await s.from('notificacoes_sistema').update({ lida: true }).eq('id', id); 
    return { success: true }; 
}

// HISTÓRICO ESPECÍFICO (Se for admin chama esse, se for operacional chama esse)
// Vamos aplicar a mesma logica do dashboard aqui
export async function getConsumoHistorico(escolaId?: string, mes?: string, ano?: string, apenasAlertas?: boolean) {
    const cookieStore = await cookies();
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get(name: string) { return cookieStore.get(name)?.value } } });
    
    const { data: { user } } = await supabase.auth.getUser();
    let client = supabase; // Padrão

    if (user) {
        // Verifica perfil. Se Regional, usa Admin.
        const { data: profile } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single();
        if (profile?.perfil === 'Regional') {
            client = await getSupabaseAdmin();
        }
    }

    let q = client.from('consumo_agua').select('*, escolas(nome), usuarios(nome)').order('data_leitura', { ascending: false });
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