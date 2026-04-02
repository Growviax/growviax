/**
 * Daily Salary IB (Introducing Broker) System
 * Fixed daily income based on team performance milestones.
 * 
 * Requirements:
 *  - Minimum 6 direct referrals required
 *  - "Active member" = user with minimum 200 total trades (bids)
 *  - 12 milestone tiers (admin-configurable via platform_settings)
 *  - IB credited to wallet + recorded in transactions & referral_earnings
 */
import { query, queryOne } from '@/lib/db';

const MIN_DEPOSIT_FOR_EARNINGS = 500; // Minimum total deposit required to earn IB salary
const MIN_DIRECT_REFERRALS = 6; // Minimum direct referrals to qualify for any IB tier
const MIN_TRADES_FOR_ACTIVE = 200; // Minimum total trades to be considered an "Active" member

// Helper: Check if user has minimum deposit to earn IB salary
async function hasMinimumDeposit(userId: number): Promise<boolean> {
    try {
        const result = await queryOne<{ total: number }>(
            `SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
             WHERE user_id = ? AND type = 'deposit' AND status = 'completed'`,
            [userId]
        );
        return (Number(result?.total) || 0) >= MIN_DEPOSIT_FOR_EARNINGS;
    } catch { return false; }
}

// Default IB salary tiers (matching client's milestone table — values in INR)
const DEFAULT_SALARY_TIERS = [
    { id: 1,  minDirect: 6, minActive: 6,     minDeposit: 12000,    dailySalary: 480 },
    { id: 2,  minDirect: 6, minActive: 18,    minDeposit: 36000,    dailySalary: 1260 },
    { id: 3,  minDirect: 6, minActive: 36,    minDeposit: 65000,    dailySalary: 2080 },
    { id: 4,  minDirect: 6, minActive: 46,    minDeposit: 120000,   dailySalary: 3840 },
    { id: 5,  minDirect: 6, minActive: 86,    minDeposit: 230000,   dailySalary: 7360 },
    { id: 6,  minDirect: 6, minActive: 186,   minDeposit: 350000,   dailySalary: 11200 },
    { id: 7,  minDirect: 6, minActive: 236,   minDeposit: 450000,   dailySalary: 14400 },
    { id: 8,  minDirect: 6, minActive: 386,   minDeposit: 750000,   dailySalary: 22500 },
    { id: 9,  minDirect: 6, minActive: 786,   minDeposit: 1250000,  dailySalary: 40000 },
    { id: 10, minDirect: 6, minActive: 1286,  minDeposit: 1850000,  dailySalary: 55500 },
    { id: 11, minDirect: 6, minActive: 2086,  minDeposit: 2850000,  dailySalary: 108300 },
    { id: 12, minDirect: 6, minActive: 3586,  minDeposit: 4050000,  dailySalary: 153900 },
];

interface SalaryTier {
    id: number;
    minDirect: number;
    minActive: number;
    minDeposit: number;
    dailySalary: number;
}

interface TeamStats {
    directMembers: number;
    activeMembers: number;
    totalDeposit: number;
}

/**
 * Load IB salary tiers from platform_settings (admin-configurable).
 * Falls back to DEFAULT_SALARY_TIERS if not set.
 */
