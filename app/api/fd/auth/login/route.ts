import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { comparePassword, signFDToken } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(1, 'Password is required'),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = loginSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const { email, password } = parsed.data;

        const user = await queryOne<any>(
            'SELECT * FROM fd_users WHERE email = ?',
            [email]
        );

        if (!user) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        if (user.is_blocked) {
            return NextResponse.json({ error: 'Your account has been blocked. Contact support.' }, { status: 403 });
        }

        const isValid = await comparePassword(password, user.password_hash);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        const token = signFDToken({
            fdUserId: user.id,
            email: user.email,
            role: user.role,
        });

        const response = NextResponse.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                walletBalance: user.wallet_balance,
                referralCode: user.referral_code,
                role: user.role,
            },
        });

        response.cookies.set('fd_token', token, {
            httpOnly: true,
            secure: request.headers.get('x-forwarded-proto') === 'https' || request.url.startsWith('https://'),
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60,
            path: '/',
        });

        return response;
    } catch (error: any) {
        console.error('FD Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
