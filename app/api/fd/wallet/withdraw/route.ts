import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getFDUserIdFromRequest } from '@/lib/fd-user';
import { query, queryOne } from '@/lib/db';
import { getFDSettings, toInr } from '@/lib/fd-config';
import { syncFDInvestmentsForUser } from '@/lib/fd-earnings';

const withdrawSchema = z.object({
    amountUsdt: z.number().positive('Amount must be positive'),
    walletAddress: z.string().min(42, 'Invalid BSC wallet address'),
});

export async function POST(request: Request) {
    try {
        const userId = await getFDUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await syncFDInvestmentsForUser(userId);

        const body = await request.json();
        const parsed = withdrawSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const { amountUsdt, walletAddress } = parsed.data;
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress.trim())) {
            return NextResponse.json({ error: 'Invalid BSC wallet address' }, { status: 400 });
        }

        const MIN_WITHDRAW_USDT = 10;
        if (amountUsdt < MIN_WITHDRAW_USDT) {
            return NextResponse.json({ error: `Minimum withdrawal is ${MIN_WITHDRAW_USDT} USDT` }, { status: 400 });
        }

        const settings = await getFDSettings();
        const inrAmount = toInr(amountUsdt, settings.usdtRate);

        const user = await queryOne<any>('SELECT wallet_balance FROM fd_users WHERE id = ?', [userId]);
        if (!user || Number(user.wallet_balance) < inrAmount) {
            return NextResponse.json({
                error: `Insufficient balance. Required: ₹${inrAmount.toFixed(2)}, Available: ₹${Number(user?.wallet_balance || 0).toFixed(2)}`,
            }, { status: 400 });
        }

        const deductResult = await query<any>(
            'UPDATE fd_users SET wallet_balance = wallet_balance - ? WHERE id = ? AND wallet_balance >= ?',
            [inrAmount, userId, inrAmount]
        );

        if (!deductResult || Number(deductResult.affectedRows || 0) === 0) {
            return NextResponse.json({ error: 'Failed to reserve withdrawal amount. Please try again.' }, { status: 400 });
        }

        await query(
            `INSERT INTO fd_transactions (user_id, type, amount, wallet_address, status, notes, network)
             VALUES (?, 'withdrawal', ?, ?, 'pending', ?, 'BEP20')`,
            [
                userId,
                inrAmount,
                walletAddress.trim(),
                `USDT withdrawal request: ${amountUsdt.toFixed(2)} USDT × ${settings.usdtRate} = ₹${inrAmount.toFixed(2)} – pending admin approval (balance reserved)`,
            ]
        );

        return NextResponse.json({
            message: `Withdrawal request for ${amountUsdt.toFixed(2)} USDT submitted. It will be processed after admin approval.`,
        });
    } catch (error: any) {
        console.error('FD Withdraw error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
