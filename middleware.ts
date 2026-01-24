import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Criamos uma resposta base
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // LOG 1: Monitorar a rota no servidor da Vercel
  console.log(`[MIDDLEWARE] Rota: ${path}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Atualiza os cookies na requisição e na resposta simultaneamente
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

  // LOG 2: Verificar a sessão
  // Usamos getSession aqui porque ele é mais rápido para o Middleware do Next.js
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    console.log(`[MIDDLEWARE] Sessão ativa para: ${session.user.email}`);
  } else {
    console.log("[MIDDLEWARE] Nenhuma sessão encontrada nos cookies.");
  }

  // REGRA 1: Se NÃO estiver logado e tentar acessar a Home ou outras páginas
  if (!session && path !== '/login') {
    console.log("[MIDDLEWARE] Redirecionando para LOGIN (Sem Sessão)");
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // REGRA 2: Se JÁ estiver logado e tentar acessar o /login, manda para a Home
  if (session && path === '/login') {
    console.log("[MIDDLEWARE] Redirecionando para HOME (Já Logado)");
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}