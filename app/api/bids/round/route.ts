import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/user';
import { query, queryOne } from '@/lib/db';

const DEFAULT_ROUND_DURATION = 33; // seconds

// Generate a unique 20-digit period ID from round id and coin
function generatePeriodId(roundId: number, coinId: string): string {
    const base = coinId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const coinHash = String(base * 7919 + 20260308).slice(0, 15).padStart(15, '0');
    const roundPart = String(roundId).padStart(5, '0');
    return coinHash + roundPart;
}

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
        let round = await queryOne<any>(
            'SELECT * FROM bid_rounds WHERE coin_id = ? AND status = "open" AND end_time > NOW() ORDER BY id DESC LIMIT 1',
            [coinId]
        );

        // Auto-create a new round if none exists (continuous 33-sec rounds)
        if (!round) {
            try {
                await query(
                    'INSERT INTO bid_rounds (coin_id, start_time, end_time) VALUES (?, NOW(), DATE_ADD(NOW(), INTERVAL ? SECOND))',
                    [coinId, DEFAULT_ROUND_DURATION]
                );
                round = await queryOne<any>(
                    'SELECT * FROM bid_rounds WHERE coin_id = ? AND status = "open" AND end_time > NOW() ORDER BY id DESC LIMIT 1',
                    [coinId]
                );
            } catch {
                // Another request may have created it already
                round = await queryOne<any>(
                    'SELECT * FROM bid_rounds WHERE coin_id = ? AND status = "open" AND end_time > NOW() ORDER BY id DESC LIMIT 1',
                    [coinId]
                );
            }
        }

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
                periodId: generatePeriodId(round.id, coinId),
                coinId: round.coin_id,
                startTime: round.start_time,
                endTime: round.end_time,
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
