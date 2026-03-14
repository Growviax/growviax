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

        // Check trade volume requirement: user must trade at least their total deposit amount
        const depositRow = await queryOne<any>(
            'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = "deposit" AND status = "completed"',
            [userId]
        );
        const totalDeposited = parseFloat(depositRow?.total || '0');

        const tradedRow = await queryOne<any>(
            'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = "bid_loss" AND status = "completed"',
            [userId]
        );
        const totalTraded = parseFloat(tradedRow?.total || '0');

        if (totalTraded < totalDeposited) {
            const remaining = Math.ceil(totalDeposited - totalTraded);
            return NextResponse.json({
                error: `You need to trade ₹${remaining.toLocaleString()} more before you can withdraw. Total deposit: ₹${totalDeposited.toLocaleString()}, Traded: ₹${Math.floor(totalTraded).toLocaleString()}`
            }, { status: 400 });
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
