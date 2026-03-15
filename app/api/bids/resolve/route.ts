import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { processReferralBonus, processCommission } from '@/lib/commission';
import {
    determineSingleBetOutcome,
    updateUserProfile,
    logBetOutcome,
    type OutcomeDecision,
} from '@/lib/outcome-engine';

type SettingRow = {
    setting_value: string;
};

type BidRow = {
    id: number;
    user_id: number;
    coin_id: string;
    direction: 'up' | 'down';
    amount: string | number;
    status: 'pending' | 'won' | 'lost';
};

type RoundRow = {
    id: number;
    total_up_amount: string | number;
    total_down_amount: string | number;
};

// Helper: get a platform setting
async function getSetting(key: string): Promise<string> {
    try {
        const row = await queryOne<SettingRow>('SELECT setting_value FROM platform_settings WHERE setting_key = ?', [key]);
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

// Helper: Process a single bid win
async function processBidWin(bid: BidRow, roundId: number, decision: OutcomeDecision): Promise<void> {
    const netAmount = Number(bid.amount);
    const originalAmount = netAmount / (1 - 0.03);
    const payout = Math.round((originalAmount + netAmount) * 100000000) / 100000000;

    await query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [payout, bid.user_id]);
    await query('UPDATE bids SET status = "won", payout = ?, admin_override = ?, engine_reason = ? WHERE id = ?',
        [payout, decision.source === 'admin_override' ? 'force_win' : 'system', decision.reason.substring(0, 255), bid.id]);

    await query(
        'INSERT INTO transactions (user_id, type, amount, status, notes) VALUES (?, "bid_win", ?, "completed", ?)',
        [bid.user_id, payout, `Won bid on ${bid.coin_id} (Round #${roundId})`]
    );

    await updateUserProfile(bid.user_id, netAmount, true, payout);
    await logBetOutcome(bid.id, bid.user_id, roundId, netAmount, 'win', decision);
}

// Helper: Process a single bid loss
async function processBidLoss(bid: BidRow, roundId: number, decision: OutcomeDecision): Promise<void> {
    const netAmount = Number(bid.amount);

    await query('UPDATE bids SET status = "lost", admin_override = ?, engine_reason = ? WHERE id = ?',
        [decision.source === 'admin_override' ? 'force_loss' : 'system', decision.reason.substring(0, 255), bid.id]);

    await updateUserProfile(bid.user_id, netAmount, false, 0);
    await logBetOutcome(bid.id, bid.user_id, roundId, netAmount, 'loss', decision);
}

// Resolve expired rounds - called periodically or via cron
// WIN LOGIC: payout = originalAmount + netAmount (e.g. bet 100, fee 3, net 97, win = 100+97 = 197)
// Single bet: Uses Smart Outcome Engine for risk-managed results
// Multi-bet: 1) Admin manual  2) Consecutive  3) Equal=random  4) Minority wins
export async function POST() {
    try {
        const expiredRounds = await query<RoundRow[]>(
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

            const totalUp = Number(round.total_up_amount) || 0;
            const totalDown = Number(round.total_down_amount) || 0;

            // Skip if no bids
            if (totalUp === 0 && totalDown === 0) {
                await query('UPDATE bid_rounds SET status = "resolved" WHERE id = ?', [round.id]);
                continue;
            }

            // ═══════ SINGLE BET (one side only) → Check Admin Override First, then Smart Outcome Engine ═══════
            if (totalUp === 0 || totalDown === 0) {
                const bids = await query<BidRow[]>('SELECT * FROM bids WHERE round_id = ? AND status = "pending"', [round.id]);
                const winningSideForSingle = totalUp > 0 ? 'up' : 'down';

                for (const bid of bids) {
                    const netAmount = Number(bid.amount);
                    let decision: OutcomeDecision;

                    // Check admin manual override FIRST (applies to both single and multi bets)
                    if (tradeMode === 'manual' && (manualWinner === 'up' || manualWinner === 'down')) {
                        const adminWantsWin = bid.direction === manualWinner;
                        decision = {
                            shouldWin: adminWantsWin,
                            source: 'admin_override',
                            reason: `Admin manual override: ${manualWinner} wins`,
                            riskScore: 0,
                            platformExposure: 0,
                        };
                        // Clear manual winner after first use
                        await setSetting('manual_winner', '');
                    } else {
                        // Use Smart Outcome Engine for each bid
                        decision = await determineSingleBetOutcome(bid.id, bid.user_id, netAmount);
                    }

                    if (decision.shouldWin) {
                        await processBidWin(bid, round.id, decision);
                    } else {
                        await processBidLoss(bid, round.id, decision);
                    }

                    // Process referral bonus + commission
                    await processReferralBonus(bid.user_id, netAmount);
                    await processCommission(bid.user_id, netAmount);
                }
                await query('UPDATE bid_rounds SET status = "resolved", winning_side = ? WHERE id = ?', [winningSideForSingle, round.id]);
                resolvedCount++;
                continue;
            }

            // ═══════ MULTI-BET → Determine round winner ═══════
            const allBids = await query<BidRow[]>('SELECT * FROM bids WHERE round_id = ? AND status = "pending"', [round.id]);
            let winningSide: 'up' | 'down';

            if (tradeMode === 'manual' && (manualWinner === 'up' || manualWinner === 'down')) {
                winningSide = manualWinner as 'up' | 'down';
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
                winningSide = Math.random() < 0.5 ? 'up' : 'down';
            } else {
                // Default: minority side wins (lower total = platform pays less)
                winningSide = totalUp > totalDown ? 'down' : 'up';
            }

            // ═══════ Process multi-bet results ═══════
            for (const bid of allBids) {
                const bidWon = bid.direction === winningSide;
                const netAmount = Number(bid.amount);

                const decision: OutcomeDecision = {
                    shouldWin: bidWon,
                    source: 'multi_bet' as any,
                    reason: `Multi-bet round: winningSide=${winningSide}, direction=${bid.direction}`,
                    riskScore: 0,
                    platformExposure: 0,
                };

                if (bidWon) {
                    await processBidWin(bid, round.id, decision);
                } else {
                    await processBidLoss(bid, round.id, decision);
                }

                await processReferralBonus(bid.user_id, netAmount);
                await processCommission(bid.user_id, netAmount);
            }

            await query('UPDATE bid_rounds SET status = "resolved", winning_side = ? WHERE id = ?', [winningSide, round.id]);
            resolvedCount++;
        }

        return NextResponse.json({ message: 'Rounds resolved', resolved: resolvedCount });
    } catch (error: unknown) {
        console.error('Resolve bids error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
