'use server'

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// --- FUNÇÃO AUXILIAR PARA PEGAR O ADMIN ---
// Isso evita repetir código e garante que a chave existe antes de usar
function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    console.error("ERRO CRÍTICO: SUPABASE_SERVICE_ROLE_KEY não encontrada.");
    throw new Error("Erro de Configuração: Chave de Admin (Service Role) não configurada no Vercel.");
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

export async function createNewUser(formData: any) {
  const cookieStore = await cookies()

  // 1. Verificação de Admin (Segurança do Frontend)
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
    // 2. Tenta obter o cliente Admin (Se falhar a chave, o erro estoura aqui e cai no catch)
    const supabaseAdmin = getSupabaseAdmin();

    // 3. Cria no Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: formData.email,
      password: formData.senha,
      email_confirm: true,
      user_metadata: { nome: formData.nome }
    })

    if (authError) return { error: authError.message }
    if (!authData.user) return { error: 'Erro ao gerar ID.' }

    // 4. Cria no Banco
    const { error: dbError } = await supabaseAdmin.from('usuarios').insert({
      id: authData.user.id,
      nome: formData.nome,
      email: formData.email,
      perfil: formData.perfil
    })

    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return { error: 'Erro ao salvar no banco: ' + dbError.message }
    }

    return { success: true }

  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteSystemUser(userId: string) {
  const cookieStore = await cookies()
  
  // 1. Verificação de Admin
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

    // 2. Primeiro tenta deletar do Auth (O mais importante para segurança)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (authError) {
      console.error("Erro Auth:", authError)
      return { error: 'Erro ao bloquear acesso: ' + authError.message }
    }

    // 3. Depois deleta da tabela (Para limpar a lista)
    const { error: dbError } = await supabaseAdmin
      .from('usuarios')
      .delete()
      .eq('id', userId)

    if (dbError) {
      // É AQUI QUE O ERRO DE FOREIGN KEY VAI APARECER
      console.error("Erro Banco:", dbError)
      return { error: 'Acesso removido, mas erro ao apagar dados: ' + dbError.message }
    }

    return { success: true }

  } catch (error: any) {
    return { error: error.message }
  }
}