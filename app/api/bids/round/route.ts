import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/user';
import { query, queryOne } from '@/lib/db';

/**
 * Deterministic Server-Driven Round System
 * 
 * Instead of creating rounds on-demand (which caused sync issues),
 * rounds are anchored to fixed time slots derived from epoch seconds.
 * 
 * For a 33-second round:
 *   slot = floor(epoch_seconds / 33)
 *   round_start = slot * 33
 *   round_end   = (slot + 1) * 33
 * 
 * Every user, regardless of when they connect, gets the SAME round
 * with the SAME start/end time. The server also returns `serverTime`
 * so clients can calculate drift and sync countdowns perfectly.
 */

const VALID_DURATIONS = [33, 60];

// Generate a unique 20-digit period ID from round id and coin
function generatePeriodId(roundId: number, coinId: string): string {
    const base = coinId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const coinHash = String(base * 7919 + 20260308).slice(0, 15).padStart(15, '0');
    const roundPart = String(roundId).padStart(5, '0');
    return coinHash + roundPart;
}

/**
 * Get the deterministic time slot for a given duration.
 * Returns { slotStart, slotEnd } as Date objects anchored to epoch.
 */
function getCurrentTimeSlot(durationSeconds: number): { slotStart: Date; slotEnd: Date; slotNumber: number } {
    const nowEpoch = Math.floor(Date.now() / 1000);
    const slotNumber = Math.floor(nowEpoch / durationSeconds);
    const slotStartEpoch = slotNumber * durationSeconds;
    const slotEndEpoch = (slotNumber + 1) * durationSeconds;
    return {
        slotStart: new Date(slotStartEpoch * 1000),
        slotEnd: new Date(slotEndEpoch * 1000),
        slotNumber,
    };
}

/**
 * Auto-resolve any expired rounds for this coin.
 * Called before returning round data so resolution happens server-side.
 */
async function autoResolveExpired(coinId: string): Promise<void> {
    try {
        // Just trigger the resolve endpoint logic inline for expired rounds
        // Import would be circular, so we do a lightweight check here
        const expired = await query<any[]>(
            'SELECT id FROM bid_rounds WHERE coin_id = ? AND status = "open" AND end_time <= NOW()',
            [coinId]
        );
        if (expired && expired.length > 0) {
            // Call resolve endpoint internally
            try {
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                await fetch(`${baseUrl}/api/bids/resolve`, { method: 'POST' });
            } catch { }
        }
    } catch { }
}

export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const coinId = searchParams.get('coinId');
        const durationParam = parseInt(searchParams.get('duration') || '33');

        if (!coinId) {
            return NextResponse.json({ error: 'coinId required' }, { status: 400 });
        }

        // Validate duration
        const duration = VALID_DURATIONS.includes(durationParam) ? durationParam : 33;

        // Auto-resolve any expired rounds first (server-side resolution)
        await autoResolveExpired(coinId);

        // Calculate the current deterministic time slot
        const { slotStart, slotEnd, slotNumber } = getCurrentTimeSlot(duration);
        const serverTime = Date.now();

        // Look for an existing round that matches this exact time slot
        // We match by checking if the round's start_time and end_time align with our slot
        let round = await queryOne<any>(
            `SELECT * FROM bid_rounds 
             WHERE coin_id = ? AND status = 'open'
             AND ABS(TIMESTAMPDIFF(SECOND, start_time, ?)) <= 2
             AND ABS(TIMESTAMPDIFF(SECOND, end_time, ?)) <= 2
             ORDER BY id DESC LIMIT 1`,
            [coinId, slotStart, slotEnd]
        );

        // Create if not exists
        if (!round) {
            try {
                await query(
                    'INSERT INTO bid_rounds (coin_id, start_time, end_time) VALUES (?, ?, ?)',
                    [coinId, slotStart, slotEnd]
                );
                round = await queryOne<any>(
                    `SELECT * FROM bid_rounds WHERE coin_id = ? AND status = 'open' 
                     AND ABS(TIMESTAMPDIFF(SECOND, start_time, ?)) <= 2
                     ORDER BY id DESC LIMIT 1`,
                    [coinId, slotStart]
                );
            } catch {
                // Another request may have created it — race condition safe
                round = await queryOne<any>(
                    `SELECT * FROM bid_rounds WHERE coin_id = ? AND status = 'open' 
                     AND ABS(TIMESTAMPDIFF(SECOND, start_time, ?)) <= 2
                     ORDER BY id DESC LIMIT 1`,
                    [coinId, slotStart]
                );
            }
        }

        if (!round) {
            return NextResponse.json({ round: null, message: 'No active round', serverTime });
        }

        // Get user's bid in this round
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
                duration,
                userBid: userBid ? {
                    direction: userBid.direction,
                    amount: userBid.amount,
                } : null,
                status: round.status,
            },
            serverTime,
        });
    } catch (error: any) {
        console.error('Round info error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
