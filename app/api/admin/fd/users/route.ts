import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/user';
import { query, queryOne } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('search') || '';
        const offset = (page - 1) * limit;

        let sql = 'SELECT id, name, email, phone, wallet_balance, total_deposited, referral_code, is_verified, is_blocked, profit_sharing_enabled, created_at FROM fd_users';
        let countSql = 'SELECT COUNT(*) as total FROM fd_users';
        const params: any[] = [];
        const countParams: any[] = [];

        if (search) {
            sql += ' WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?';
            countSql += ' WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?';
            const s = `%${search}%`;
            params.push(s, s, s);
            countParams.push(s, s, s);
        }

        sql += ` ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

        const [users, totalResult] = await Promise.all([
            query<any[]>(sql, params),
            queryOne<any>(countSql, countParams),
        ]);

        return NextResponse.json({ users, total: totalResult?.total || 0, page, limit });
    } catch (error: any) {
        console.error('Admin FD users error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { userId, action, value } = body;

        if (!userId || !action) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

        if (action === 'block') {
            await query('UPDATE fd_users SET is_blocked = ? WHERE id = ?', [value ? 1 : 0, userId]);
            return NextResponse.json({ message: `User ${value ? 'blocked' : 'unblocked'}` });
        }

        if (action === 'profit_sharing') {
            await query('UPDATE fd_users SET profit_sharing_enabled = ? WHERE id = ?', [value ? 1 : 0, userId]);
            return NextResponse.json({ message: `Profit sharing ${value ? 'enabled' : 'disabled'}` });
        }

        if (action === 'adjust_balance') {
            await query('UPDATE fd_users SET wallet_balance = wallet_balance + ? WHERE id = ?', [parseFloat(value), userId]);
            await query('INSERT INTO fd_transactions (user_id, type, amount, status, notes) VALUES (?, "admin_adjustment", ?, "completed", "Admin balance adjustment")', [userId, Math.abs(parseFloat(value))]);
            return NextResponse.json({ message: 'Balance adjusted' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Admin FD user action error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
