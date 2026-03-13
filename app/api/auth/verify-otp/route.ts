import { NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
    email: z.string().email(),
    otp: z.string().length(6),
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

        const { email, otp } = parsed.data;

        const otpRecord = await queryOne<any>(
            'SELECT * FROM otp_codes WHERE email = ? AND code = ? AND expires_at > NOW() AND is_used = 0 ORDER BY created_at DESC LIMIT 1',
            [email, otp]
        );

        if (!otpRecord) {
            return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
        }

        await query('UPDATE otp_codes SET is_used = 1 WHERE id = ?', [otpRecord.id]);

        return NextResponse.json({ message: 'OTP verified successfully', verified: true });
    } catch (error: any) {
        console.error('Verify OTP error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
