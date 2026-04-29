import { NextResponse } from 'next/server'

export function middleware(req) {
  const { pathname } = req.nextUrl

  // Always skip — no auth needed for:
  // - Next.js internals
  // - API routes (called via fetch, no auth header)
  // - Public invoice view pages (/invoice/...)
  // - Static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/invoice/') ||
    pathname === '/favicon.ico' ||
    pathname === '/logo.jpg'
  ) {
    return NextResponse.next()
  }

  // Everything else requires Basic Auth
  const auth = req.headers.get('authorization')
  if (auth && auth.startsWith('Basic ')) {
    try {
      const decoded    = Buffer.from(auth.slice(6).trim(), 'base64').toString('utf8')
      const colonIndex = decoded.indexOf(':')
      const user       = decoded.slice(0, colonIndex)
      const pass       = decoded.slice(colonIndex + 1)
      const validUser  = process.env.AUTH_USER || 'admin'
      const validPass  = process.env.AUTH_PASS || 'changeme'
      if (user === validUser && pass === validPass) {
        return NextResponse.next()
      }
    } catch (_) {}
  }

  return new Response('Login Required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="MRM Web Solutions - Invoices"',
      'Content-Type': 'text/plain',
    },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.jpg|api/|invoice/).*)'],
}
