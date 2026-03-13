import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { hashPassword, generateWalletAddress, generateReferralCode, signToken } from '@/lib/auth';
import { z } from 'zod';

const signupSchema = z.object({
    inviteCode: z.string().optional(),
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
            return NextResponse.json(
                { error: parsed.error.issues[0].message },
                { status: 400 }
            );
        }

        const { inviteCode, name, phone, email, otp, password } = parsed.data;

        // Verify invite code only if provided
        let referredBy: string | null = null;
        if (inviteCode && inviteCode.trim()) {
            const referrer = await queryOne<any>(
                'SELECT id, referral_code FROM users WHERE referral_code = ?',
                [inviteCode.trim()]
            );
            if (!referrer) {
                return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 });
            }
            referredBy = inviteCode.trim();
        }

        // Check if user already exists
        const existingUser = await queryOne<any>(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUser) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
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

        // Create user
        const passwordHash = await hashPassword(password);
        const walletAddress = generateWalletAddress();
        const referralCode = generateReferralCode();

        const result = await query<any>(
            'INSERT INTO users (name, email, phone, password_hash, wallet_address, referral_code, referred_by, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
            [name, email, phone, passwordHash, walletAddress, referralCode, referredBy]
        );

        const userId = result.insertId;

        // Generate JWT
        const token = signToken({ userId, email, role: 'user' });

        const response = NextResponse.json({
            message: 'Account created successfully',
            user: { id: userId, name, email, walletAddress, referralCode },
        });

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: request.headers.get('x-forwarded-proto') === 'https' || request.url.startsWith('https://'),
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/',
        });

        return response;
    } catch (error: any) {
        console.error('Signup error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
