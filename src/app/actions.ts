'use server'

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// --- FUNÇÃO AUXILIAR DE ADMINISTRAÇÃO ---
function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Erro de Configuração: Chave de Admin (Service Role) não encontrada no Vercel.");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// --- CHECAGEM DE PERMISSÃO (Reutilizável) ---
async function checkAdminPermission() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { allowed: false, error: 'Não autenticado.' }
  
  const { data: userProfile } = await supabase.from('usuarios').select('perfil').eq('email', user.email).single()
  if (userProfile?.perfil !== 'Regional') return { allowed: false, error: 'Acesso negado.' }

  return { allowed: true, user }
}

// ==========================================
//              AÇÕES DE ESCOLA (ATUALIZADO)
// ==========================================

export async function createEscola(data: any) {
  const perm = await checkAdminPermission();
  if (!perm.allowed) return { error: perm.error };

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from('escolas').insert({
      nome: data.nome,
      cidade: data.cidade,
      estado: data.estado,
      email: data.email,
      telefone: data.telefone,
      diretor: data.diretor,
      polo: data.polo,
      fiscal_id: data.fiscal_id || null // Agora salvamos o ID
    });

    if (error) throw error;
    return { success: true };
  } catch (error: any) { return { error: error.message }; }
}

export async function updateEscola(id: string, data: any) {
  const perm = await checkAdminPermission();
  if (!perm.allowed) return { error: perm.error };

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from('escolas').update({
      nome: data.nome,
      cidade: data.cidade,
      estado: data.estado,
      email: data.email,
      telefone: data.telefone,
      diretor: data.diretor,
      polo: data.polo,
      fiscal_id: data.fiscal_id || null // Atualiza o ID
    }).eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) { return { error: error.message }; }
}

// ==========================================
//              AÇÕES DE USUÁRIO
// ==========================================

export async function createNewUser(formData: any) {
  const perm = await checkAdminPermission();
  if (!perm.allowed) return { error: perm.error };

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: formData.email,
      password: formData.senha,
      email_confirm: true,
      user_metadata: { nome: formData.nome }
    })
    if (authError) return { error: authError.message }

    // 2. Banco
    const { error: dbError } = await supabaseAdmin.from('usuarios').insert({
      id: authData.user!.id,
      nome: formData.nome,
      email: formData.email,
      perfil: formData.perfil,
      escola_id: formData.escola_id || null
    })

    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user!.id)
      return { error: dbError.message }
    }
    return { success: true }
  } catch (error: any) { return { error: error.message } }
}

export async function updateSystemUser(userId: string, data: any) {
  const perm = await checkAdminPermission();
  if (!perm.allowed) return { error: perm.error };

  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: data.email,
      user_metadata: { nome: data.nome }
    });
    if (authError) return { error: 'Erro Auth: ' + authError.message };

    const { error: dbError } = await supabaseAdmin.from('usuarios').update({
      nome: data.nome,
      email: data.email,
      perfil: data.perfil,
      escola_id: data.escola_id || null
    }).eq('id', userId);

    if (dbError) return { error: 'Erro Banco: ' + dbError.message };

    return { success: true };
  } catch (error: any) { return { error: error.message }; }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const perm = await checkAdminPermission();
  if (!perm.allowed) return { error: perm.error };

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (error) throw error;
    return { success: true };
  } catch (error: any) { return { error: error.message }; }
}

export async function deleteSystemUser(userId: string) {
  const perm = await checkAdminPermission();
  if (!perm.allowed) return { error: perm.error };

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authError) return { error: authError.message }

    const { error: dbError } = await supabaseAdmin.from('usuarios').delete().eq('id', userId)
    if (dbError) return { error: dbError.message }
    return { success: true }
  } catch (error: any) { return { error: error.message } }
}

// ==========================================
//              AÇÕES DE ZELADORIA
// ==========================================

export async function createZeladoria(data: { 
  escola_id: string; 
  nome_zelador: string; 
  cpf_zelador: string;
  numero_sei: string;
  cargo_zelador: string;
  data_inicio: string;
  isento_pagamento: boolean;
}) {
  const perm = await checkAdminPermission();
  if (!perm.allowed) return { error: perm.error };

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from('zeladorias').insert({
      escola_id: data.escola_id,
      nome_zelador: data.nome_zelador,
      cpf_zelador: data.cpf_zelador,
      numero_sei: data.numero_sei,
      cargo_zelador: data.cargo_zelador,
      data_inicio: data.data_inicio,
      isento_pagamento: data.isento_pagamento,
      etapa_atual: 1,
      data_etapa_1: new Date().toISOString()
    });

    if (error) throw error;
    return { success: true };
  } catch (error: any) { return { error: error.message }; }
}

export async function updateZeladoriaEtapa(id: string, novaEtapa: number) {
  const perm = await checkAdminPermission();
  if (!perm.allowed) return { error: perm.error };

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const campoData = `data_etapa_${novaEtapa}`;
    const updateData: any = { 
      etapa_atual: novaEtapa,
      [campoData]: new Date().toISOString()
    };
    const { error } = await supabaseAdmin.from('zeladorias').update(updateData).eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) { return { error: error.message }; }
}

