import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/user';
import { query, queryOne } from '@/lib/db';

const TRADE_FEE_RATE = 0.03; // 3%
const VALID_DURATIONS = [33, 60];
const MIN_BID_WINDOW = 10; // Don't allow bids in last 10 seconds

/**
 * Get the deterministic time slot (same logic as round/route.ts)
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

// Place a bid
export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Check if user is blocked
        const userCheck = await queryOne<any>('SELECT is_blocked FROM users WHERE id = ?', [userId]);
        if (userCheck?.is_blocked) {
            return NextResponse.json({ error: 'Your account has been suspended. Contact support.' }, { status: 403 });
        }

        const { coinId, direction, amount, duration } = await request.json();

        if (!coinId || !direction || !amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!['up', 'down'].includes(direction)) {
            return NextResponse.json({ error: 'Direction must be "up" or "down"' }, { status: 400 });
        }

        if (amount <= 0) {
            return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
        }

        // Validate duration
        const roundDuration = VALID_DURATIONS.includes(duration) ? duration : 33;

        // Calculate the deterministic time slot
        const { slotStart, slotEnd, slotNumber } = getCurrentTimeSlot(roundDuration);

        // Check if we're in the last 10 seconds (betting closed)
        const remainingSeconds = Math.ceil((slotEnd.getTime() - Date.now()) / 1000);
        if (remainingSeconds <= MIN_BID_WINDOW) {
            return NextResponse.json({ error: `Betting is closed for this round (${remainingSeconds}s remaining)` }, { status: 400 });
        }

        // Calculate 3% trading fee
        const tradingFee = Math.round(amount * TRADE_FEE_RATE * 100000000) / 100000000;
        const netBidAmount = Math.round((amount - tradingFee) * 100000000) / 100000000;

        if (netBidAmount <= 0) {
            return NextResponse.json({ error: 'Bid amount too small after fee deduction' }, { status: 400 });
        }

        // Check balance (user needs full amount, fee included)
        const user = await queryOne<any>('SELECT wallet_balance FROM users WHERE id = ?', [userId]);
        if (!user || user.wallet_balance < amount) {
            return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
        }

        // Find the current round by EXACT slot_number (deterministic, no fuzzy matching)
        let round = await queryOne<any>(
            `SELECT * FROM bid_rounds 
             WHERE coin_id = ? AND slot_number = ? AND duration = ?
             LIMIT 1`,
            [coinId, slotNumber, roundDuration]
        );

        if (!round) {
            // Create the round — INSERT IGNORE handles race conditions
            await query(
                `INSERT IGNORE INTO bid_rounds (coin_id, slot_number, duration, start_time, end_time) 
                 VALUES (?, ?, ?, ?, ?)`,
                [coinId, slotNumber, roundDuration, slotStart, slotEnd]
            );
            round = await queryOne<any>(
                `SELECT * FROM bid_rounds 
                 WHERE coin_id = ? AND slot_number = ? AND duration = ?
                 LIMIT 1`,
                [coinId, slotNumber, roundDuration]
            );
        }

        if (!round) {
            return NextResponse.json({ error: 'Could not find or create round' }, { status: 500 });
        }

        // Reject bids on already-resolved rounds
        if (round.status !== 'open') {
            return NextResponse.json({ error: 'This round has already ended' }, { status: 400 });
        }

        // Deduct full amount (bid + fee) from user balance
        await query('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ? AND wallet_balance >= ?', [amount, userId, amount]);

        // Place bid with net amount (after fee deduction)
        await query(
            'INSERT INTO bids (user_id, coin_id, round_id, direction, amount) VALUES (?, ?, ?, ?, ?)',
            [userId, coinId, round.id, direction, netBidAmount]
        );

        // Update round totals with net amount
        if (direction === 'up') {
            await query('UPDATE bid_rounds SET total_up_amount = total_up_amount + ?, total_up_users = total_up_users + 1 WHERE id = ?', [netBidAmount, round.id]);
        } else {
            await query('UPDATE bid_rounds SET total_down_amount = total_down_amount + ?, total_down_users = total_down_users + 1 WHERE id = ?', [netBidAmount, round.id]);
        }

        // Record bid transaction
        await query(
            'INSERT INTO transactions (user_id, type, amount, status, notes) VALUES (?, "bid_loss", ?, "completed", ?)',
            [userId, amount, `Bid ${direction.toUpperCase()} on ${coinId} (Fee: $${tradingFee.toFixed(4)})`]
        );

        // Record trading fee as platform revenue (stored in transactions for admin)
        await query(
            'INSERT INTO transactions (user_id, type, amount, status, notes) VALUES (?, "trading_fee", ?, "completed", ?)',
            [userId, tradingFee, `3% trading fee on ${coinId}`]
        );

        return NextResponse.json({
            message: 'Bid placed successfully',
            roundId: round.id,
            endTime: slotEnd.toISOString(),
            fee: tradingFee,
            netBid: netBidAmount,
        });
    } catch (error: any) {
        console.error('Place bid error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
