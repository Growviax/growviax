import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET: Fetch resolved round history for a coin (public, shows all round results)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const coinId = searchParams.get('coinId');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

        if (!coinId) {
            return NextResponse.json({ error: 'coinId required' }, { status: 400 });
        }

        const rounds = await query<any[]>(
            `SELECT id, coin_id, start_time, end_time, status, winning_side, 
                    total_up_users, total_down_users, created_at
             FROM bid_rounds 
             WHERE coin_id = ? AND status = 'resolved' AND winning_side IS NOT NULL
             ORDER BY id DESC 
             LIMIT ${Number(limit)}`,
            [coinId]
        );

        return NextResponse.json({ rounds: rounds || [] });
    } catch (error: any) {
        console.error('Rounds history error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
