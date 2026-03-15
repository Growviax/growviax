import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { query, queryOne } from '@/lib/db';

// Helper: get a platform setting
async function getSetting(key: string): Promise<string> {
    const row = await queryOne<any>('SELECT setting_value FROM platform_settings WHERE setting_key = ?', [key]);
    return row?.setting_value || '';
}

// Helper: set a platform setting
async function setSetting(key: string, value: string): Promise<void> {
    await query(
        'INSERT INTO platform_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, value, value]
    );
}

// Default commission levels
const DEFAULT_COMMISSION_LEVELS = [
    { level: 1, rate: 0.0081 },
    { level: 2, rate: 0.0035 },
    { level: 3, rate: 0.0017 },
    { level: 4, rate: 0.0010 },
    { level: 5, rate: 0.0007 },
    { level: 6, rate: 0.0004 },
];

// GET: Fetch referral and commission settings
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const referralBonusRate = parseFloat(await getSetting('referral_bonus_rate') || '0.03');
        const commissionLevelsJson = await getSetting('commission_levels');
        let commissionLevels = DEFAULT_COMMISSION_LEVELS;
        
        try {
            if (commissionLevelsJson) {
                commissionLevels = JSON.parse(commissionLevelsJson);
            }
        } catch { }

        // Get referral stats
        const stats = await queryOne<any>(`
            SELECT 
                COUNT(DISTINCT re.user_id) as total_referrers,
                COUNT(*) as total_referral_transactions,
                COALESCE(SUM(re.amount), 0) as total_referral_paid
            FROM referral_earnings re
        `) || { total_referrers: 0, total_referral_transactions: 0, total_referral_paid: 0 };

        const commissionStats = await queryOne<any>(`
            SELECT 
                COUNT(*) as total_commission_transactions,
                COALESCE(SUM(commission_amount), 0) as total_commission_paid
            FROM commission_history
        `) || { total_commission_transactions: 0, total_commission_paid: 0 };

        return NextResponse.json({
            settings: {
                referralBonusRate,
                commissionLevels,
            },
            stats: {
                totalReferrers: stats.total_referrers || 0,
                totalReferralTransactions: stats.total_referral_transactions || 0,
                totalReferralPaid: parseFloat(stats.total_referral_paid || 0),
                totalCommissionTransactions: commissionStats.total_commission_transactions || 0,
                totalCommissionPaid: parseFloat(commissionStats.total_commission_paid || 0),
            },
        });
    } catch (error: any) {
        console.error('Referral settings GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH: Update referral and commission settings
export async function PATCH(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { referralBonusRate, commissionLevels } = body;

        if (referralBonusRate !== undefined) {
            const rate = parseFloat(referralBonusRate);
            if (isNaN(rate) || rate < 0 || rate > 1) {
                return NextResponse.json({ error: 'Invalid referral bonus rate (must be 0-1)' }, { status: 400 });
            }
            await setSetting('referral_bonus_rate', String(rate));
        }

        if (commissionLevels !== undefined) {
            if (!Array.isArray(commissionLevels)) {
                return NextResponse.json({ error: 'Commission levels must be an array' }, { status: 400 });
            }
            // Validate each level
            for (const lvl of commissionLevels) {
                if (typeof lvl.level !== 'number' || typeof lvl.rate !== 'number') {
                    return NextResponse.json({ error: 'Each commission level must have level and rate' }, { status: 400 });
                }
                if (lvl.rate < 0 || lvl.rate > 1) {
                    return NextResponse.json({ error: 'Commission rate must be 0-1' }, { status: 400 });
                }
            }
            await setSetting('commission_levels', JSON.stringify(commissionLevels));
        }

        // Log admin action
        await query(
            `INSERT INTO admin_activity_log (admin_id, action_type, target_type, details)
             VALUES (?, 'update_settings', 'referral_settings', ?)`,
            [user.id, JSON.stringify({ referralBonusRate, commissionLevels })]
        );

        return NextResponse.json({ message: 'Referral settings updated' });
    } catch (error: any) {
        console.error('Referral settings PATCH error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
