import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/user';
import { query, queryOne } from '@/lib/db';
import { z } from 'zod';

const USD_TO_INR = 98; // Conversion rate

const withdrawSchema = z.object({
    amount: z.number().positive('Amount must be positive'),
    withdrawMethod: z.enum(['usdt', 'upi']),
    walletAddress: z.string().nullable().optional(),
    upiId: z.string().nullable().optional(),
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

        const { amount, withdrawMethod, walletAddress, upiId } = parsed.data;

        // Validate based on method
        if (withdrawMethod === 'usdt') {
            if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
                return NextResponse.json({ error: 'Invalid BSC wallet address' }, { status: 400 });
            }
        } else {
            if (!upiId || !upiId.includes('@')) {
                return NextResponse.json({ error: 'Invalid UPI ID' }, { status: 400 });
            }
        }

        // Check minimum amount based on method
        const MIN_WITHDRAW_USDT = 10; // $10 minimum
        const MIN_WITHDRAW_UPI = 500; // ₹500 minimum
        
        if (withdrawMethod === 'usdt') {
            if (amount < MIN_WITHDRAW_USDT) {
                return NextResponse.json({ error: `Minimum USDT withdrawal amount is $${MIN_WITHDRAW_USDT}` }, { status: 400 });
            }
        } else {
            if (amount < MIN_WITHDRAW_UPI) {
                return NextResponse.json({ error: `Minimum UPI withdrawal amount is ₹${MIN_WITHDRAW_UPI}` }, { status: 400 });
            }
        }

        // Convert USDT amount to INR for storage and balance check
        const inrAmount = withdrawMethod === 'usdt' ? amount * USD_TO_INR : amount;
        const originalUsdAmount = withdrawMethod === 'usdt' ? amount : null;

        // Check balance (using INR amount)
        const user = await queryOne<any>('SELECT wallet_balance FROM users WHERE id = ?', [userId]);
        if (!user || user.wallet_balance < inrAmount) {
            return NextResponse.json({ error: `Insufficient balance. Required: ₹${inrAmount.toFixed(2)}, Available: ₹${Number(user?.wallet_balance || 0).toFixed(2)}` }, { status: 400 });
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
        const address = withdrawMethod === 'usdt' ? walletAddress : upiId;
        const network = withdrawMethod === 'usdt' ? 'BEP20' : 'UPI';
        const notes = originalUsdAmount 
            ? `USDT withdrawal request: $${originalUsdAmount.toFixed(2)} × ${USD_TO_INR} = ₹${inrAmount.toFixed(2)} – pending admin approval`
            : 'UPI withdrawal request – pending admin approval';

        await query(
            'INSERT INTO transactions (user_id, type, amount, wallet_address, status, notes, network) VALUES (?, "withdrawal", ?, ?, "pending", ?, ?)',
            [userId, inrAmount, address, notes, network]
        );

        return NextResponse.json({ 
            message: withdrawMethod === 'usdt'
                ? `USDT withdrawal request for $${amount.toFixed(2)} (₹${inrAmount.toFixed(2)}) submitted. It will be processed within 24 hours.`
                : 'UPI withdrawal request submitted. It will be processed within 24 hours.'
        });
    } catch (error: any) {
        console.error('Withdraw error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
