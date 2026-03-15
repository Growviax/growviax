import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { query, queryOne } from '@/lib/db';
import { sendWithdrawalApprovedEmail, sendWithdrawalRejectedEmail } from '@/lib/email';

// GET: All transactions with filters (admin only)
export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || '';
        const status = searchParams.get('status') || '';
        const userId = searchParams.get('userId') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        let where = 'WHERE 1=1';
        const params: any[] = [];

        if (type) { where += ' AND t.type = ?'; params.push(type); }
        if (status) { where += ' AND t.status = ?'; params.push(status); }
        if (userId) { where += ' AND t.user_id = ?'; params.push(userId); }

        const transactions = await query<any[]>(
            `SELECT t.*, u.name as user_name, u.email as user_email FROM transactions t LEFT JOIN users u ON t.user_id = u.id ${where} ORDER BY t.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
            params
        );

        const countResult = await query<any[]>(
            `SELECT COUNT(*) as total FROM transactions t ${where}`,
            params
        );

        return NextResponse.json({
            transactions: transactions || [],
            total: countResult?.[0]?.total || 0,
            page,
            limit,
        });
    } catch (error: any) {
        console.error('Admin transactions error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH: Approve or reject withdrawal (admin only)
export async function PATCH(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { transactionId, action, reason, txHash } = await request.json();

        if (!transactionId || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const tx = await queryOne<any>('SELECT * FROM transactions WHERE id = ? AND type = "withdrawal" AND status = "pending"', [transactionId]);
        if (!tx) {
            return NextResponse.json({ error: 'Transaction not found or already processed' }, { status: 404 });
        }

        const txUser = await queryOne<any>('SELECT id, email, wallet_balance FROM users WHERE id = ?', [tx.user_id]);
        if (!txUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (action === 'approve') {
            // Deduct balance now (was deferred from withdraw request)
            const withdrawAmount = parseFloat(tx.amount);
            const currentBalance = parseFloat(txUser.wallet_balance);
            
            if (currentBalance < withdrawAmount) {
                return NextResponse.json({ 
                    error: `User has insufficient balance. Required: ₹${withdrawAmount.toFixed(2)}, Available: ₹${currentBalance.toFixed(2)}` 
                }, { status: 400 });
            }

            // Deduct INR amount from wallet (already converted from USD if USDT withdrawal)
            const result = await query('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ? AND wallet_balance >= ?', [withdrawAmount, tx.user_id, withdrawAmount]);
            
            // Verify the update was successful
            if (!result || (result as any).affectedRows === 0) {
                return NextResponse.json({ error: 'Failed to deduct balance. User may have insufficient funds.' }, { status: 400 });
            }

            await query('UPDATE transactions SET status = "completed", tx_hash = ?, notes = "Withdrawal approved by admin" WHERE id = ?', [txHash || null, transactionId]);

            // Send email
            await sendWithdrawalApprovedEmail(txUser.email, withdrawAmount.toFixed(2));

            return NextResponse.json({ message: `Withdrawal approved. ₹${withdrawAmount.toFixed(2)} deducted from user wallet.` });
        } else {
            // Reject - no balance deduction needed (was deferred)
            await query('UPDATE transactions SET status = "rejected", notes = ? WHERE id = ?', [reason || 'Rejected by admin', transactionId]);

            // Send rejection email
            await sendWithdrawalRejectedEmail(txUser.email, parseFloat(tx.amount).toFixed(2), reason || 'No reason provided');

            return NextResponse.json({ message: 'Withdrawal rejected' });
        }
    } catch (error: any) {
        console.error('Admin transaction action error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
