import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'pending';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = 20;
        const offset = (page - 1) * limit;

        const deposits = await query<any[]>(
            `SELECT dr.*, fu.name, fu.email FROM fd_deposit_requests dr 
             JOIN fd_users fu ON dr.user_id = fu.id 
             WHERE dr.status = ? ORDER BY dr.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
            [status]
        );

        const totalResult = await queryOne<any>('SELECT COUNT(*) as total FROM fd_deposit_requests WHERE status = ?', [status]);

        return NextResponse.json({ deposits, total: totalResult?.total || 0 });
    } catch (error: any) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { requestId, action, customAmount } = body;

        if (!requestId || !action) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

        const deposit = await queryOne<any>('SELECT * FROM fd_deposit_requests WHERE id = ?', [requestId]);
        if (!deposit) return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
        if (deposit.status !== 'pending') return NextResponse.json({ error: 'Already processed' }, { status: 400 });

        if (action === 'approve') {
            const creditAmount = customAmount ? parseFloat(customAmount) : Number(deposit.amount);
            await query('UPDATE fd_deposit_requests SET status = "approved", reviewed_at = NOW() WHERE id = ?', [requestId]);
            await query('UPDATE fd_users SET wallet_balance = wallet_balance + ?, total_deposited = total_deposited + ? WHERE id = ?', [creditAmount, creditAmount, deposit.user_id]);
            await query(
                'INSERT INTO fd_transactions (user_id, type, amount, status, tx_hash, notes, network) VALUES (?, "deposit", ?, "completed", ?, ?, ?)',
                [deposit.user_id, creditAmount, deposit.tx_hash || deposit.utr_number, `${deposit.deposit_type.toUpperCase()} deposit approved`, deposit.deposit_type === 'usdt' ? 'BEP20' : 'UPI']
            );
            return NextResponse.json({ message: `Deposit approved. ₹${creditAmount.toFixed(2)} credited.` });
        }

        if (action === 'reject') {
            await query('UPDATE fd_deposit_requests SET status = "rejected", reviewed_at = NOW() WHERE id = ?', [requestId]);
            return NextResponse.json({ message: 'Deposit rejected' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Admin FD deposit action error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
