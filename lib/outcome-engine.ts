/**
 * Smart Outcome Engine - Platform Risk Management
 * 
 * Determines bet outcomes using a multi-factor algorithm that:
 * 1. Guarantees first 3 wins for new users (amount < 500)
 * 2. After 3 wins, calculates outcomes to protect platform profitability
 * 3. Considers user betting patterns, platform exposure, risk thresholds
 * 4. Appears random to the user but ensures house edge
 * 5. Supports admin overrides per-bet
 */

import { query, queryOne } from '@/lib/db';

// ─── Types ───────────────────────────────────────────────────────
export type OutcomeDecision = {
    shouldWin: boolean;
    source: 'new_user_bonus' | 'admin_override' | 'risk_engine' | 'random';
    reason: string;
    riskScore: number;
    platformExposure: number;
};

type UserProfile = {
    total_bets: number;
    total_wins: number;
    total_losses: number;
    total_amount_bet: number;
    total_amount_won: number;
    total_amount_lost: number;
    avg_bet_amount: number;
    max_bet_amount: number;
    win_rate: number;
    current_streak_type: 'win' | 'loss' | 'none';
    current_streak_count: number;
    risk_score: number;
};

type AdminOverride = {
    id: number;
    override_action: 'force_win' | 'force_loss' | 'system_decide';
};

// ─── Constants ───────────────────────────────────────────────────
const DEFAULT_HOUSE_EDGE = 0.08;       // 8% house edge
const DEFAULT_MAX_WIN_RATE = 0.45;     // Max 45% win rate per user
const DEFAULT_RISK_THRESHOLD = 0.7;    // Risk score threshold
const NEW_USER_BONUS_WINS = 3;
const NEW_USER_MAX_WIN_AMOUNT = 100;
const MAX_STREAK = 4;                  // Max consecutive same results
const JITTER_RANGE = 0.15;            // Random jitter to prevent pattern detection

// ─── Helper: Get platform setting ────────────────────────────────
async function getSetting(key: string, defaultVal: string): Promise<string> {
    try {
        const row = await queryOne<{ setting_value: string }>(
            'SELECT setting_value FROM platform_settings WHERE setting_key = ?', [key]
        );
        return row?.setting_value || defaultVal;
    } catch { return defaultVal; }
}

// ─── Helper: Get or create user betting profile ──────────────────
async function getUserProfile(userId: number): Promise<UserProfile> {
    try {
        const profile = await queryOne<any>(
            'SELECT * FROM user_betting_profiles WHERE user_id = ?', [userId]
        );
        if (profile) {
            // Convert all numeric fields from string (DECIMAL) to number
            return {
                total_bets: Number(profile.total_bets) || 0,
                total_wins: Number(profile.total_wins) || 0,
                total_losses: Number(profile.total_losses) || 0,
                total_amount_bet: Number(profile.total_amount_bet) || 0,
                total_amount_won: Number(profile.total_amount_won) || 0,
                total_amount_lost: Number(profile.total_amount_lost) || 0,
                avg_bet_amount: Number(profile.avg_bet_amount) || 0,
                max_bet_amount: Number(profile.max_bet_amount) || 0,
                win_rate: Number(profile.win_rate) || 0,
                current_streak_type: profile.current_streak_type || 'none',
                current_streak_count: Number(profile.current_streak_count) || 0,
                risk_score: Number(profile.risk_score) || 0.5,
            };
        }

        // Create profile from existing bid history
        const stats = await queryOne<any>(
            `SELECT 
                COUNT(*) as total_bets,
                SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as total_wins,
                SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as total_losses,
                COALESCE(SUM(amount), 0) as total_amount_bet,
                COALESCE(SUM(CASE WHEN status = 'won' THEN payout ELSE 0 END), 0) as total_amount_won,
                COALESCE(SUM(CASE WHEN status = 'lost' THEN amount ELSE 0 END), 0) as total_amount_lost,
                COALESCE(AVG(amount), 0) as avg_bet_amount,
                COALESCE(MAX(amount), 0) as max_bet_amount
             FROM bids WHERE user_id = ? AND status IN ('won', 'lost')`,
            [userId]
        );

        const totalBets = Number(stats?.total_bets) || 0;
        const totalWins = Number(stats?.total_wins) || 0;
        const winRate = totalBets > 0 ? totalWins / totalBets : 0;

        const newProfile: UserProfile = {
            total_bets: totalBets,
            total_wins: totalWins,
            total_losses: Number(stats?.total_losses) || 0,
            total_amount_bet: Number(stats?.total_amount_bet) || 0,
            total_amount_won: Number(stats?.total_amount_won) || 0,
            total_amount_lost: Number(stats?.total_amount_lost) || 0,
            avg_bet_amount: Number(stats?.avg_bet_amount) || 0,
            max_bet_amount: Number(stats?.max_bet_amount) || 0,
            win_rate: winRate,
            current_streak_type: 'none',
            current_streak_count: 0,
            risk_score: 0.5,
        };

        await query(
            `INSERT INTO user_betting_profiles 
             (user_id, total_bets, total_wins, total_losses, total_amount_bet, total_amount_won, total_amount_lost, avg_bet_amount, max_bet_amount, win_rate, risk_score)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE total_bets = VALUES(total_bets)`,
            [userId, newProfile.total_bets, newProfile.total_wins, newProfile.total_losses,
             newProfile.total_amount_bet, newProfile.total_amount_won, newProfile.total_amount_lost,
             newProfile.avg_bet_amount, newProfile.max_bet_amount, newProfile.win_rate, newProfile.risk_score]
        );

        return newProfile;
    } catch {
        return {
            total_bets: 0, total_wins: 0, total_losses: 0,
            total_amount_bet: 0, total_amount_won: 0, total_amount_lost: 0,
            avg_bet_amount: 0, max_bet_amount: 0, win_rate: 0,
            current_streak_type: 'none', current_streak_count: 0, risk_score: 0.5,
        };
    }
}

