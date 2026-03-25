import { NextResponse } from 'next/server';
import { getFDUserIdFromRequest } from '@/lib/fd-user';
import { query } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const userId = await getFDUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const transactions = await query<any[]>(
            'SELECT * FROM fd_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
            [userId]
        );

        return NextResponse.json({ transactions });
    } catch (error: any) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
