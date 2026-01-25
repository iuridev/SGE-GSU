'use server'

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// --- FUNÇÃO AUXILIAR DE ADMINISTRAÇÃO (COM DEBUG) ---
function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // LOGS PARA O CONSOLE DO VERCEL (Ajudam a descobrir o erro)
  console.log("--- [DEBUG] TENTANDO ACESSAR CHAVE DE ADMIN ---");
  if (!serviceRoleKey) {
    console.error(">>> FALHA: A variável SUPABASE_SERVICE_ROLE_KEY é undefined/nula.");
    console.error(">>> Verifique se ela foi adicionada no Vercel e se o REDEPLOY foi feito.");
    throw new Error("Erro de Configuração: Chave de Admin (Service Role) não encontrada.");
  } else {
    // Mostra apenas os primeiros 5 caracteres por segurança
    console.log(`>>> SUCESSO: Chave encontrada. Início: ${serviceRoleKey.substring(0, 5)}...`);
    console.log(`>>> Tamanho da chave: ${serviceRoleKey.length} caracteres.`);
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

// --- CRIAR NOVO USUÁRIO ---
export async function createNewUser(formData: any) {
  const cookieStore = await cookies()

  // 1. Verificação de Segurança: Quem está pedindo é Admin?
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
    // 2. Obtém o cliente Admin (aqui que os logs vão aparecer se der erro)
    const supabaseAdmin = getSupabaseAdmin();

    // 3. Cria no Auth (Já confirmando email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: formData.email,
      password: formData.senha,
      email_confirm: true,
      user_metadata: { nome: formData.nome }
    })

    if (authError) return { error: authError.message }
    if (!authData.user) return { error: 'Erro ao gerar ID de autenticação.' }

    // 4. Cria no Banco de Dados
    const { error: dbError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        id: authData.user.id,
        nome: formData.nome,
        email: formData.email,
        perfil: formData.perfil
      })

    if (dbError) {
      // Se falhar no banco, remove do auth para não ficar "sujo"
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return { error: 'Erro ao salvar no banco: ' + dbError.message }
    }

    return { success: true }

  } catch (error: any) {
    return { error: error.message }
  }
}

// --- EXCLUIR USUÁRIO ---
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

    // 2. Remove do Auth (Login)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (authError) {
      console.error("Erro Auth:", authError)
      return { error: 'Erro ao bloquear acesso: ' + authError.message }
    }

    // 3. Remove da Lista (Banco)
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