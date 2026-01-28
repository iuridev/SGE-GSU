'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// --- HELPER: CLIENTE ADMIN ---
async function getSupabaseAdmin() {
  const cookieStore = await cookies();
  // Garante o uso da chave de serviço para furar bloqueios de RLS
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
//      NOVA FUNÇÃO: DADOS DO DASHBOARD
// ==========================================
// Resolve o problema de permissão buscando dados via Admin
export async function getDadosDashboard(userId: string, escolaId: string | null, isRegional: boolean) {
    const admin = await getSupabaseAdmin();
    
    // 1. DADOS DE ÁGUA (Mês Atual)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    
    let queryWater = admin.from('consumo_agua')
        .select('consumo_dia, excedeu_limite')
        .gte('data_leitura', startOfMonth)
        .lte('data_leitura', endOfMonth);

    // Se NÃO for Regional, filtra pela escola. Se for Regional, traz TUDO.
    if (!isRegional && escolaId) {
        queryWater = queryWater.eq('escola_id', escolaId);
    }
    
    const { data: waterData } = await queryWater;

    // 2. NOTIFICAÇÕES (Do usuário logado)
    const { data: notifs } = await admin
        .from('notificacoes_sistema')
        .select('*')
        .eq('usuario_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

    return { 
        waterData: waterData || [], 
        notificacoes: notifs || [] 
    };
}

// ==========================================
//           MÓDULO DE USUÁRIOS
// ==========================================

export async function createNewUser(data: any) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );

  const { data: authUser, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.senha,
    options: { data: { nome: data.nome } }
  });

  if (authError) return { error: authError.message };
  if (!authUser.user) return { error: "Erro ao criar usuário de autenticação." };

  const adminClient = await getSupabaseAdmin();
  const { error: dbError } = await adminClient.from('usuarios').insert({
    id: authUser.user.id,
    email: data.email,
    nome: data.nome,
    perfil: data.perfil,
    escola_id: data.escola_id || null
  });

  if (dbError) return { error: "Erro ao salvar dados do perfil: " + dbError.message };
  return { success: true };
}

export async function updateSystemUser(id: string, data: any) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );

  const { error } = await supabase.from('usuarios').update({
    nome: data.nome,
    perfil: data.perfil,
    escola_id: data.escola_id || null
  }).eq('id', id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteSystemUser(id: string) {
  const supabase = await getSupabaseAdmin(); 
  const { error: dbError } = await supabase.from('usuarios').delete().eq('id', id);
  if (dbError) return { error: dbError.message };
  
  const { error: authError } = await supabase.auth.admin.deleteUser(id);
  if (authError) return { error: authError.message };

  return { success: true };
}

export async function resetUserPassword(id: string, newPassword: string) {
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase.auth.admin.updateUserById(id, { password: newPassword });
  if (error) return { error: error.message };
  return { success: true };
}

// ==========================================
//           MÓDULO DE ESCOLAS
// ==========================================

export async function createEscola(data: any) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );

  const { error } = await supabase.from('escolas').insert(data);
  if (error) return { error: error.message };
  return { success: true };
}

export async function updateEscola(id: string, data: any) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );

  const { error } = await supabase.from('escolas').update(data).eq('id', id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteEscola(id: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );

  const { error } = await supabase.from('escolas').delete().eq('id', id);
  if (error) return { error: error.message };
  return { success: true };
}

// ==========================================
//           MÓDULO DE FISCAIS
// ==========================================

export async function getFiscais() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );
  
  const { data, error } = await supabase.from('fiscais').select('*').order('nome');
  if (error) return [];
  return data;
}

export async function createFiscal(data: any) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );

  const { error } = await supabase.from('fiscais').insert(data);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteFiscal(id: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );

  const { error } = await supabase.from('fiscais').delete().eq('id', id);
  if (error) return { error: error.message };
  return { success: true };
}

// ==========================================
//           MÓDULO DE ZELADORIAS
// ==========================================

export async function createZeladoria(data: any) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );

  const { error } = await supabase.from('zeladorias').insert(data);
  if (error) return { error: error.message };
  return { success: true };
}

export async function updateZeladoriaEtapa(id: string, etapa: number) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );

  const { error } = await supabase.from('zeladorias').update({ etapa_atual: etapa }).eq('id', id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function updateZeladoriaData(id: string, data: any) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );

  const { error } = await supabase.from('zeladorias').update(data).eq('id', id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function arquivarZeladoria(id: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );

  const { error } = await supabase.from('zeladorias').update({ status: 'Arquivado' }).eq('id', id);
  if (error) return { error: error.message };
  return { success: true };
}

// ==========================================
//           MÓDULO DE FISCALIZAÇÕES
// ==========================================

export async function createFiscalizacaoEvent(data: any) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );

  const { error } = await supabase.from('fiscalizacoes_eventos').insert(data);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteFiscalizacaoEvent(id: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );

  const { error } = await supabase.from('fiscalizacoes_eventos').delete().eq('id', id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function toggleFiscalizacaoRespondido(id: string, status: boolean) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );

  const { error } = await supabase.from('fiscalizacoes_respostas').update({ respondido: status }).eq('id', id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function toggleFiscalizacaoNotificacao(id: string, status: boolean) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );

  const { error } = await supabase.from('fiscalizacoes_respostas').update({ notificado: status }).eq('id', id);
  if (error) return { error: error.message };
  return { success: true };
}

// ==========================================
//           MÓDULO CONSUMO DE ÁGUA
// ==========================================

