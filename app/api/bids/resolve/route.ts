import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { processReferralBonus, processCommission } from '@/lib/commission';

// Helper: get a platform setting
async function getSetting(key: string): Promise<string> {
    try {
        const row = await queryOne<any>('SELECT setting_value FROM platform_settings WHERE setting_key = ?', [key]);
        return row?.setting_value || '';
    } catch { return ''; }
}

async function setSetting(key: string, value: string): Promise<void> {
    try {
        await query(
            'INSERT INTO platform_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            [key, value, value]
        );
    } catch { }
}

// Check if a user qualifies for new-user bonus (won fewer than 3 bids total)
async function getNewUserWinCount(userId: number): Promise<number> {
    try {
        const result = await queryOne<any>(
            'SELECT COUNT(*) as count FROM bids WHERE user_id = ? AND status = "won"',
            [userId]
        );
        return result?.count || 0;
    } catch { return 999; }
}

// Resolve expired rounds - called periodically or via cron
// WIN LOGIC: payout = originalAmount + netAmount (e.g. bet 100, fee 3, net 97, win = 100+97 = 197)
// Single bet (one side only): all users win. New user (< 3 wins, < 500) wins. After 3 wins = LOSE.
// Multi-bet: 1) Admin manual  2) Consecutive  3) Equal=random  4) Minority wins
export async function POST() {
    try {
        const expiredRounds = await query<any[]>(
            'SELECT * FROM bid_rounds WHERE status = "open" AND end_time <= NOW()'
        );

        if (!expiredRounds || expiredRounds.length === 0) {
            return NextResponse.json({ message: 'No rounds to resolve', resolved: 0 });
        }

        // Get admin settings
        const tradeMode = await getSetting('trade_mode') || 'auto';
        const manualWinner = await getSetting('manual_winner');
        let consecutiveUp = parseInt(await getSetting('consecutive_up_wins') || '0');
        let consecutiveDown = parseInt(await getSetting('consecutive_down_wins') || '0');

        let resolvedCount = 0;

        for (const round of expiredRounds) {
            await query('UPDATE bid_rounds SET status = "closed" WHERE id = ?', [round.id]);

            const totalUp = parseFloat(round.total_up_amount) || 0;
            const totalDown = parseFloat(round.total_down_amount) || 0;

            // Skip if no bids
            if (totalUp === 0 && totalDown === 0) {
                await query('UPDATE bid_rounds SET status = "resolved" WHERE id = ?', [round.id]);
                continue;
            }

            // If only one side has bids → single bet logic
            // New user (< 3 wins, amount < 500) = WIN
            // New user (>= 3 wins) = LOSE (to prevent abuse)
            // Non-new users = always WIN on single bets
            if (totalUp === 0 || totalDown === 0) {
                const bids = await query<any[]>('SELECT * FROM bids WHERE round_id = ? AND status = "pending"', [round.id]);
                const winningSideForSingle = totalUp > 0 ? 'up' : 'down';
                for (const bid of bids) {
                    const netAmount = parseFloat(bid.amount);
                    const originalAmount = netAmount / (1 - 0.03);

                    const winCount = await getNewUserWinCount(bid.user_id);
                    const isNewUser = originalAmount < 500;
                    const newUserExhausted = isNewUser && winCount >= 3;

                    if (newUserExhausted) {
                        // New user already won 3 times on single bets → LOSE
                        await query('UPDATE bids SET status = "lost" WHERE id = ?', [bid.id]);
                    } else {
                        // WIN: payout = originalAmount + netAmount
                        const payout = Math.round((originalAmount + netAmount) * 100000000) / 100000000;

                        await query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [payout, bid.user_id]);
                        await query('UPDATE bids SET status = "won", payout = ? WHERE id = ?', [payout, bid.id]);

                        await query(
                            'INSERT INTO transactions (user_id, type, amount, status, notes) VALUES (?, "bid_win", ?, "completed", ?)',
                            [bid.user_id, payout, `Won bid on ${bid.coin_id} (Round #${round.id})`]
                        );
                    }

                    // Process referral bonus + commission
                    await processReferralBonus(bid.user_id, netAmount);
                    await processCommission(bid.user_id, netAmount);
                }
                await query('UPDATE bid_rounds SET status = "resolved", winning_side = ? WHERE id = ?', [winningSideForSingle, round.id]);
                resolvedCount++;
                continue;
            }

            // Get all bids for this round
            const allBids = await query<any[]>('SELECT * FROM bids WHERE round_id = ? AND status = "pending"', [round.id]);

            // ═══════ STEP 1: Multi-bet → go by normal logic (no new user rigging) ═══════

            // ═══════ STEP 2: Determine round winner ═══════
            let winningSide: 'up' | 'down';

            if (tradeMode === 'manual' && (manualWinner === 'up' || manualWinner === 'down')) {
                // Admin manual override
                winningSide = manualWinner as 'up' | 'down';
                // Clear manual winner after use (one-shot)
                await setSetting('manual_winner', '');
            } else if (consecutiveUp > 0) {
                winningSide = 'up';
                consecutiveUp--;
                await setSetting('consecutive_up_wins', String(consecutiveUp));
            } else if (consecutiveDown > 0) {
                winningSide = 'down';
                consecutiveDown--;
                await setSetting('consecutive_down_wins', String(consecutiveDown));
            } else if (totalUp === totalDown) {
                // Equal amounts → random winner
                winningSide = Math.random() < 0.5 ? 'up' : 'down';
            } else {
                // Default: minority side wins (lower total amount)
                winningSide = totalUp > totalDown ? 'down' : 'up';
            }

            const losingSide = winningSide === 'up' ? 'down' : 'up';

            // ═══════ STEP 3: Process bids (normal logic, no rigging for multi-bet) ═══════
            for (const bid of allBids) {
                const bidWon = bid.direction === winningSide;

                if (bidWon) {
                    // WIN PAYOUT = originalAmount + netAmount
                    const netAmount = parseFloat(bid.amount);
                    const originalAmount = netAmount / (1 - 0.03);
                    const payout = Math.round((originalAmount + netAmount) * 100000000) / 100000000;

                    await query('UPDATE bids SET status = "won", payout = ? WHERE id = ?', [payout, bid.id]);
                    await query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [payout, bid.user_id]);

                    await query(
                        'INSERT INTO transactions (user_id, type, amount, status, notes) VALUES (?, "bid_win", ?, "completed", ?)',
                        [bid.user_id, payout, `Won bid on ${bid.coin_id} (Round #${round.id})`]
                    );
                } else {
                    await query('UPDATE bids SET status = "lost" WHERE id = ?', [bid.id]);
                }

                // Process referral bonus + commission for ALL bids (win or lose)
                await processReferralBonus(bid.user_id, parseFloat(bid.amount));
                await processCommission(bid.user_id, parseFloat(bid.amount));
            }

            await query('UPDATE bid_rounds SET status = "resolved", winning_side = ? WHERE id = ?', [winningSide, round.id]);
            resolvedCount++;
        }

        return NextResponse.json({ message: 'Rounds resolved', resolved: resolvedCount });
    } catch (error: any) {
        console.error('Resolve bids error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
