import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ✅ هذا الملف يتحكم في توجيه الصفحات
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ✅ 1. الصفحة الرئيسية - لا نقوم بأي توجيه
  if (pathname === '/') {
    return NextResponse.next();
  }

  // ✅ 2. الصفحات العامة - مسموح للجميع
  const publicPaths = ['/login', '/register', '/about', '/contact'];
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // ✅ 3. التحقق من وجود مستخدم مسجل للصفحات المحمية
  const userData = request.cookies.get('userData') || request.headers.get('user-data');
  
  // ✅ 4. إذا كان المستخدم غير مسجل ويحاول دخول صفحة محمية
  const protectedPaths = ['/platform', '/teacher', '/student', '/profile'];
  if (protectedPaths.some(path => pathname.startsWith(path))) {
    if (!userData) {
      // ✅ إعادة التوجيه إلى صفحة تسجيل الدخول
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  // ✅ 5. إذا كان كل شيء طبيعياً
  return NextResponse.next();
}

// ✅ تحديد الصفحات التي يتم تطبيق middleware عليها
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};