import { NextResponse } from 'next/server';
import { getFDUserIdFromRequest } from '@/lib/fd-user';
import { query, queryOne } from '@/lib/db';
import { z } from 'zod';

const submitSchema = z.object({
    txHash: z.string().min(10, 'Invalid transaction hash'),
    walletAddress: z.string().min(10, 'Invalid wallet address'),
    amount: z.number().positive('Amount must be positive'),
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

        const { txHash, walletAddress, amount } = parsed.data;

        // Check for duplicate tx hash
        const existing = await queryOne<any>('SELECT id FROM fd_deposit_requests WHERE tx_hash = ?', [txHash]);
        if (existing) {
            return NextResponse.json({ error: 'This transaction hash has already been submitted' }, { status: 400 });
        }

        // Get USD to INR rate
        const rateSetting = await queryOne<any>("SELECT setting_value FROM fd_settings WHERE setting_key = 'usd_to_inr_rate'");
        const usdToInr = parseFloat(rateSetting?.setting_value || '98');
        const inrAmount = amount * usdToInr;

        await query(
            `INSERT INTO fd_deposit_requests (user_id, deposit_type, amount, wallet_address, tx_hash, status) VALUES (?, 'usdt', ?, ?, ?, 'pending')`,
            [userId, inrAmount, walletAddress, txHash]
        );

        return NextResponse.json({ message: `USDT deposit of $${amount.toFixed(2)} (≈₹${inrAmount.toFixed(2)}) submitted for review` });
    } catch (error: any) {
        console.error('FD deposit submit error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
