import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { loggingMiddleware } from '@/lib/middleware/logging';

export async function middleware(request: NextRequest) {
  // APIルートのみにログミドルウェアを適用
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return loggingMiddleware(request, async () => {
      // デフォルトの処理を継続
      return NextResponse.next();
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
