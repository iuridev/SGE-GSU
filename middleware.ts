import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // LOG 1: Monitorar qual página está sendo acessada
  console.log(`[MIDDLEWARE] Acessando: ${path}`);

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
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // LOG 2: Verificando usuário
  // Usamos getUser() em vez de getSession() para evitar falsos positivos
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.log("[MIDDLEWARE] Sem sessão ativa ou erro na verificação.");
  }

  // REGRA 1: Se NÃO estiver logado e tentar acessar páginas internas
  if (!user && !path.startsWith('/login')) {
    console.log("[MIDDLEWARE] Bloqueado: Redirecionando para /login");
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // REGRA 2: Se JÁ estiver logado e tentar acessar o /login
  if (user && path.startsWith('/login')) {
    console.log("[MIDDLEWARE] Já logado: Redirecionando para a Home");
    const redirectUrl = new URL('/', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  console.log("[MIDDLEWARE] Acesso liberado.");
  return response
}

export const config = {
  // Monitora tudo exceto arquivos do sistema, imagens e favicon
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}