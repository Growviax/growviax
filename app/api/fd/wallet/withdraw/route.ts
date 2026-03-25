import { NextResponse } from 'next/server';
import { getFDUserIdFromRequest } from '@/lib/fd-user';
import { query, queryOne } from '@/lib/db';
import { z } from 'zod';

const withdrawSchema = z.object({
    amount: z.number().positive('Amount must be positive'),
    withdrawMethod: z.enum(['usdt', 'upi']),
    walletAddress: z.string().nullable().optional(),
    upiId: z.string().nullable().optional(),
});

export async function POST(request: Request) {
    try {
        const userId = await getFDUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const parsed = withdrawSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const { amount, withdrawMethod, walletAddress, upiId } = parsed.data;

        if (withdrawMethod === 'usdt') {
            if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
                return NextResponse.json({ error: 'Invalid BSC wallet address' }, { status: 400 });
            }
        } else {
            if (!upiId || !upiId.includes('@')) {
                return NextResponse.json({ error: 'Invalid UPI ID' }, { status: 400 });
            }
        }

        const MIN_WITHDRAW_USDT = 10;
        const MIN_WITHDRAW_UPI = 500;

        if (withdrawMethod === 'usdt' && amount < MIN_WITHDRAW_USDT) {
            return NextResponse.json({ error: `Minimum USDT withdrawal is $${MIN_WITHDRAW_USDT}` }, { status: 400 });
        }
        if (withdrawMethod === 'upi' && amount < MIN_WITHDRAW_UPI) {
            return NextResponse.json({ error: `Minimum UPI withdrawal is ₹${MIN_WITHDRAW_UPI}` }, { status: 400 });
        }

        // Get rate
        const rateSetting = await queryOne<any>("SELECT setting_value FROM fd_settings WHERE setting_key = 'usd_to_inr_rate'");
        const USD_TO_INR = parseFloat(rateSetting?.setting_value || '98');

        const inrAmount = withdrawMethod === 'usdt' ? amount * USD_TO_INR : amount;

        // Check balance
        const user = await queryOne<any>('SELECT wallet_balance FROM fd_users WHERE id = ?', [userId]);
        if (!user || Number(user.wallet_balance) < inrAmount) {
            return NextResponse.json({ error: `Insufficient balance. Required: ₹${inrAmount.toFixed(2)}, Available: ₹${Number(user?.wallet_balance || 0).toFixed(2)}` }, { status: 400 });
        }

        const address = withdrawMethod === 'usdt' ? walletAddress : upiId;
        const network = withdrawMethod === 'usdt' ? 'BEP20' : 'UPI';
        const notes = withdrawMethod === 'usdt'
            ? `USDT withdrawal request: $${amount.toFixed(2)} × ${USD_TO_INR} = ₹${inrAmount.toFixed(2)} – pending admin approval`
            : 'UPI withdrawal request – pending admin approval';

        await query(
            'INSERT INTO fd_transactions (user_id, type, amount, wallet_address, status, notes, network) VALUES (?, "withdrawal", ?, ?, "pending", ?, ?)',
            [userId, inrAmount, address, notes, network]
        );

        return NextResponse.json({
            message: withdrawMethod === 'usdt'
                ? `USDT withdrawal request for $${amount.toFixed(2)} (₹${inrAmount.toFixed(2)}) submitted.`
                : 'UPI withdrawal request submitted. Will be processed within 24 hours.'
        });
    } catch (error: any) {
        console.error('FD Withdraw error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
