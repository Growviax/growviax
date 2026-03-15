/**
 * Commission calculation module
 * 6-Level Trading Commission + Direct Referral Bonus
 * Rates are configurable via platform_settings
 */
import { query, queryOne } from '@/lib/db';

// Default commission rates by level (can be overridden via settings)
const DEFAULT_COMMISSION_LEVELS = [
    { level: 1, rate: 0.0081 },  // 0.81%
    { level: 2, rate: 0.0035 },  // 0.35%
    { level: 3, rate: 0.0017 },  // 0.17%
    { level: 4, rate: 0.0010 },  // 0.10%
    { level: 5, rate: 0.0007 },  // 0.07%
    { level: 6, rate: 0.0004 },  // 0.04%
];

const DEFAULT_REFERRAL_BONUS_RATE = 0.03; // 3% direct referral bonus

// Helper to get setting from database
async function getSetting(key: string, defaultVal: string): Promise<string> {
    try {
        const row = await queryOne<{ setting_value: string }>(
            'SELECT setting_value FROM platform_settings WHERE setting_key = ?', [key]
        );
        return row?.setting_value || defaultVal;
    } catch { return defaultVal; }
}

// Get referral bonus rate from settings
async function getReferralBonusRate(): Promise<number> {
    const rate = await getSetting('referral_bonus_rate', String(DEFAULT_REFERRAL_BONUS_RATE));
    return parseFloat(rate) || DEFAULT_REFERRAL_BONUS_RATE;
}

// Get commission levels from settings
async function getCommissionLevels(): Promise<{ level: number; rate: number }[]> {
    try {
        const levelsJson = await getSetting('commission_levels', '');
        if (levelsJson) {
            return JSON.parse(levelsJson);
        }
    } catch { }
    return DEFAULT_COMMISSION_LEVELS;
}

/**
 * Process referral bonus for direct referrer (ONE-TIME on first trade)
 * Bonus = 3% of user's FIRST DEPOSIT amount (not trade amount)
 */
export async function processReferralBonus(tradingUserId: number, _tradeAmount: number): Promise<void> {
    try {
        // Get the trading user's referral info
        const user = await queryOne<any>(
            'SELECT id, referred_by FROM users WHERE id = ?',
            [tradingUserId]
        );

        if (!user || !user.referred_by) return;

        // Check if referral bonus already paid for this user (one-time only)
        const existingBonus = await queryOne<{ count: number }>(
            'SELECT COUNT(*) as count FROM referral_earnings WHERE from_user_id = ?',
            [tradingUserId]
        );
        if (existingBonus && existingBonus.count > 0) return; // Already paid

        // Find referrer by referral code
        const referrer = await queryOne<any>(
            'SELECT id FROM users WHERE referral_code = ?',
            [user.referred_by]
        );

        if (!referrer) return;

        // Get user's first deposit amount
        const firstDeposit = await queryOne<{ amount: number }>(
            `SELECT amount FROM transactions 
             WHERE user_id = ? AND type = 'deposit' AND status = 'completed' 
             ORDER BY created_at ASC LIMIT 1`,
            [tradingUserId]
        );

        if (!firstDeposit || !firstDeposit.amount) return;

        const depositAmount = Number(firstDeposit.amount);
        if (depositAmount <= 0) return;

        // Get rate from settings (default 3%)
        const bonusRate = await getReferralBonusRate();
        const bonus = Math.round(depositAmount * bonusRate * 100) / 100;
        if (bonus <= 0) return;

        // Credit referral bonus to referrer's wallet
        await query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [bonus, referrer.id]);

        // Record in referral_earnings table
        try {
            await query(
                'INSERT INTO referral_earnings (user_id, from_user_id, amount) VALUES (?, ?, ?)',
                [referrer.id, tradingUserId, bonus]
            );
        } catch {
            // Table might not exist, skip silently
        }

        // Record as transaction
        await query(
            'INSERT INTO transactions (user_id, type, amount, status, notes) VALUES (?, "referral_bonus", ?, "completed", ?)',
            [referrer.id, bonus, `${(bonusRate * 100).toFixed(0)}% referral bonus from user #${tradingUserId}'s first deposit of ₹${depositAmount.toFixed(2)}`]
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
        const commissionLevels = await getCommissionLevels();

        for (const { level, rate } of commissionLevels) {
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
                'INSERT INTO transactions (user_id, type, amount, status, notes) VALUES (?, "commission", ?, "completed", ?)',
                [uplineUser.id, commission, `Level ${level} commission (${(rate * 100).toFixed(2)}%) from user #${tradingUserId}`]
            );

            // Move up the chain
            currentUserId = uplineUser.id;
        }
    } catch (error) {
        console.error('Commission processing error:', error);
    }
}
