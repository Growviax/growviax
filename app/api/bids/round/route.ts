import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/user';
import { queryOne } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const coinId = searchParams.get('coinId');

        if (!coinId) {
            return NextResponse.json({ error: 'coinId required' }, { status: 400 });
        }

        // Get current open round
        const round = await queryOne<any>(
            'SELECT * FROM bid_rounds WHERE coin_id = ? AND status = "open" AND end_time > NOW() ORDER BY id DESC LIMIT 1',
            [coinId]
        );

        if (!round) {
            return NextResponse.json({ round: null, message: 'No active round' });
        }

        // Only return the user's own bid info, not total pool amounts from all users
        const userBid = await queryOne<any>(
            'SELECT direction, amount FROM bids WHERE round_id = ? AND user_id = ? AND status = "pending" ORDER BY id DESC LIMIT 1',
            [round.id, userId]
        );

        return NextResponse.json({
            round: {
                id: round.id,
                coinId: round.coin_id,
                startTime: round.start_time,
                endTime: round.end_time,
                // Don't expose other users' bid totals — only show the user's own bid
                userBid: userBid ? {
                    direction: userBid.direction,
                    amount: userBid.amount,
                } : null,
                status: round.status,
            },
        });
    } catch (error: any) {
        console.error('Round info error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
