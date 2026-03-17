/**
 * Daily Salary IB (Introducing Broker) System
 * Fixed daily income based on team performance targets.
 */
import { query, queryOne } from '@/lib/db';

const MIN_DEPOSIT_FOR_EARNINGS = 500; // Minimum total deposit required to earn IB salary

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

// Salary tiers definition
const SALARY_TIERS = [
    { id: 1, minDirect: 5, minActive: 15, minDeposit: 30000, dailySalary: 800 },
    { id: 2, minDirect: 5, minActive: 30, minDeposit: 60000, dailySalary: 1600 },
    { id: 3, minDirect: 5, minActive: 50, minDeposit: 100000, dailySalary: 3000 },
    { id: 4, minDirect: 5, minActive: 100, minDeposit: 200000, dailySalary: 6000 },
    { id: 5, minDirect: 5, minActive: 150, minDeposit: 300000, dailySalary: 10000 },
    { id: 6, minDirect: 5, minActive: 300, minDeposit: 500000, dailySalary: 20000 },
];

interface TeamStats {
    directMembers: number;
    activeMembers: number;
    totalDeposit: number;
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
    // For simplicity, we use a breadth-first search through referral codes
    const allTeamMemberIds: number[] = [];
    let currentCodes = [user.referral_code];

    for (let level = 0; level < 6 && currentCodes.length > 0; level++) {
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

    // Active members = those who have traded in the last 7 days
    let activeMembers = 0;
    if (allTeamMemberIds.length > 0) {
        const idPlaceholders = allTeamMemberIds.map(() => '?').join(',');
        const activeResult = await query<any[]>(
            `SELECT COUNT(DISTINCT user_id) as count FROM bids WHERE user_id IN (${idPlaceholders}) AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
            allTeamMemberIds
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
function getQualifyingTier(stats: TeamStats) {
    let bestTier = null;
    for (const tier of SALARY_TIERS) {
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
 * Should be called once daily via cron
 */
export async function processDailySalaries(): Promise<{ processed: number; total: number }> {
    let processed = 0;
    let totalCredited = 0;

    try {
        // Get all users who have at least 5 direct referrals (minimum requirement)
        const potentialUsers = await query<any[]>(
            `SELECT u.id, u.referral_code, u.email, COUNT(r.id) as direct_count
             FROM users u
             LEFT JOIN users r ON r.referred_by = u.referral_code
             GROUP BY u.id, u.referral_code, u.email
             HAVING direct_count >= 5`
        );

        if (!potentialUsers || potentialUsers.length === 0) {
            return { processed: 0, total: 0 };
        }

        for (const pu of potentialUsers) {
            // Check if user has minimum deposit (500) to earn IB salary
            const userHasMinDeposit = await hasMinimumDeposit(pu.id);
            if (!userHasMinDeposit) continue; // User hasn't deposited minimum 500 yet

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
            const tier = getQualifyingTier(stats);

            if (!tier) continue; // Not qualifying

            // Credit daily salary (in INR, stored as USD equivalent at ~83 rate)
            const salaryUSD = Math.round((tier.dailySalary / 83) * 100) / 100;

            await query('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [salaryUSD, pu.id]);

            // Log salary
            try {
                await query(
                    'INSERT INTO daily_salary_log (user_id, tier_id, amount) VALUES (?, ?, ?)',
                    [pu.id, tier.id, tier.dailySalary]
                );
            } catch {
                // Table might not exist
            }

            // Record transaction
            await query(
                'INSERT INTO transactions (user_id, type, amount, status, notes) VALUES (?, "referral_bonus", ?, "completed", ?)',
                [pu.id, salaryUSD, `Daily IB Salary - Tier ${tier.id} (₹${tier.dailySalary})`]
            );

            processed++;
            totalCredited += salaryUSD;
        }
    } catch (error) {
        console.error('Daily salary processing error:', error);
    }

    return { processed, total: totalCredited };
}
