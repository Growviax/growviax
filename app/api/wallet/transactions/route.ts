import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/user';
import { query } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type'); // deposit, withdrawal, etc.
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        let transactions;
        if (type) {
            transactions = await query<any[]>(
                `SELECT * FROM transactions WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
                [userId, type]
            );
        } else {
            transactions = await query<any[]>(
                `SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
                [userId]
            );
        }

        return NextResponse.json({ transactions: transactions || [] });
    } catch (error: any) {
        console.error('Transactions error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
