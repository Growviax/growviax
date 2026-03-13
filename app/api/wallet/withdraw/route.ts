import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/user';
import { query, queryOne } from '@/lib/db';
import { z } from 'zod';

const withdrawSchema = z.object({
    amount: z.number().positive('Amount must be positive'),
    walletAddress: z.string().min(10, 'Invalid wallet address'),
    qrImage: z.string().optional(),
});

export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const parsed = withdrawSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const { amount, walletAddress, qrImage } = parsed.data;

        // Check minimum amount
        if (amount < 1000) {
            return NextResponse.json({ error: 'Minimum withdrawal amount is ₹1,000' }, { status: 400 });
        }

        // Check balance
        const user = await queryOne<any>('SELECT wallet_balance FROM users WHERE id = ?', [userId]);
        if (!user || user.wallet_balance < amount) {
            return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
        }

        // Record transaction as pending (balance NOT deducted until admin approval)
        await query(
            'INSERT INTO transactions (user_id, type, amount, wallet_address, status, notes, network) VALUES (?, "withdrawal", ?, ?, "pending", "Withdrawal request – pending admin approval", "BEP20")',
            [userId, amount, walletAddress]
        );

        return NextResponse.json({ message: 'Withdrawal request submitted. It will be processed within 3 working days.' });
    } catch (error: any) {
        console.error('Withdraw error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
