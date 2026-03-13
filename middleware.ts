import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const publicPaths = ['/login', '/signup', '/api/auth/login', '/api/auth/signup', '/api/auth/send-otp', '/api/auth/verify-otp', '/api/auth/forgot-password', '/api/admin/migrate'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths and static assets
    if (
        publicPaths.some((path) => pathname.startsWith(path)) ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/img') ||
        pathname === '/favicon.ico' ||
        pathname === '/sitemap.xml' ||
        pathname === '/robots.txt'
    ) {
        return NextResponse.next();
    }

    const token = request.cookies.get('token')?.value;

    // Root path redirect
    if (pathname === '/') {
        if (token) {
            try {
                const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'growviax_secret');
                await jwtVerify(token, secret);
                return NextResponse.redirect(new URL('/home', request.url));
            } catch {
                return NextResponse.redirect(new URL('/login', request.url));
            }
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Protect API routes (except public ones)
    if (pathname.startsWith('/api/')) {
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        try {
            const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'growviax_secret');
            const { payload } = await jwtVerify(token, secret);

            // Admin API protection
            if (pathname.startsWith('/api/admin/') || pathname.startsWith('/api/blockchain/') || pathname.startsWith('/api/salary/check')) {
                const role = (payload as any).role;
                if (role !== 'admin') {
                    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
                }
            }

            return NextResponse.next();
        } catch {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
    }

    // Protect dashboard routes
    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'growviax_secret');
        const { payload } = await jwtVerify(token, secret);

        // Admin page protection
        if (pathname.startsWith('/admin')) {
            const role = (payload as any).role;
            if (role !== 'admin') {
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
        }

        return NextResponse.next();
    } catch {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('token');
        return response;
    }
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|img/).*)'],
};
