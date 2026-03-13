import { NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { hashPassword, generateOTP } from '@/lib/auth';
import { sendOTPEmail } from '@/lib/email';
import { z } from 'zod';
import dayjs from 'dayjs';

const requestResetSchema = z.object({
    email: z.string().email(),
    step: z.literal('request'),
});

const resetSchema = z.object({
    email: z.string().email(),
    otp: z.string().length(6),
    newPassword: z.string().min(6),
    step: z.literal('reset'),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (body.step === 'request') {
            const parsed = requestResetSchema.safeParse(body);
            if (!parsed.success) {
                return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
            }

            const user = await queryOne<any>('SELECT id FROM users WHERE email = ?', [parsed.data.email]);
            if (!user) {
                // Don't reveal if email exists
                return NextResponse.json({ message: 'If the email exists, an OTP has been sent.' });
            }

            const otp = generateOTP();
            const expiresAt = dayjs().add(10, 'minute').format('YYYY-MM-DD HH:mm:ss');

            await query('INSERT INTO otp_codes (email, code, expires_at) VALUES (?, ?, ?)', [parsed.data.email, otp, expiresAt]);
            await sendOTPEmail(parsed.data.email, otp);

            return NextResponse.json({ message: 'If the email exists, an OTP has been sent.' });
        }

        if (body.step === 'reset') {
            const parsed = resetSchema.safeParse(body);
            if (!parsed.success) {
                return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
            }

            const { email, otp, newPassword } = parsed.data;

            const otpRecord = await queryOne<any>(
                'SELECT * FROM otp_codes WHERE email = ? AND code = ? AND expires_at > NOW() AND is_used = 0 ORDER BY created_at DESC LIMIT 1',
                [email, otp]
            );

            if (!otpRecord) {
                return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
            }

            await query('UPDATE otp_codes SET is_used = 1 WHERE id = ?', [otpRecord.id]);

            const passwordHash = await hashPassword(newPassword);
            await query('UPDATE users SET password_hash = ? WHERE email = ?', [passwordHash, email]);

            return NextResponse.json({ message: 'Password reset successfully' });
        }

        return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
    } catch (error: any) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
