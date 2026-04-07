import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/user';
import { query, queryOne } from '@/lib/db';
import { POST as resolveRounds } from '@/app/api/bids/resolve/route';

/**
 * GLOBAL Deterministic Round System (v2 — slot_number based)
 * 
 * Every round is identified by (coin_id, slot_number, duration).
 * slot_number = floor(epoch_seconds / duration)
 * 
 * This is 100% deterministic — all users, all servers, all requests
 * within the same time window compute the EXACT same slot_number.
 * 
 * The period ID displayed to users is derived from slot_number (not DB id),
 * so even if the DB row is created at slightly different times, the
 * period ID is always identical for the same time window.
 * 
 * MySQL NOW() is NEVER used for time comparisons — only JS Date.now()
 * is used, and it's passed to MySQL as a parameter to avoid clock skew.
 */

const VALID_DURATIONS = [33, 60];

/**
 * Generate a deterministic period ID from slot_number and coinId.
 * Same slot_number + coinId = same period ID for ALL users.
 */
function generatePeriodId(slotNumber: number, coinId: string): string {
    const base = coinId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const coinHash = String(base * 7919 + 20260308).slice(0, 8).padStart(8, '0');
    const slotPart = String(slotNumber).slice(-12).padStart(12, '0');
    return coinHash + slotPart;
}

/**
 * Get the deterministic time slot for a given duration.
 * Pure function — same input time always gives same output.
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
 * Auto-resolve expired rounds using JS-computed time (NOT MySQL NOW()).
 * Only resolves rounds whose end_time is before the current JS time.
 */
async function autoResolveExpired(): Promise<void> {
    try {
        const jsNow = new Date(Date.now());
        const expired = await query<any[]>(
            'SELECT id FROM bid_rounds WHERE status = "open" AND end_time <= ?',
            [jsNow]
        );
        if (expired && expired.length > 0) {
            try {
                await resolveRounds();
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

        const duration = VALID_DURATIONS.includes(durationParam) ? durationParam : 33;

        // Auto-resolve expired rounds using JS time (no MySQL NOW() skew)
        await autoResolveExpired();

        // Calculate the current deterministic time slot
        const { slotStart, slotEnd, slotNumber } = getCurrentTimeSlot(duration);
        const serverTime = Date.now();

        // Look up the round by EXACT slot_number match (no fuzzy TIMESTAMPDIFF)
        let round = await queryOne<any>(
            `SELECT * FROM bid_rounds 
             WHERE coin_id = ? AND slot_number = ? AND duration = ?
             LIMIT 1`,
            [coinId, slotNumber, duration]
        );

        // Create if not exists — INSERT IGNORE handles race conditions atomically
        if (!round) {
            await query(
                `INSERT IGNORE INTO bid_rounds (coin_id, slot_number, duration, start_time, end_time) 
                 VALUES (?, ?, ?, ?, ?)`,
                [coinId, slotNumber, duration, slotStart, slotEnd]
            );
            round = await queryOne<any>(
                `SELECT * FROM bid_rounds 
                 WHERE coin_id = ? AND slot_number = ? AND duration = ?
                 LIMIT 1`,
                [coinId, slotNumber, duration]
            );
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
                periodId: generatePeriodId(slotNumber, coinId),
                coinId: round.coin_id,
                startTime: slotStart.toISOString(),
                endTime: slotEnd.toISOString(),
                slotNumber,
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
