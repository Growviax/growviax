import { NextResponse } from 'next/server';
import { getCurrentFDUser } from '@/lib/fd-user';
import { query, queryOne } from '@/lib/db';
import { getFDPackageName, getFDSettings, toUsdt } from '@/lib/fd-config';
import { syncFDInvestmentsForUser } from '@/lib/fd-earnings';

export async function GET() {
    try {
        const user = await getCurrentFDUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        await syncFDInvestmentsForUser(user.id);

        const settings = await getFDSettings();

        const [freshUser, fdDeposits, profitLogs, referralCount] = await Promise.all([
            queryOne<any>('SELECT wallet_balance, referral_code FROM fd_users WHERE id = ?', [user.id]),
            query<any[]>(
                `SELECT * FROM fd_deposits
                 WHERE user_id = ?
                 ORDER BY created_at DESC`,
                [user.id]
            ),
            query<any[]>(
                `SELECT pl.*, fd.amount as fd_amount
                 FROM fd_profit_logs pl
                 JOIN fd_deposits fd ON pl.fd_deposit_id = fd.id
                 WHERE pl.user_id = ?
                 ORDER BY pl.credited_at DESC`,
                [user.id]
            ),
            queryOne<any>(
                'SELECT COUNT(*) as total FROM fd_users WHERE referred_by = ?',
                [user.referral_code]
            ),
        ]);

        let referralEarnings: any[] = [];
        try {
            referralEarnings = await query<any[]>(
                `SELECT fre.*, fu.name as from_user_name
                 FROM fd_referral_earnings fre
                 LEFT JOIN fd_users fu ON fre.from_user_id = fu.id
                 WHERE fre.user_id = ?
                 ORDER BY fre.created_at DESC`,
                [user.id]
            );
        } catch (referralError) {
            console.error('FD dashboard referral earnings error:', referralError);
        }

        const enrichedDeposits = (fdDeposits || []).map((fd) => ({
            ...fd,
            amount_usdt: toUsdt(Number(fd.amount || 0), settings.usdtRate),
            package_name: getFDPackageName(Number(fd.amount || 0), Number(fd.monthly_rate || 0), settings),
        }));

        const totalInvested = enrichedDeposits.reduce((sum, fd) => sum + Number(fd.amount || 0), 0);
        const totalMonthlyEarned = (profitLogs || []).reduce((sum, log) => sum + Number(log.amount || 0), 0);
        const totalReferralBonus = (referralEarnings || [])
            .filter((earning) => earning.type === 'referral_bonus')
            .reduce((sum, earning) => sum + Number(earning.amount || 0), 0);
        const totalLiquidityBonus = (referralEarnings || [])
            .filter((earning) => earning.type === 'liquidity_bonus')
            .reduce((sum, earning) => sum + Number(earning.amount || 0), 0);

        const activeFDs = enrichedDeposits.filter((fd) => fd.status === 'active');
        const completedFDs = enrichedDeposits.filter((fd) => fd.status === 'completed');

        return NextResponse.json({
            wallet_balance: Number(freshUser?.wallet_balance || 0),
            wallet_balance_usdt: toUsdt(Number(freshUser?.wallet_balance || 0), settings.usdtRate),
            summary: {
                totalInvested,
                totalMonthlyEarned,
                totalReferralBonus,
                totalLiquidityBonus,
                totalEarned: totalMonthlyEarned + totalReferralBonus + totalLiquidityBonus,
                activeFDCount: activeFDs.length,
                completedFDCount: completedFDs.length,
                directReferralCount: Number(referralCount?.total || 0),
                usdtRate: settings.usdtRate,
                lockMonths: settings.lockMonths,
            },
            fdDeposits: enrichedDeposits,
            profitLogs,
            referralEarnings,
        });
    } catch (error: any) {
        console.error('FD Dashboard API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
