'use server'

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Esta função roda EXCLUSIVAMENTE no servidor
export async function createNewUser(formData: any) {
  const cookieStore = await cookies()

  // 1. Verificação de Segurança: Quem está pedindo isso é um Admin mesmo?
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Usuário não autenticado.' }

  const { data: userProfile } = await supabase
    .from('usuarios')
    .select('perfil')
    .eq('email', user.email)
    .single()

  if (userProfile?.perfil !== 'Regional') {
    return { error: 'Permissão negada. Apenas Admins podem criar usuários.' }
  }

  // 2. Inicializa o cliente ADMIN (que pode pular verificação de email)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Certifique-se de ter essa chave no .env
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // 3. Cria o usuário no Auth já confirmando o email
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: formData.email,
    password: formData.senha,
    email_confirm: true, // <--- O PULO DO GATO: Já confirma o email automaticamente
    user_metadata: { nome: formData.nome }
  })

  if (authError) return { error: authError.message }
  if (!authData.user) return { error: 'Erro ao gerar ID de autenticação.' }

  // 4. Cria o registro na tabela pública 'usuarios'
  // Usamos o admin aqui também para garantir que a RLS não bloqueie
  const { error: dbError } = await supabaseAdmin
    .from('usuarios')
    .insert({
      id: authData.user.id,
      nome: formData.nome,
      email: formData.email,
      perfil: formData.perfil
    })

  if (dbError) {
    // Se der erro no banco, tentamos limpar o auth para não ficar órfão (opcional)
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return { error: 'Erro ao salvar dados do usuário: ' + dbError.message }
  }

  return { success: true }
}

export async function deleteSystemUser(userId: string) {
  const cookieStore = await cookies()
  
  // 1. Verifica se quem está pedindo é Admin
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Usuário não autenticado.' }

  const { data: userProfile } = await supabase
    .from('usuarios')
    .select('perfil')
    .eq('email', user.email)
    .single()

  if (userProfile?.perfil !== 'Regional') {
    return { error: 'Apenas Administradores podem excluir usuários.' }
  }

  // 2. Inicializa o Admin para poder deletar
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 3. Deleta do Sistema de Autenticação (Bloqueia o Login)
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  
  if (authError) {
    console.error("Erro ao deletar Auth:", authError.message)
    return { error: 'Erro ao remover acesso: ' + authError.message }
  }

  // 4. Deleta da tabela de Usuários (Remove da Lista)
  const { error: dbError } = await supabaseAdmin
    .from('usuarios')
    .delete()
    .eq('id', userId)

  if (dbError) {
    return { error: 'Acesso removido, mas erro ao limpar lista: ' + dbError.message }
  }

  return { success: true }
}