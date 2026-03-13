import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/user';
import { query, queryOne } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const coinId = searchParams.get('coinId');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        let trades;
        if (coinId) {
            trades = await query<any[]>(
                `SELECT b.*, br.winning_side, br.start_time as round_start, br.end_time as round_end,
                 br.coin_id as round_coin
                 FROM bids b
                 JOIN bid_rounds br ON b.round_id = br.id
                 WHERE b.user_id = ? AND b.coin_id = ?
                 ORDER BY b.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
                [userId, coinId]
            );
        } else {
            trades = await query<any[]>(
                `SELECT b.*, br.winning_side, br.start_time as round_start, br.end_time as round_end,
                 br.coin_id as round_coin
                 FROM bids b
                 JOIN bid_rounds br ON b.round_id = br.id
                 WHERE b.user_id = ?
                 ORDER BY b.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
                [userId]
            );
        }

        return NextResponse.json({ trades: trades || [] });
    } catch (error: any) {
        console.error('Bid history error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
