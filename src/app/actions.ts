'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// --- 1. CLIENTE PADRÃO (Para Dados e Dashboard) ---
// Usa a sessão do usuário (Cookies). O Banco de Dados (RLS) decide quem vê o quê.
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

// --- 2. CLIENTE ADMIN (Para Gestão de Usuários/Auth) ---
// Usado APENAS para criar/deletar logins no Supabase Auth.
// Requer SUPABASE_SERVICE_ROLE_KEY no Vercel para funcionar plenamente.
async function getSupabaseAuthAdmin() {
  const cookieStore = await cookies();
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
        const supabase = await getSupabaseClient();
        
        // Graças à política RLS criada no SQL ("is_regional"), o Admin verá tudo aqui.
        const { data, error } = await supabase
            .from('consumo_agua')
            .select(`
                *,
                escolas ( nome ),
                usuarios ( nome )
            `)
            .gte('data_leitura', dataInicio)
            .lte('data_leitura', dataFim)
            .order('data_leitura', { ascending: false });

        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error("Erro relatorio:", error.message);
        return { success: false, error: error.message };
    }
}

// ==========================================
//      DADOS DO DASHBOARD (CENTRALIZADO)
// ==========================================
export async function getDadosDashboard(userId: string, escolaId: string | null, isRegional: boolean) {
    const supabase = await getSupabaseClient();
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    
    // 1. ÁGUA
    // Se for Regional, o RLS permite ver tudo, então o filtro de escolaId é opcional/removido.
    let queryWater = supabase.from('consumo_agua')
        .select('consumo_dia, excedeu_limite')
        .gte('data_leitura', startOfMonth)
        .lte('data_leitura', endOfMonth);

    if (!isRegional && escolaId) {
        queryWater = queryWater.eq('escola_id', escolaId);
    }
    const { data: waterData } = await queryWater;

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
//           MÓDULO DE USUÁRIOS
// ==========================================

export async function createNewUser(data: any) {
  const supabase = await getSupabaseClient(); // Para criar Auth, usamos client normal (se permitido) ou Admin
  const { data: authUser, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.senha,
    options: { data: { nome: data.nome } }
  });

  if (authError) return { error: authError.message };
  if (!authUser.user) return { error: "Erro ao criar usuário de autenticação." };

  // Para inserir na tabela 'usuarios', usamos o AuthAdmin se RLS bloquear insert de terceiros
  const admin = await getSupabaseAuthAdmin();
  const { error: dbError } = await admin.from('usuarios').insert({
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
  const admin = await getSupabaseAuthAdmin();
  const { error } = await admin.from('usuarios').update({
    nome: data.nome,
    perfil: data.perfil,
    escola_id: data.escola_id || null
  }).eq('id', id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteSystemUser(id: string) {
  const admin = await getSupabaseAuthAdmin();
  
  // Remove da tabela
  const { error: dbError } = await admin.from('usuarios').delete().eq('id', id);
  if (dbError) return { error: dbError.message };
  
  // Remove do Auth
  const { error: authError } = await admin.auth.admin.deleteUser(id);
  if (authError) return { error: authError.message };

  return { success: true };
}

export async function resetUserPassword(id: string, newPassword: string) {
  const admin = await getSupabaseAuthAdmin();
  const { error } = await admin.auth.admin.updateUserById(id, { password: newPassword });
  if (error) return { error: error.message };
  return { success: true };
}

// ==========================================
//           MÓDULO DE ESCOLAS
// ==========================================

export async function createEscola(data: any) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('escolas').insert(data);
  return { success: !error, error: error?.message };
}

export async function updateEscola(id: string, data: any) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('escolas').update(data).eq('id', id);
  return { success: !error, error: error?.message };
}

export async function deleteEscola(id: string) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('escolas').delete().eq('id', id);
  return { success: !error, error: error?.message };
}

// ==========================================
//           MÓDULO DE FISCAIS
// ==========================================

export async function getFiscais() {
  const supabase = await getSupabaseClient();
  const { data } = await supabase.from('fiscais').select('*').order('nome');
  return data || [];
}

export async function createFiscal(data: any) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('fiscais').insert(data);
  return { success: !error, error: error?.message };
}

export async function deleteFiscal(id: string) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('fiscais').delete().eq('id', id);
  return { success: !error, error: error?.message };
}

// ==========================================
//           MÓDULO DE ZELADORIAS
// ==========================================

export async function createZeladoria(data: any) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('zeladorias').insert(data);
  return { success: !error, error: error?.message };
}

export async function updateZeladoriaEtapa(id: string, etapa: number) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('zeladorias').update({ etapa_atual: etapa }).eq('id', id);
  return { success: !error, error: error?.message };
}

export async function updateZeladoriaData(id: string, data: any) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('zeladorias').update(data).eq('id', id);
  return { success: !error, error: error?.message };
}

export async function arquivarZeladoria(id: string) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('zeladorias').update({ status: 'Arquivado' }).eq('id', id);
  return { success: !error, error: error?.message };
}

// ==========================================
//           MÓDULO DE FISCALIZAÇÕES
// ==========================================

export async function createFiscalizacaoEvent(data: any) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('fiscalizacoes_eventos').insert(data);
  return { success: !error, error: error?.message };
}

export async function deleteFiscalizacaoEvent(id: string) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('fiscalizacoes_eventos').delete().eq('id', id);
  return { success: !error, error: error?.message };
}

export async function toggleFiscalizacaoRespondido(id: string, status: boolean) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('fiscalizacoes_respostas').update({ respondido: status }).eq('id', id);
  return { success: !error, error: error?.message };
}

export async function toggleFiscalizacaoNotificacao(id: string, status: boolean) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('fiscalizacoes_respostas').update({ notificado: status }).eq('id', id);
  return { success: !error, error: error?.message };
}

// ==========================================
//           MÓDULO CONSUMO DE ÁGUA
// ==========================================

export async function getUltimaLeitura(escolaId: string, dataReferencia: string) {
  const supabase = await getSupabaseClient();
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
  const supabase = await getSupabaseClient();
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
    const supabase = await getSupabaseClient();
    
    let query = supabase.from('consumo_agua')
        .select('*, escolas(nome), usuarios(nome)')
        .order('data_leitura', { ascending: false });

    if (escolaId) query = query.eq('escola_id', escolaId);
    if (apenasAlertas) query = query.eq('excedeu_limite', true);
    
    if (mes && ano) {
        const startDate = `${ano}-${mes.padStart(2, '0')}-01`;
        let nextMonth = Number(mes) + 1;
        let nextYear = Number(ano);
        if (nextMonth > 12) { nextMonth = 1; nextYear = nextYear + 1; }
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
  const supabase = await getSupabaseClient();
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

    // Notificar Admins (Agora usando client padrão + RLS)
    if (!data.resolvido_antecipadamente) {
        const { data: admins } = await supabase
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

            await supabase.from('notificacoes_sistema').insert(notificacoes);
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
    const supabase = await getSupabaseClient();
    await supabase.from('notificacoes_sistema').update({ lida: true }).eq('id', id);
    return { success: true };
}