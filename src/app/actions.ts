'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// --- HELPER: CLIENTE ADMIN ---
// Usa a biblioteca @supabase/ssr que já está instalada, mas com a chave de serviço
async function getSupabaseAdmin() {
  const cookieStore = await cookies();
  
  // Tenta pegar a chave de serviço (Service Role) ou usa a anônima
  // No Vercel, certifique-se de configurar SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    adminKey!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any) { }, // Admin não precisa salvar cookies
        remove(name: string, options: any) { },
      },
    }
  );
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

  // 1. Criar Auth User
  const { data: authUser, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.senha,
    options: { data: { nome: data.nome } }
  });

  if (authError) return { error: authError.message };
  if (!authUser.user) return { error: "Erro ao criar usuário de autenticação." };

  // 2. Criar Registro na Tabela 'usuarios'
  const adminClient = await getSupabaseAdmin();
  
  const { error: dbError } = await adminClient.from('usuarios').insert({
    id: authUser.user.id,
    email: data.email,
    nome: data.nome,
    perfil: data.perfil,
    escola_id: data.escola_id || null
  });

  if (dbError) {
    return { error: "Erro ao salvar dados do perfil: " + dbError.message };
  }

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
  
  // 1. Remover da tabela usuarios
  const { error: dbError } = await supabase.from('usuarios').delete().eq('id', id);
  if (dbError) return { error: dbError.message };

  // 2. Remover do Auth
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
    // 1. Salvar na Tabela de Energia
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

    // 2. DISPARAR NOTIFICAÇÃO PARA ADMINS (SISTEMA)
    if (!data.resolvido_antecipadamente) {
        // Usar o cliente Admin criado via @supabase/ssr
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