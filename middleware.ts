import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const publicPaths = ['/login', '/signup', '/api/auth/login', '/api/auth/signup', '/api/auth/send-otp', '/api/auth/verify-otp', '/api/auth/forgot-password', '/api/admin/migrate'];
const fdPublicPaths = ['/fd/login', '/fd/signup', '/api/fd/auth/login', '/api/fd/auth/signup', '/api/fd/auth/send-otp', '/api/fd/auth/forgot-password'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow static assets
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/img') ||
        pathname === '/favicon.ico' ||
        pathname === '/sitemap.xml' ||
        pathname === '/robots.txt'
    ) {
        return NextResponse.next();
    }

    // Allow trading public paths
    if (publicPaths.some((path) => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    // Allow FD public paths
    if (fdPublicPaths.some((path) => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    const token = request.cookies.get('token')?.value;
    const fdToken = request.cookies.get('fd_token')?.value;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'growviax_secret');

    // ═══════════ FD API ROUTES ═══════════
    if (pathname.startsWith('/api/fd/')) {
        if (!fdToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        try {
            await jwtVerify(fdToken, secret);
            return NextResponse.next();
        } catch {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
    }

    // ═══════════ FD ADMIN API ROUTES ═══════════
    if (pathname.startsWith('/api/admin/fd/')) {
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        try {
            const { payload } = await jwtVerify(token, secret);
            if ((payload as any).role !== 'admin') {
                return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
            }
            return NextResponse.next();
        } catch {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
    }

    // ═══════════ FD DASHBOARD ROUTES ═══════════
    if (pathname.startsWith('/fd/')) {
        // FD pages need fd_token
        if (!fdToken) {
            return NextResponse.redirect(new URL('/fd/login', request.url));
        }
        try {
            await jwtVerify(fdToken, secret);
            return NextResponse.next();
        } catch {
            const response = NextResponse.redirect(new URL('/fd/login', request.url));
            response.cookies.delete('fd_token');
            return response;
        }
    }

    // ═══════════ ROOT REDIRECT ═══════════
    if (pathname === '/') {
        if (token) {
            try {
                await jwtVerify(token, secret);
                return NextResponse.redirect(new URL('/home', request.url));
            } catch {
                return NextResponse.redirect(new URL('/login', request.url));
            }
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // ═══════════ TRADING API ROUTES ═══════════
    if (pathname.startsWith('/api/')) {
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        try {
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

    // ═══════════ TRADING DASHBOARD ROUTES ═══════════
    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
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