async function getSalaryTiers(): Promise<SalaryTier[]> {
    try {
        const row = await queryOne<{ setting_value: string }>(
            'SELECT setting_value FROM platform_settings WHERE setting_key = ?',
            ['ib_salary_tiers']
        );
        if (row?.setting_value) {
            const parsed = JSON.parse(row.setting_value);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch { }
    return DEFAULT_SALARY_TIERS;
}

/**
 * Get team stats for a user
 */
async function getTeamStats(userId: number): Promise<TeamStats> {
    // Get direct referrals
    const user = await queryOne<any>('SELECT referral_code FROM users WHERE id = ?', [userId]);
    if (!user) return { directMembers: 0, activeMembers: 0, totalDeposit: 0 };

    const directResult = await query<any[]>(
        'SELECT COUNT(*) as count FROM users WHERE referred_by = ?',
        [user.referral_code]
    );
    const directMembers = directResult?.[0]?.count || 0;

    // Get total team members (all levels) - recursive through referral chain
    // Breadth-first search through referral codes
    const allTeamMemberIds: number[] = [];
    let currentCodes = [user.referral_code];

    for (let level = 0; level < 10 && currentCodes.length > 0; level++) {
        const placeholders = currentCodes.map(() => '?').join(',');
        const levelMembers = await query<any[]>(
            `SELECT id, referral_code FROM users WHERE referred_by IN (${placeholders})`,
            currentCodes
        );
        if (!levelMembers || levelMembers.length === 0) break;

        for (const m of levelMembers) {
            allTeamMemberIds.push(m.id);
        }
        currentCodes = levelMembers.map((m: any) => m.referral_code);
    }

    // Active members = those who have at least 200 total trades (bids)
    let activeMembers = 0;
    if (allTeamMemberIds.length > 0) {
        const idPlaceholders = allTeamMemberIds.map(() => '?').join(',');
        const activeResult = await query<any[]>(
            `SELECT COUNT(*) as count FROM (
                SELECT user_id FROM bids 
                WHERE user_id IN (${idPlaceholders}) 
                GROUP BY user_id 
                HAVING COUNT(*) >= ?
            ) as active_users`,
            [...allTeamMemberIds, MIN_TRADES_FOR_ACTIVE]
        );
        activeMembers = activeResult?.[0]?.count || 0;
    }

    // Total team deposit = sum of all deposits by team members
    let totalDeposit = 0;
    if (allTeamMemberIds.length > 0) {
        const idPlaceholders = allTeamMemberIds.map(() => '?').join(',');
        const depositResult = await query<any[]>(
            `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id IN (${idPlaceholders}) AND type = 'deposit' AND status = 'completed'`,
            allTeamMemberIds
        );
        totalDeposit = parseFloat(depositResult?.[0]?.total || 0);
    }

    return { directMembers, activeMembers, totalDeposit };
}

/**
 * Determine the highest qualifying salary tier for a user
 */
function getQualifyingTier(stats: TeamStats, tiers: SalaryTier[]) {
    let bestTier: SalaryTier | null = null;
    for (const tier of tiers) {
        if (
            stats.directMembers >= tier.minDirect &&
            stats.activeMembers >= tier.minActive &&
            stats.totalDeposit >= tier.minDeposit
        ) {
            bestTier = tier;
        }
    }
    return bestTier;
}

/**
 * Process daily salary for all qualifying users
 * Should be called once daily via cron or admin trigger
 */
export async function processDailySalaries(): Promise<{ processed: number; total: number }> {
    let processed = 0;
    let totalCredited = 0;

    try {
        // Load admin-configurable tiers
        const salaryTiers = await getSalaryTiers();

        // Get all users who have at least 6 direct referrals (minimum requirement)
        const potentialUsers = await query<any[]>(
            `SELECT u.id, u.referral_code, u.email, COUNT(r.id) as direct_count
             FROM users u
             LEFT JOIN users r ON r.referred_by = u.referral_code
             GROUP BY u.id, u.referral_code, u.email
             HAVING direct_count >= ?`,
            [MIN_DIRECT_REFERRALS]
        );

        if (!potentialUsers || potentialUsers.length === 0) {
            return { processed: 0, total: 0 };
        }

        for (const pu of potentialUsers) {
            // Check if user has minimum deposit (500) to earn IB salary
            const userHasMinDeposit = await hasMinimumDeposit(pu.id);
            if (!userHasMinDeposit) continue;

            // Check if already credited today
            try {
                const todayCheck = await queryOne<any>(
                    'SELECT id FROM daily_salary_log WHERE user_id = ? AND DATE(credited_at) = CURDATE()',
                    [pu.id]
                );
                if (todayCheck) continue; // Already credited today
            } catch {
                // Table might not exist
            }

            const stats = await getTeamStats(pu.id);
            const tier = getQualifyingTier(stats, salaryTiers);

            if (!tier) continue; // Not qualifying

            // Credit daily salary in INR directly to wallet
            const salaryAmount = tier.dailySalary;

            await query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [salaryAmount, pu.id]);

            // Log salary
            try {
                await query(
                    'INSERT INTO daily_salary_log (user_id, tier_id, amount) VALUES (?, ?, ?)',
                    [pu.id, tier.id, salaryAmount]
                );
            } catch {
                // Table might not exist
            }

            // Record in referral_earnings for unified income history
            try {
                await query(
                    'INSERT INTO referral_earnings (user_id, from_user_id, amount, type, level) VALUES (?, ?, ?, ?, ?)',
                    [pu.id, pu.id, salaryAmount, 'ib_bonus', null]
                );
            } catch { }

            // Record transaction with descriptive notes showing milestone details
            const tierNote = `IB Salary Credit - Tier ${tier.id} (${tier.minDirect} Direct, ${tier.minActive} Active, ₹${tier.minDeposit.toLocaleString()} Team Deposit) — ₹${salaryAmount.toLocaleString()}/day`;
            await query(
                'INSERT INTO transactions (user_id, type, amount, status, notes) VALUES (?, "ib_bonus", ?, "completed", ?)',
                [pu.id, salaryAmount, tierNote]
            );

            processed++;
            totalCredited += salaryAmount;
        }
    } catch (error) {
        console.error('Daily salary processing error:', error);
    }

    return { processed, total: totalCredited };
}

/**
 * Export default tiers for use in admin API
 */
export { DEFAULT_SALARY_TIERS };
export type { SalaryTier };