export async function getUltimaLeitura(escolaId: string, dataReferencia: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );
  
  const { data } = await supabase
    .from('consumo_agua')
    .select('leitura_atual, data_leitura')
    .eq('escola_id', escolaId)
    .lt('data_leitura', dataReferencia)
    .order('data_leitura', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function saveConsumoAgua(data: any) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  try {
    const registroAnterior = await getUltimaLeitura(data.escola_id, data.data_leitura);
    
    let leituraAnterior = 0;
    let consumo = 0;
    let isPrimeiroDoMes = false;

    const mesAtual = data.data_leitura.substring(0, 7);
    const mesAnterior = registroAnterior?.data_leitura?.substring(0, 7);

    if (registroAnterior && mesAtual === mesAnterior) {
        leituraAnterior = Number(registroAnterior.leitura_atual);
        consumo = Number(data.leitura_atual) - leituraAnterior;
        if (consumo < 0) return { error: `Erro: Leitura atual menor que a anterior.` };
    } else {
        leituraAnterior = Number(data.leitura_atual);
        consumo = 0;
        isPrimeiroDoMes = true;
    }

    const limite = Number(data.populacao) * 0.008;
    const excedeu = !isPrimeiroDoMes && (consumo > limite);

    if (excedeu) {
        if (!data.justificativa || data.justificativa.length < 5) return { error: 'Justificativa é obrigatória.' };
        if (!data.acao_corretiva || data.acao_corretiva.length < 5) return { error: 'Ação corretiva é obrigatória.' };
    }

    const payload = {
        escola_id: data.escola_id,
        registrado_por: user.id,
        data_leitura: data.data_leitura,
        leitura_atual: data.leitura_atual,
        leitura_anterior: leituraAnterior,
        consumo_dia: consumo,
        populacao: data.populacao,
        limite_calculado: limite,
        excedeu_limite: excedeu,
        justificativa: excedeu ? data.justificativa : null,
        acao_corretiva: excedeu ? data.acao_corretiva : null
    };

    if (data.id) {
        const { error } = await supabase.from('consumo_agua').update(payload).eq('id', data.id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('consumo_agua').insert(payload);
        if (error) {
             if (error.code === '23505') return { error: 'Já existe um registro para esta data.' };
             throw error;
        }
    }
    return { success: true };
  } catch (error: any) { return { error: error.message }; }
}

export async function getConsumoHistorico(escolaId?: string, mes?: string, ano?: string, apenasAlertas: boolean = false) {
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
    );
    
    const { data: { user } } = await authClient.auth.getUser();
    let supabaseClient = authClient;

    if (user) {
        const { data: profile } = await authClient.from('usuarios').select('perfil').eq('id', user.id).single();
        if (profile?.perfil === 'Regional') {
            supabaseClient = await getSupabaseAdmin();
        }
    }

    let query = supabaseClient.from('consumo_agua').select('*, escolas(nome), usuarios(nome)').order('data_leitura', { ascending: false });

    if (escolaId) query = query.eq('escola_id', escolaId);
    if (apenasAlertas) query = query.eq('excedeu_limite', true);
    if (mes && ano) {
        const startDate = `${ano}-${mes.padStart(2, '0')}-01`;
        const nextMonth = Number(mes) === 12 ? 1 : Number(mes) + 1;
        const nextYear = Number(mes) === 12 ? Number(ano) + 1 : Number(ano);
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
        query = query.gte('data_leitura', startDate).lt('data_leitura', endDate);
    }

    const { data, error } = await query;
    if (error) console.error("Erro histórico:", error);
    return data || [];
}

// ==========================================
//        MÓDULO NOTIFICAÇÃO ENERGIA
// ==========================================

export async function reportarQuedaEnergia(data: any) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  try {
    const { error } = await supabase.from('notificacoes_energia').insert({
        escola_id: data.escola_id,
        registrado_por: user.id,
        abrangencia: data.abrangencia,
        verificou_disjuntor: data.verificou_disjuntor,
        verificou_sobrecarga: data.verificou_sobrecarga,
        descricao: data.descricao,
        resolvido_antecipadamente: data.resolvido_antecipadamente
    });

    if (error) throw error;

    const { data: escola } = await supabase.from('escolas').select('nome').eq('id', data.escola_id).single();
    const { data: usuario } = await supabase.from('usuarios').select('nome').eq('id', user.id).single();

    const dataHoraBrasilia = new Date().toLocaleString('pt-BR', { 
        timeZone: 'America/Sao_Paulo',
        dateStyle: 'short',
        timeStyle: 'medium'
    });

    // Notificar Admins
    if (!data.resolvido_antecipadamente) {
        const adminClient = await getSupabaseAdmin();

        const { data: admins, error: adminErr } = await adminClient
            .from('usuarios')
            .select('id')
            .eq('perfil', 'Regional');

        if (admins && admins.length > 0) {
            const notificacoes = admins.map(admin => ({
                usuario_id: admin.id,
                titulo: `⚡ Queda de Energia: ${escola?.nome}`,
                mensagem: `Relatado por ${usuario?.nome} em ${dataHoraBrasilia}. Abrangência: ${data.abrangencia}.`,
                lida: false
            }));

            const { error: notifErr } = await adminClient.from('notificacoes_sistema').insert(notificacoes);
            if (notifErr) console.error("Erro ao inserir notificação interna:", notifErr);
        }
    }

    return { 
        success: true, 
        dados_mensagem: {
            escola: escola?.nome,
            usuario: usuario?.nome,
            data_hora: dataHoraBrasilia
        }
    };

  } catch (error: any) { 
      return { error: error.message }; 
  }
}

export async function marcarNotificacaoLida(id: string) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
    );
    
    await supabase.from('notificacoes_sistema').update({ lida: true }).eq('id', id);
    return { success: true };
}