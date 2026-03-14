import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { query } from '@/lib/db';

// GET: List all users (admin only)
export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('search') || '';
        const offset = (page - 1) * limit;

        let users;
        let total;

        if (search) {
            users = await query<any[]>(
                `SELECT id, name, email, phone, wallet_address, wallet_balance, referral_code, referred_by, role, is_verified, is_blocked, created_at FROM users WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
                [`%${search}%`, `%${search}%`, `%${search}%`]
            );
            const countResult = await query<any[]>(
                'SELECT COUNT(*) as total FROM users WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?',
                [`%${search}%`, `%${search}%`, `%${search}%`]
            );
            total = countResult?.[0]?.total || 0;
        } else {
            users = await query<any[]>(
                `SELECT id, name, email, phone, wallet_address, wallet_balance, referral_code, referred_by, role, is_verified, is_blocked, created_at FROM users ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`
            );
            const countResult = await query<any[]>('SELECT COUNT(*) as total FROM users');
            total = countResult?.[0]?.total || 0;
        }

        return NextResponse.json({ users: users || [], total, page, limit });
    } catch (error: any) {
        console.error('Admin users error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH: Block/Unblock user
export async function PATCH(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { userId, action } = await request.json();
        if (!userId || !['block', 'unblock'].includes(action)) {
            return NextResponse.json({ error: 'userId and action (block/unblock) required' }, { status: 400 });
        }

        const isBlocked = action === 'block' ? 1 : 0;
        await query('UPDATE users SET is_blocked = ? WHERE id = ?', [isBlocked, userId]);

        return NextResponse.json({ message: `User ${action}ed successfully` });
    } catch (error: any) {
        console.error('Admin users patch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
