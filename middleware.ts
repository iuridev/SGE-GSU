import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // LOG 1: Verificar se o middleware está rodando e qual rota interceptou
  console.log(`[MIDDLEWARE] Processando rota: ${path}`);

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
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

  // LOG 2: Usar getUser() para validar a sessão de forma segura no servidor
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.log("[MIDDLEWARE] Sem usuário autenticado ou sessão expirada.");
  }

  // REGRA DE PROTEÇÃO 1: Se não estiver logado, obriga a ir para /login
  if (!user && !path.startsWith('/login')) {
    console.log("[MIDDLEWARE] Usuário não logado. Redirecionando para /login");
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // REGRA DE PROTEÇÃO 2: Se já estiver logado, não deixa voltar para a tela de login
  if (user && path.startsWith('/login')) {
    console.log("[MIDDLEWARE] Usuário já autenticado. Redirecionando para a Home (/)");
    return NextResponse.redirect(new URL('/', request.url));
  }

  console.log("[MIDDLEWARE] Acesso autorizado.");
  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}