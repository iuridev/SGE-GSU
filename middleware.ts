import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Criamos uma resposta inicial que será modificada
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Inicializamos o cliente do Supabase focado no Servidor (SSR)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Método para o Middleware ler cookies vindos do navegador
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        // Método CRUCIAL: Quando o Supabase gera um novo token,
        // precisamos atualizar o cookie na REQUISIÇÃO e na RESPOSTA ao mesmo tempo.
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        // Método para remover cookies (usado no Logout)
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Verificamos o usuário atual. getUser() é mais seguro que getSession() no servidor.
  const { data: { user } } = await supabase.auth.getUser()

  // Definimos se a rota atual é a de login para evitar loops
  const isLoginPage = request.nextUrl.pathname.startsWith('/login')

  // REGRA 1: Se o usuário NÃO está logado e tenta acessar qualquer página interna
  if (!user && !isLoginPage) {
    // Redireciona para o login imediatamente
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // REGRA 2: Se o usuário JÁ ESTÁ logado e tenta acessar a página de login
  if (user && isLoginPage) {
    // Redireciona para a página principal (Home)
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Retorna a resposta com os cookies devidamente configurados
  return response
}

// Configuração de quais rotas o Middleware deve monitorar
export const config = {
  matcher: [
    /*
     * Ignora arquivos estáticos (imagens, etc) e monitora todas as outras rotas.
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}