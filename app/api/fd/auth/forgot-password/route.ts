import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { hashPassword, generateOTP } from '@/lib/auth';
import { sendOTPEmail } from '@/lib/email';
import { z } from 'zod';
import dayjs from 'dayjs';

const requestSchema = z.object({
    email: z.string().email('Invalid email'),
    step: z.enum(['request', 'reset']),
    otp: z.string().optional(),
    newPassword: z.string().optional(),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = requestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const { email, step, otp, newPassword } = parsed.data;

        if (step === 'request') {
            const user = await queryOne<any>('SELECT id FROM fd_users WHERE email = ?', [email]);
            if (user) {
                const otpCode = generateOTP();
                const expiresAt = dayjs().add(10, 'minute').format('YYYY-MM-DD HH:mm:ss');
                await query('INSERT INTO otp_codes (email, code, expires_at) VALUES (?, ?, ?)', [email, otpCode, expiresAt]);
                await sendOTPEmail(email, otpCode);
            }
            return NextResponse.json({ message: 'If a FD account exists, a reset code has been sent.' });
        }

        if (step === 'reset') {
            if (!otp || otp.length !== 6) {
                return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
            }
            if (!newPassword || newPassword.length < 6) {
                return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
            }

            const otpRecord = await queryOne<any>(
                'SELECT * FROM otp_codes WHERE email = ? AND code = ? AND expires_at > NOW() AND is_used = 0 ORDER BY created_at DESC LIMIT 1',
                [email, otp]
            );

            if (!otpRecord) {
                return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
            }

            await query('UPDATE otp_codes SET is_used = 1 WHERE id = ?', [otpRecord.id]);

            const passwordHash = await hashPassword(newPassword);
            await query('UPDATE fd_users SET password_hash = ? WHERE email = ?', [passwordHash, email]);

            return NextResponse.json({ message: 'Password reset successfully' });
        }

        return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
    } catch (error: any) {
        console.error('FD Forgot password error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