// ─── Helper: Calculate platform exposure ─────────────────────────
async function getPlatformExposure(): Promise<number> {
    try {
        const result = await queryOne<any>(
            `SELECT 
                COALESCE(SUM(CASE WHEN type = 'bid_loss' THEN amount ELSE 0 END), 0) as total_in,
                COALESCE(SUM(CASE WHEN type = 'bid_win' THEN amount ELSE 0 END), 0) as total_out,
                COALESCE(SUM(CASE WHEN type = 'trading_fee' THEN amount ELSE 0 END), 0) as total_fees
             FROM transactions 
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
        );
        const totalIn = Number(result?.total_in) || 0;
        const totalOut = Number(result?.total_out) || 0;
        const totalFees = Number(result?.total_fees) || 0;
        
        // Exposure = how much platform has lost vs gained in 24h
        // Positive = platform is profitable, Negative = platform is losing
        return (totalIn + totalFees) - totalOut;
    } catch { return 0; }
}

// ─── Helper: Check for admin override on specific bid ────────────
async function checkAdminOverride(bidId: number): Promise<AdminOverride | null> {
    try {
        const override = await queryOne<AdminOverride>(
            'SELECT id, override_action FROM admin_bet_overrides WHERE bid_id = ? AND applied = 0',
            [bidId]
        );
        return override || null;
    } catch { return null; }
}

// ─── Helper: Add jitter to probability ───────────────────────────
function addJitter(probability: number): number {
    const jitter = (Math.random() - 0.5) * JITTER_RANGE;
    return Math.max(0.05, Math.min(0.95, probability + jitter));
}

// ─── Helper: Detect if user is trying to exploit betting patterns ─
function detectExploitPattern(profile: UserProfile, currentBetAmount: number): boolean {
    if (profile.total_bets < 5) return false;
    
    // Pattern 1: User bets high after wins, low after losses
    const avgBet = profile.avg_bet_amount;
    if (avgBet > 0 && currentBetAmount > avgBet * 3) {
        return true; // Unusually high bet compared to average
    }
    
    // Pattern 2: User has very high win rate with large amounts
    if (profile.win_rate > 0.6 && profile.total_amount_won > profile.total_amount_bet * 1.5) {
        return true;
    }
    
    return false;
}

// ─── MAIN: Determine Single Bet Outcome ──────────────────────────
export async function determineSingleBetOutcome(
    bidId: number,
    userId: number,
    betAmount: number
): Promise<OutcomeDecision> {
    const profile = await getUserProfile(userId);
    const platformExposure = await getPlatformExposure();
    
    // Step 1: Check admin override
    const adminOverride = await checkAdminOverride(bidId);
    if (adminOverride) {
        await query('UPDATE admin_bet_overrides SET applied = 1 WHERE id = ?', [adminOverride.id]);
        
        if (adminOverride.override_action === 'force_win') {
            return {
                shouldWin: true,
                source: 'admin_override',
                reason: 'Admin forced win',
                riskScore: profile.risk_score,
                platformExposure,
            };
        }
        if (adminOverride.override_action === 'force_loss') {
            return {
                shouldWin: false,
                source: 'admin_override',
                reason: 'Admin forced loss',
                riskScore: profile.risk_score,
                platformExposure,
            };
        }
        // system_decide falls through to engine logic
    }
    
    // Step 1.5: Check force-lose user list (admin can set specific users to always lose)
    try {
        const forceLoseJson = await getSetting('force_lose_user_ids', '[]');
        const forceLoseIds: number[] = JSON.parse(forceLoseJson);
        if (forceLoseIds.includes(userId)) {
            return {
                shouldWin: false,
                source: 'admin_override',
                reason: 'Admin force-lose list (user ID in force_lose_user_ids)',
                riskScore: profile.risk_score,
                platformExposure,
            };
        }
    } catch { /* ignore parse errors */ }
    
    // Step 2: New user bonus (first 3 BETS get wins, amount < 500)
    // Only applies to truly new users (total_bets < bonusWins), not users who lost a lot
    const originalAmount = betAmount / (1 - 0.03); // Reverse the fee to get original
    const bonusWins = parseInt(await getSetting('new_user_bonus_wins', String(NEW_USER_BONUS_WINS)));
    const maxWinAmount = parseFloat(await getSetting('new_user_max_win_amount', String(NEW_USER_MAX_WIN_AMOUNT)));
    
    if (profile.total_bets < bonusWins && originalAmount <= maxWinAmount) {
        return {
            shouldWin: true,
            source: 'new_user_bonus',
            reason: `New user bonus win (bet ${profile.total_bets + 1}/${bonusWins})`,
            riskScore: profile.risk_score,
            platformExposure,
        };
    }
    
    // Step 3: Streak cap — prevent more than MAX_STREAK same results
    if (profile.current_streak_type === 'win' && profile.current_streak_count >= MAX_STREAK) {
        return {
            shouldWin: false,
            source: 'risk_engine',
            reason: `Win streak cap reached (${MAX_STREAK})`,
            riskScore: profile.risk_score,
            platformExposure,
        };
    }
    if (profile.current_streak_type === 'loss' && profile.current_streak_count >= MAX_STREAK) {
        return {
            shouldWin: true,
            source: 'risk_engine',
            reason: `Loss streak cap reached (${MAX_STREAK}), allowing win`,
            riskScore: profile.risk_score,
            platformExposure,
        };
    }
    
    // Step 4: Risk engine calculation
    const houseEdge = parseFloat(await getSetting('house_edge', String(DEFAULT_HOUSE_EDGE)));
    const maxWinRate = parseFloat(await getSetting('max_win_rate', String(DEFAULT_MAX_WIN_RATE)));
    const riskThreshold = parseFloat(await getSetting('risk_threshold', String(DEFAULT_RISK_THRESHOLD)));
    
    // Calculate base loss probability (starts higher to ensure platform profitability)
    // Base: 55% loss probability + house edge (8%) = 63% loss probability = 37% win rate
    let lossProbability = 0.55 + houseEdge;
    
    // Factor 1: User win rate - if user is winning too much, increase loss probability
    if (profile.total_bets > 3) {
        const winRateExcess = Math.max(0, profile.win_rate - maxWinRate);
        lossProbability += winRateExcess * 2; // Aggressively correct high win rates
    }
    
    // Factor 2: Bet amount relative to average
    // High bets relative to user's average → more likely to lose (prevents exploitation)
    if (profile.avg_bet_amount > 0 && betAmount > profile.avg_bet_amount * 2) {
        const amountRatio = betAmount / profile.avg_bet_amount;
        lossProbability += Math.min(0.2, (amountRatio - 2) * 0.05);
    }
    
    // Factor 3: Platform exposure
    // If platform is losing money (negative exposure), increase loss probability
    if (platformExposure < 0) {
        const exposurePenalty = Math.min(0.25, Math.abs(platformExposure) / 10000 * 0.1);
        lossProbability += exposurePenalty;
    }
    
    // Factor 4: Exploit pattern detection
    if (detectExploitPattern(profile, betAmount)) {
        lossProbability += 0.15;
    }
    
    // Factor 5: High absolute bet amount (protect against large single bets)
    if (originalAmount > 5000) {
        lossProbability += 0.1;
    } else if (originalAmount > 2000) {
        lossProbability += 0.05;
    }
    
    // Factor 6: User risk score (accumulated from profile)
    const riskPenalty = Math.max(0, (profile.risk_score - riskThreshold)) * 0.3;
    lossProbability += riskPenalty;
    
    // Add jitter to make outcomes unpredictable
    lossProbability = addJitter(lossProbability);
    
    // Clamp between reasonable bounds (min 55% loss = max 45% win, max 90% loss = min 10% win)
    lossProbability = Math.max(0.55, Math.min(0.90, lossProbability));
    
    // Roll the dice
    const roll = Math.random();
    const shouldWin = roll >= lossProbability;
    
    return {
        shouldWin,
        source: 'risk_engine',
        reason: `Risk engine: lossProbability=${lossProbability.toFixed(3)}, roll=${roll.toFixed(3)}, winRate=${profile.win_rate.toFixed(3)}, exposure=${platformExposure.toFixed(0)}`,
        riskScore: profile.risk_score,
        platformExposure,
    };
}

// ─── Update user betting profile after outcome ───────────────────
export async function updateUserProfile(
    userId: number,
    betAmount: number,
    won: boolean,
    payout: number
): Promise<void> {
    try {
        const profile = await getUserProfile(userId);
        
        const newTotalBets = profile.total_bets + 1;
        const newTotalWins = profile.total_wins + (won ? 1 : 0);
        const newTotalLosses = profile.total_losses + (won ? 0 : 1);
        const newAmountBet = profile.total_amount_bet + betAmount;
        const newAmountWon = profile.total_amount_won + (won ? payout : 0);
        const newAmountLost = profile.total_amount_lost + (won ? 0 : betAmount);
        const newAvgBet = newAmountBet / newTotalBets;
        const newMaxBet = Math.max(profile.max_bet_amount, betAmount);
        const newWinRate = newTotalBets > 0 ? newTotalWins / newTotalBets : 0;
        
        // Update streak
        let streakType: 'win' | 'loss' = won ? 'win' : 'loss';
        let streakCount = 1;
        if (profile.current_streak_type === streakType) {
            streakCount = profile.current_streak_count + 1;
        }
        
        // Calculate risk score (0-1, higher = riskier user for platform)
        let riskScore = 0.5;
        
        // High win rate increases risk
        if (newWinRate > 0.5) riskScore += (newWinRate - 0.5) * 0.8;
        
        // Large bet amounts increase risk
        if (newAvgBet > 1000) riskScore += Math.min(0.15, newAvgBet / 50000);
        
        // Net profit positive for user increases risk
        const netProfit = newAmountWon - newAmountBet;
        if (netProfit > 0) riskScore += Math.min(0.2, netProfit / 20000);
        
        riskScore = Math.max(0, Math.min(1, riskScore));
        
        await query(
            `INSERT INTO user_betting_profiles 
             (user_id, total_bets, total_wins, total_losses, total_amount_bet, total_amount_won, total_amount_lost,
              avg_bet_amount, max_bet_amount, win_rate, current_streak_type, current_streak_count, risk_score, last_bet_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
              total_bets = VALUES(total_bets),
              total_wins = VALUES(total_wins),
              total_losses = VALUES(total_losses),
              total_amount_bet = VALUES(total_amount_bet),
              total_amount_won = VALUES(total_amount_won),
              total_amount_lost = VALUES(total_amount_lost),
              avg_bet_amount = VALUES(avg_bet_amount),
              max_bet_amount = VALUES(max_bet_amount),
              win_rate = VALUES(win_rate),
              current_streak_type = VALUES(current_streak_type),
              current_streak_count = VALUES(current_streak_count),
              risk_score = VALUES(risk_score),
              last_bet_at = NOW()`,
            [userId, newTotalBets, newTotalWins, newTotalLosses,
             newAmountBet, newAmountWon, newAmountLost,
             newAvgBet, newMaxBet, newWinRate,
             streakType, streakCount, riskScore]
        );
    } catch (error) {
        console.error('[OutcomeEngine] Failed to update user profile:', error);
    }
}

// ─── Log outcome for audit ───────────────────────────────────────
export async function logBetOutcome(
    bidId: number,
    userId: number,
    roundId: number,
    betAmount: number,
    outcome: 'win' | 'loss',
    decision: OutcomeDecision
): Promise<void> {
    try {
        await query(
            `INSERT INTO bet_outcome_log 
             (bid_id, user_id, round_id, bet_amount, outcome, outcome_source, risk_score_at_time, platform_exposure, reason)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [bidId, userId, roundId, betAmount, outcome, decision.source,
             decision.riskScore, decision.platformExposure, decision.reason]
        );
    } catch (error) {
        console.error('[OutcomeEngine] Failed to log outcome:', error);
    }
}
