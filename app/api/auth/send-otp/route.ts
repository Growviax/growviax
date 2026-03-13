import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateOTP } from '@/lib/auth';
import { sendOTPEmail } from '@/lib/email';
import { z } from 'zod';
import dayjs from 'dayjs';

const schema = z.object({
    email: z.string().email('Invalid email'),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = schema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0].message },
                { status: 400 }
            );
        }

        const { email } = parsed.data;
        const otp = generateOTP();
        const expiresAt = dayjs().add(10, 'minute').format('YYYY-MM-DD HH:mm:ss');

        // Store OTP
        await query(
            'INSERT INTO otp_codes (email, code, expires_at) VALUES (?, ?, ?)',
            [email, otp, expiresAt]
        );

        // Send OTP email
        await sendOTPEmail(email, otp);

        return NextResponse.json({ message: 'OTP sent successfully' });
    } catch (error: any) {
        console.error('Send OTP error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
