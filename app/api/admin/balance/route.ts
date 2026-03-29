import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { query, queryOne } from '@/lib/db';

// POST: Manually adjust user wallet balance (admin only)
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { userId, amount, reason, creditType } = await request.json();

        if (!userId || amount === undefined || amount === null) {
            return NextResponse.json({ error: 'User ID and amount required' }, { status: 400 });
        }

        const targetUser = await queryOne<any>('SELECT id, wallet_balance FROM users WHERE id = ?', [userId]);
        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const adjustAmount = parseFloat(amount);
        const newBalance = parseFloat(targetUser.wallet_balance) + adjustAmount;

        if (newBalance < 0) {
            return NextResponse.json({ error: 'Resulting balance cannot be negative' }, { status: 400 });
        }

        await query('UPDATE users SET wallet_balance = ? WHERE id = ?', [newBalance, userId]);

        // Determine transaction type based on creditType
        const txType = creditType === 'ib_bonus' ? 'ib_bonus'
            : creditType === 'referral_bonus' ? 'referral_bonus'
            : adjustAmount >= 0 ? 'deposit' : 'withdrawal';

        const notePrefix = creditType === 'ib_bonus' ? 'Admin IB Bonus Credit'
            : creditType === 'referral_bonus' ? 'Admin Referral Bonus Credit'
            : 'Admin adjustment';

        // Record adjustment
        await query(
            'INSERT INTO transactions (user_id, type, amount, status, notes) VALUES (?, ?, ?, "completed", ?)',
            [userId, txType, Math.abs(adjustAmount), `${notePrefix}: ${reason || 'Manual balance update'}`]
        );

        // If IB or referral bonus credit, also record in referral_earnings for income history
        if ((creditType === 'ib_bonus' || creditType === 'referral_bonus') && adjustAmount > 0) {
            try {
                await query(
                    'INSERT INTO referral_earnings (user_id, from_user_id, amount, type, level) VALUES (?, ?, ?, ?, ?)',
                    [userId, userId, adjustAmount, creditType, null]
                );
            } catch { /* referral_earnings table might have different schema */ }
        }

        return NextResponse.json({ message: 'Balance updated', newBalance });
    } catch (error: any) {
        console.error('Admin balance error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