// --- NOVA FUNÇÃO: EXCLUIR ESCOLA ---
export async function deleteEscola(id: string) {
  const perm = await checkAdminPermission();
  if (!perm.allowed) return { error: perm.error };

  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // Tenta excluir. Se houver dependências sem CASCADE (ex: usuários vinculados), o banco retornará erro.
    const { error } = await supabaseAdmin.from('escolas').delete().eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) { 
    // Trata erro comum de chave estrangeira para mensagem mais amigável
    if (error.code === '23503') {
        return { error: 'Não é possível excluir esta escola pois ela possui vínculos (usuários, processos, etc). Remova os vínculos antes.' };
    }
    return { error: error.message }; 
  }
}

export async function updateZeladoriaData(id: string, data: {
  escola_id: string; 
  nome_zelador: string; 
  cpf_zelador: string;
  numero_sei: string;
  cargo_zelador: string;
  data_inicio: string;
  isento_pagamento: boolean;
}) {
  const perm = await checkAdminPermission();
  if (!perm.allowed) return { error: perm.error };

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from('zeladorias').update({
      escola_id: data.escola_id,
      nome_zelador: data.nome_zelador,
      cpf_zelador: data.cpf_zelador,
      numero_sei: data.numero_sei,
      cargo_zelador: data.cargo_zelador,
      data_inicio: data.data_inicio,
      isento_pagamento: data.isento_pagamento
    }).eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) { return { error: error.message }; }
}

export async function arquivarZeladoria(id: string) {
  const perm = await checkAdminPermission();
  if (!perm.allowed) return { error: perm.error };

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from('zeladorias').update({ status: 'Arquivado' }).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: any) { return { error: error.message }; }
}

// ==========================================
//           MÓDULO FISCALIZAÇÃO
// ==========================================

// 1. Criar Nova Data de Fiscalização
export async function createFiscalizacaoEvent(dataReferencia: string) {
  const perm = await checkAdminPermission();
  if (!perm.allowed) return { error: perm.error };

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Cria o Evento (A Data)
    const { data: evento, error: errEvento } = await supabaseAdmin
      .from('fiscalizacoes_eventos')
      .insert({ data_referencia: dataReferencia })
      .select()
      .single();

    if (errEvento) throw errEvento;

    // 2. Pega todas as escolas cadastradas
    const { data: escolas } = await supabaseAdmin.from('escolas').select('id');
    
    if (escolas && escolas.length > 0) {
      // 3. Gera a lista de presença para todas as escolas
      const inserts = escolas.map(escola => ({
        evento_id: evento.id,
        escola_id: escola.id,
        respondido: false,
        notificado: false
      }));
      
      const { error: errInserts } = await supabaseAdmin.from('fiscalizacoes_respostas').insert(inserts);
      if (errInserts) throw errInserts;
    }

    return { success: true };
  } catch (error: any) { return { error: error.message }; }
}

// 2. Marcar como Respondido (Check)
export async function toggleFiscalizacaoRespondido(respostaId: string, statusAtual: boolean) {
  const perm = await checkAdminPermission();
  if (!perm.allowed) return { error: perm.error };

  try {
    const supabaseAdmin = getSupabaseAdmin();
    // Se marcou como respondido, removemos a notificação automaticamente
    const updateData = statusAtual ? { respondido: false } : { respondido: true, notificado: false };
    
    const { error } = await supabaseAdmin.from('fiscalizacoes_respostas').update(updateData).eq('id', respostaId);
    if (error) throw error;
    return { success: true };
  } catch (error: any) { return { error: error.message }; }
}

// 3. Enviar Notificação (Cobrança)
export async function toggleFiscalizacaoNotificacao(respostaId: string, statusAtual: boolean) {
  const perm = await checkAdminPermission();
  if (!perm.allowed) return { error: perm.error };

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from('fiscalizacoes_respostas').update({ notificado: !statusAtual }).eq('id', respostaId);
    if (error) throw error;
    return { success: true };
  } catch (error: any) { return { error: error.message }; }
}

// 4. Excluir Evento (Caso erre a data)
export async function deleteFiscalizacaoEvent(id: string) {
  const perm = await checkAdminPermission();
  if (!perm.allowed) return { error: perm.error };

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from('fiscalizacoes_eventos').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: any) { return { error: error.message }; }
}



// ==========================================
//              AÇÕES DE FISCAIS (NOVO)
// ==========================================

export async function getFiscais() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return undefined } } } // Leitura pública simplificada ou use cookies
  )
  
  const { data, error } = await supabase.from('fiscais').select('*').order('nome');
  if (error) return [];
  return data;
}

export async function createFiscal(data: any) {
  const perm = await checkAdminPermission();
  if (!perm.allowed) return { error: perm.error };

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from('fiscais').insert(data);
    if (error) throw error;
    return { success: true };
  } catch (error: any) { return { error: error.message }; }
}

export async function deleteFiscal(id: string) {
  const perm = await checkAdminPermission();
  if (!perm.allowed) return { error: perm.error };

  try {
    const supabaseAdmin = getSupabaseAdmin();
    // Verifica se tem escola vinculada antes de apagar
    const { count } = await supabaseAdmin.from('escolas').select('*', { count: 'exact', head: true }).eq('fiscal_id', id);
    if (count && count > 0) return { error: 'Não é possível excluir: Este fiscal está vinculado a escolas.' };

    const { error } = await supabaseAdmin.from('fiscais').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: any) { return { error: error.message }; }
}

