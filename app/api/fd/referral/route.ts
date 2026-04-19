import { NextResponse } from 'next/server';
import { getCurrentFDUser } from '@/lib/fd-user';
import { query } from '@/lib/db';

// GET: FD referral data — team, earnings, stats
export async function GET() {
    try {
        const user = await getCurrentFDUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Direct referrals (team members)
        const teamMembers = await query<any[]>(
            `SELECT
                u.id,
                u.name,
                u.email,
                u.created_at,
                COALESCE(u.total_deposited, 0) as total_deposited,
                COALESCE(
                    (SELECT SUM(fd.amount) FROM fd_deposits fd WHERE fd.user_id = u.id AND fd.status IN ('active', 'completed')), 0
                ) as total_invested
             FROM fd_users u
             WHERE u.referred_by = ?
             ORDER BY u.created_at DESC`,
            [user.referral_code]
        );

        // Referral earnings
        let earnings: any[] = [];
        try {
            earnings = await query<any[]>(
                `SELECT fre.*, fu.name as from_user_name
                 FROM fd_referral_earnings fre
                 LEFT JOIN fd_users fu ON fre.from_user_id = fu.id
                 WHERE fre.user_id = ?
                 ORDER BY fre.created_at DESC`,
                [user.id]
            );
        } catch (err) {
            console.error('FD referral earnings query error:', err);
        }

        const referralBonus = (earnings || [])
            .filter((e) => e.type === 'referral_bonus')
            .reduce((sum, e) => sum + Number(e.amount || 0), 0);

        const liquidityBonus = (earnings || [])
            .filter((e) => e.type === 'liquidity_bonus')
            .reduce((sum, e) => sum + Number(e.amount || 0), 0);

        const totalIncome = referralBonus + liquidityBonus;

        return NextResponse.json({
            referral_code: user.referral_code,
            teamMembers: (teamMembers || []).map((m) => ({
                id: m.id,
                name: m.name,
                email: m.email,
                joinedAt: m.created_at,
                totalDeposited: parseFloat(m.total_deposited) || 0,
                totalInvested: parseFloat(m.total_invested) || 0,
                hasInvested: parseFloat(m.total_invested) > 0,
            })),
            earnings: earnings || [],
            stats: {
                totalTeam: teamMembers?.length || 0,
                referralBonus: Math.round(referralBonus * 100) / 100,
                liquidityBonus: Math.round(liquidityBonus * 100) / 100,
                totalIncome: Math.round(totalIncome * 100) / 100,
            },
        });
    } catch (error: any) {
        console.error('FD Referral API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
