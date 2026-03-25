import { NextResponse } from 'next/server';
import { getFDUserIdFromRequest } from '@/lib/fd-user';
import { query, queryOne } from '@/lib/db';
import { z } from 'zod';

const submitSchema = z.object({
    utrNumber: z.string().min(6, 'Invalid UTR number'),
    upiId: z.string().min(3, 'Invalid UPI ID'),
    amount: z.number().min(500, 'Minimum UPI deposit is ₹500'),
});

export async function POST(request: Request) {
    try {
        const userId = await getFDUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const parsed = submitSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const { utrNumber, upiId, amount } = parsed.data;

        // Check for duplicate UTR
        const existing = await queryOne<any>('SELECT id FROM fd_deposit_requests WHERE utr_number = ?', [utrNumber]);
        if (existing) {
            return NextResponse.json({ error: 'This UTR number has already been submitted' }, { status: 400 });
        }

        await query(
            `INSERT INTO fd_deposit_requests (user_id, deposit_type, amount, upi_id, utr_number, status) VALUES (?, 'upi', ?, ?, ?, 'pending')`,
            [userId, amount, upiId, utrNumber]
        );

        return NextResponse.json({ message: `UPI deposit of ₹${amount.toFixed(2)} submitted for review` });
    } catch (error: any) {
        console.error('FD UPI deposit submit error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
