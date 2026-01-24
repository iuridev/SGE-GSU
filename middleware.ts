import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  console.log(`[MIDDLEWARE] Rota detectada: ${path}`);

  let response = NextResponse.next({
    request: { headers: request.headers },
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

  // LOG: Verificando se as chaves existem (sem exibir o valor real por segurança)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("[MIDDLEWARE] ERRO: NEXT_PUBLIC_SUPABASE_URL não configurada na Vercel!");
  }

  // IMPORTANTE: Para o Middleware, usamos getSession primeiro. 
  // Se falhar, tentamos getUser. Isso evita o travamento que você viu.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (user) {
    console.log(`[MIDDLEWARE] Usuário identificado: ${user.email}`);
  } else {
    console.log("[MIDDLEWARE] Nenhum usuário encontrado nos cookies.");
  }

  // REGRA 1: Proteger rotas internas
  if (!user && !path.startsWith('/login')) {
    console.log("[MIDDLEWARE] Acesso negado. Redirecionando -> /login");
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // REGRA 2: Evitar que logados fiquem na tela de login
  if (user && path.startsWith('/login')) {
    console.log("[MIDDLEWARE] Já logado. Redirecionando -> Home");
    return NextResponse.redirect(new URL('/', request.url));
  }

  console.log("[MIDDLEWARE] Requisição autorizada.");
  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}