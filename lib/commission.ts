/**
 * Commission calculation module
 * 6-Level Trading Commission + 3% Direct Referral Bonus
 */
import { query, queryOne } from '@/lib/db';

// Commission rates by level
const COMMISSION_LEVELS = [
    { level: 1, rate: 0.0081 },  // 0.81%
    { level: 2, rate: 0.0035 },  // 0.35%
    { level: 3, rate: 0.0017 },  // 0.17%
    { level: 4, rate: 0.0010 },  // 0.10%
    { level: 5, rate: 0.0007 },  // 0.07%
    { level: 6, rate: 0.0004 },  // 0.04%
];

const REFERRAL_BONUS_RATE = 0.03; // 3% direct referral bonus

/**
 * Process referral bonus for direct referrer
 */
export async function processReferralBonus(tradingUserId: number, tradeAmount: number): Promise<void> {
    try {
        // Get the trading user's referral info
        const user = await queryOne<any>(
            'SELECT id, referred_by FROM users WHERE id = ?',
            [tradingUserId]
        );

        if (!user || !user.referred_by) return;

        // Find referrer by referral code
        const referrer = await queryOne<any>(
            'SELECT id FROM users WHERE referral_code = ?',
            [user.referred_by]
        );

        if (!referrer) return;

        const bonus = Math.round(tradeAmount * REFERRAL_BONUS_RATE * 100000000) / 100000000;
        if (bonus <= 0) return;

        // Credit referral bonus to referrer's wallet
        await query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [bonus, referrer.id]);

        // Record in referral_earnings table
        await query(
            'INSERT INTO referral_earnings (user_id, from_user_id, amount) VALUES (?, ?, ?)',
            [referrer.id, tradingUserId, bonus]
        );

        // Record as transaction
        await query(
            'INSERT INTO transactions (user_id, type, amount, status, notes) VALUES (?, "referral_bonus", ?, "completed", ?)',
            [referrer.id, bonus, `3% referral bonus from user #${tradingUserId}'s trade`]
        );
    } catch (error) {
        console.error('Referral bonus error:', error);
    }
}

/**
 * Process 6-level commission for upline chain
 */
export async function processCommission(tradingUserId: number, tradeAmount: number): Promise<void> {
    try {
        let currentUserId = tradingUserId;

        for (const { level, rate } of COMMISSION_LEVELS) {
            // Get current user's referrer
            const currentUser = await queryOne<any>(
                'SELECT id, referred_by FROM users WHERE id = ?',
                [currentUserId]
            );

            if (!currentUser || !currentUser.referred_by) break;

            // Find upline user by referral code
            const uplineUser = await queryOne<any>(
                'SELECT id FROM users WHERE referral_code = ?',
                [currentUser.referred_by]
            );

            if (!uplineUser) break;

            const commission = Math.round(tradeAmount * rate * 100000000) / 100000000;
            if (commission <= 0) {
                currentUserId = uplineUser.id;
                continue;
            }

            // Credit commission to upline's wallet
            await query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [commission, uplineUser.id]);

            // Store in commission_history table (if it exists)
            try {
                await query(
                    'INSERT INTO commission_history (user_id, from_user_id, level, trade_amount, commission_rate, commission_amount) VALUES (?, ?, ?, ?, ?, ?)',
                    [uplineUser.id, tradingUserId, level, tradeAmount, rate, commission]
                );
            } catch {
                // Table might not exist yet, skip silently
            }

            // Record as transaction
            await query(
                'INSERT INTO transactions (user_id, type, amount, status, notes) VALUES (?, "referral_bonus", ?, "completed", ?)',
                [uplineUser.id, commission, `Level ${level} commission (${(rate * 100).toFixed(2)}%) from user #${tradingUserId}`]
            );

            // Move up the chain
            currentUserId = uplineUser.id;
        }
    } catch (error) {
        console.error('Commission processing error:', error);
    }
}
