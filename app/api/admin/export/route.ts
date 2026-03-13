import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { query } from '@/lib/db';

// GET: Export CSV (admin only)
export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'transactions'; // transactions | users

        if (type === 'users') {
            const users = await query<any[]>(
                'SELECT id, name, email, phone, wallet_address, wallet_balance, referral_code, referred_by, role, is_verified, created_at FROM users ORDER BY created_at DESC'
            );
            const headers = ['ID', 'Name', 'Email', 'Phone', 'Wallet Address', 'Balance', 'Referral Code', 'Referred By', 'Role', 'Verified', 'Created At'];
            const rows = (users || []).map(u =>
                [u.id, u.name, u.email, u.phone, u.wallet_address, u.wallet_balance, u.referral_code, u.referred_by || '', u.role, u.is_verified, u.created_at].join(',')
            );
            const csv = [headers.join(','), ...rows].join('\n');

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename=users_${Date.now()}.csv`,
                },
            });
        }

        // Default: transactions
        const txStatus = searchParams.get('status') || '';
        const txType = searchParams.get('txType') || '';

        let where = 'WHERE 1=1';
        const params: any[] = [];
        if (txStatus) { where += ' AND t.status = ?'; params.push(txStatus); }
        if (txType) { where += ' AND t.type = ?'; params.push(txType); }

        const transactions = await query<any[]>(
            `SELECT t.*, u.name as user_name, u.email as user_email FROM transactions t LEFT JOIN users u ON t.user_id = u.id ${where} ORDER BY t.created_at DESC`,
            params
        );

        const headers = ['ID', 'User', 'Email', 'Type', 'Amount', 'Wallet Address', 'Status', 'TX Hash', 'Notes', 'Created At'];
        const rows = (transactions || []).map(t =>
            [t.id, t.user_name, t.user_email, t.type, t.amount, t.wallet_address || '', t.status, t.tx_hash || '', `"${(t.notes || '').replace(/"/g, '""')}"`, t.created_at].join(',')
        );
        const csv = [headers.join(','), ...rows].join('\n');

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename=transactions_${Date.now()}.csv`,
            },
        });
    } catch (error: any) {
        console.error('Admin export error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
