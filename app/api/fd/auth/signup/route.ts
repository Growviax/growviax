import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { hashPassword, signFDToken } from '@/lib/auth';
import { z } from 'zod';

const signupSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().min(10, 'Invalid phone number'),
    email: z.string().email('Invalid email'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = signupSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const { name, phone, email, otp, password } = parsed.data;

        // Check if FD user already exists
        const existingUser = await queryOne<any>(
            'SELECT id FROM fd_users WHERE email = ?',
            [email]
        );

        if (existingUser) {
            return NextResponse.json({ error: 'Email already registered on FD platform' }, { status: 400 });
        }

        // Verify OTP
        const otpRecord = await queryOne<any>(
            'SELECT * FROM otp_codes WHERE email = ? AND code = ? AND expires_at > NOW() AND is_used = 0 ORDER BY created_at DESC LIMIT 1',
            [email, otp]
        );

        if (!otpRecord) {
            return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
        }

        // Mark OTP as used
        await query('UPDATE otp_codes SET is_used = 1 WHERE id = ?', [otpRecord.id]);

        // Create FD user (no referral code or referred_by)
        const passwordHash = await hashPassword(password);

        const result = await query<any>(
            'INSERT INTO fd_users (name, email, phone, password_hash, is_verified) VALUES (?, ?, ?, ?, 1)',
            [name, email, phone, passwordHash]
        );

        const fdUserId = result.insertId;

        // Generate FD JWT
        const token = signFDToken({ fdUserId, email, role: 'user' });

        const response = NextResponse.json({
            message: 'FD Account created successfully',
            user: { id: fdUserId, name, email },
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
        console.error('FD Signup error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
