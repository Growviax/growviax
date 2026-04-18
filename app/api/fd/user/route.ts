import { NextResponse } from 'next/server';
import { getCurrentFDUser } from '@/lib/fd-user';
import { queryOne } from '@/lib/db';
import { getFDSettings, toUsdt } from '@/lib/fd-config';
import { syncFDInvestmentsForUser } from '@/lib/fd-earnings';

export async function GET() {
    try {
        const user = await getCurrentFDUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        await syncFDInvestmentsForUser(user.id);

        const freshUser = await getCurrentFDUser();
        if (!freshUser) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const settings = await getFDSettings();

        const directReferralCount = await queryOne<any>(
            'SELECT COUNT(*) as total FROM fd_users WHERE referred_by = ?',
            [freshUser.referral_code]
        );

        let referralTotals: any = { referral_bonus: 0, liquidity_bonus: 0 };
        try {
            referralTotals = await queryOne<any>(
                `SELECT
                    COALESCE(SUM(CASE WHEN type = 'referral_bonus' THEN amount ELSE 0 END), 0) as referral_bonus,
                    COALESCE(SUM(CASE WHEN type = 'liquidity_bonus' THEN amount ELSE 0 END), 0) as liquidity_bonus
                 FROM fd_referral_earnings
                 WHERE user_id = ?`,
                [freshUser.id]
            ) || referralTotals;
        } catch (referralError) {
            console.error('FD user referral totals error:', referralError);
        }

        return NextResponse.json({
            user: {
                id: freshUser.id,
                name: freshUser.name,
                email: freshUser.email,
                phone: freshUser.phone,
                wallet_balance: freshUser.wallet_balance,
                wallet_balance_usdt: toUsdt(Number(freshUser.wallet_balance || 0), settings.usdtRate),
                total_deposited: freshUser.total_deposited,
                referral_code: freshUser.referral_code,
                referred_by: freshUser.referred_by,
                role: freshUser.role,
                created_at: freshUser.created_at,
                direct_referrals: Number(directReferralCount?.total || 0),
                total_referral_bonus: Number(referralTotals?.referral_bonus || 0),
                total_liquidity_bonus: Number(referralTotals?.liquidity_bonus || 0),
            },
            settings: {
                usdtRate: settings.usdtRate,
                lockMonths: settings.lockMonths,
                referralBonusRate: settings.referralBonusRate,
                liquidityBonusRate: settings.liquidityBonusRate,
                starterMinUsdt: settings.starterMinUsdt,
                starterMaxUsdt: settings.starterMaxUsdt,
                starterMonthlyRate: settings.starterMonthlyRate,
                eliteMinUsdt: settings.eliteMinUsdt,
                eliteMonthlyRate: settings.eliteMonthlyRate,
            },
        });
    } catch (error: any) {
        console.error('FD User API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
