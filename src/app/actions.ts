'use server'

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// --- FUNÇÃO AUXILIAR DE ADMINISTRAÇÃO ---
// Garante que a chave secreta existe antes de tentar usar
function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    console.error(">>> ERRO CRÍTICO: SUPABASE_SERVICE_ROLE_KEY não encontrada nas variáveis de ambiente.");
    throw new Error("Erro de Configuração: Chave de Admin (Service Role) não encontrada no Vercel.");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// --- CRIAR ESCOLA (ATUALIZADO: POLO INTEIRO) ---
export async function createEscola(data: { 
  nome: string; 
  cidade: string; 
  estado: string;
  email: string;
  telefone: string;
  diretor: string;
  polo: number; // <--- Agora tipado como number
}) {
  const cookieStore = await cookies()
  
  // 1. Verificação de Segurança (Quem está logado?)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Usuário não autenticado.' }
  
  const { data: userProfile } = await supabase.from('usuarios').select('perfil').eq('email', user.email).single()
  
  // Apenas 'Regional' (Admin) pode criar escolas
  if (userProfile?.perfil !== 'Regional') {
    return { error: 'Acesso negado. Apenas Administradores podem criar escolas.' }
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // 2. Inserção no Banco
    const { error } = await supabaseAdmin.from('escolas').insert({
      nome: data.nome,
      cidade: data.cidade,
      estado: data.estado,
      email: data.email,
      telefone: data.telefone,
      diretor: data.diretor,
      polo: data.polo // Envia como número (int4 no banco)
    });
    
    if (error) throw error;
    return { success: true };

  } catch (error: any) {
    console.error("Erro ao criar escola:", error);
    return { error: 'Erro ao criar escola: ' + error.message };
  }
}

// --- CRIAR USUÁRIO (COM VÍNCULO DE ESCOLA) ---
export async function createNewUser(formData: any) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Usuário não autenticado.' }

  const { data: userProfile } = await supabase.from('usuarios').select('perfil').eq('email', user.email).single()

  if (userProfile?.perfil !== 'Regional') {
    return { error: 'Permissão negada. Apenas Admins podem criar usuários.' }
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Cria usuário no Auth (Login)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: formData.email,
      password: formData.senha,
      email_confirm: true, // Já confirma o email automaticamente
      user_metadata: { nome: formData.nome }
    })

    if (authError) return { error: authError.message }
    if (!authData.user) return { error: 'Erro ao gerar ID de autenticação.' }

    // 2. Salva dados na tabela pública (vinculando escola se houver)
    const { error: dbError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: authData.user.id,
        nome: formData.nome,
        email: formData.email,
        perfil: formData.perfil,
        escola_id: formData.escola_id || null // Salva o ID da escola ou null
      })

    if (dbError) {
      // Se der erro no banco, remove do Auth para não deixar "lixo"
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return { error: 'Erro ao salvar dados no banco: ' + dbError.message }
    }

    return { success: true }

  } catch (error: any) {
    return { error: error.message }
  }
}

// --- EXCLUIR USUÁRIO ---
export async function deleteSystemUser(userId: string) {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Usuário não autenticado.' }

  const { data: userProfile } = await supabase.from('usuarios').select('perfil').eq('email', user.email).single()

  if (userProfile?.perfil !== 'Regional') {
    return { error: 'Apenas Administradores podem excluir usuários.' }
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Remove acesso (Auth)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (authError) {
      console.error("Erro Auth:", authError)
      return { error: 'Erro ao bloquear acesso: ' + authError.message }
    }

    // 2. Remove dados (Banco)
    const { error: dbError } = await supabaseAdmin
      .from('usuarios')
      .delete()
      .eq('id', userId)

    if (dbError) {
      console.error("Erro Banco:", dbError)
      return { error: 'Acesso removido, mas erro ao limpar dados: ' + dbError.message }
    }

    return { success: true }

  } catch (error: any) {
    return { error: error.message }
  }
}