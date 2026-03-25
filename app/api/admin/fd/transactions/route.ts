import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'pending';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = 20;
        const offset = (page - 1) * limit;

        const transactions = await query<any[]>(
            `SELECT t.*, fu.name, fu.email FROM fd_transactions t 
             JOIN fd_users fu ON t.user_id = fu.id 
             WHERE t.type = 'withdrawal' AND t.status = ? 
             ORDER BY t.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
            [status]
        );

        const totalResult = await queryOne<any>("SELECT COUNT(*) as total FROM fd_transactions WHERE type = 'withdrawal' AND status = ?", [status]);

        return NextResponse.json({ transactions, total: totalResult?.total || 0 });
    } catch (error: any) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { transactionId, action } = body;

        if (!transactionId || !action) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

        const tx = await queryOne<any>('SELECT * FROM fd_transactions WHERE id = ?', [transactionId]);
        if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        if (tx.status !== 'pending') return NextResponse.json({ error: 'Already processed' }, { status: 400 });

        if (action === 'approve') {
            await query('UPDATE fd_transactions SET status = "completed" WHERE id = ?', [transactionId]);
            await query('UPDATE fd_users SET wallet_balance = wallet_balance - ? WHERE id = ?', [Number(tx.amount), tx.user_id]);
            return NextResponse.json({ message: 'Withdrawal approved' });
        }

        if (action === 'reject') {
            await query('UPDATE fd_transactions SET status = "rejected" WHERE id = ?', [transactionId]);
            return NextResponse.json({ message: 'Withdrawal rejected, balance not deducted' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Admin FD transaction action error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
