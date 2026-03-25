import { NextResponse } from 'next/server';
import { getCurrentFDUser } from '@/lib/fd-user';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const user = await getCurrentFDUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Get all FD deposits for user
        const fdDeposits = await query<any[]>(
            `SELECT * FROM fd_deposits WHERE user_id = ? ORDER BY created_at DESC`,
            [user.id]
        );

        // Get Phase 1 profit logs
        const profitLogs = await query<any[]>(
            `SELECT pl.*, fd.amount as fd_amount FROM fd_profit_logs pl 
             JOIN fd_deposits fd ON pl.fd_deposit_id = fd.id 
             WHERE pl.user_id = ? ORDER BY pl.credited_at DESC`,
            [user.id]
        );

        // Get profit sharing earnings
        const profitShares = await query<any[]>(
            `SELECT ups.*, fpd.distribution_month, fpd.company_profit, fpd.distribution_percentage 
             FROM fd_user_profit_shares ups 
             JOIN fd_profit_distributions fpd ON ups.distribution_id = fpd.id 
             WHERE ups.user_id = ? ORDER BY ups.created_at DESC`,
            [user.id]
        );

        // Calculate summaries
        const totalInvested = fdDeposits.reduce((sum: number, fd: any) => sum + Number(fd.amount), 0);
        const totalPhase1Earned = profitLogs.reduce((sum: number, pl: any) => sum + Number(pl.amount), 0);
        const totalProfitShareEarned = profitShares.reduce((sum: number, ps: any) => sum + Number(ps.amount), 0);
        const activeFDs = fdDeposits.filter((fd: any) => fd.status === 'active');
        const completedFDs = fdDeposits.filter((fd: any) => fd.status === 'completed' || fd.phase === 'phase1_completed' || fd.phase === 'phase2_sharing');

        // Find latest profit share
        const lastMonthProfit = profitShares.length > 0 ? Number(profitShares[0].amount) : 0;

        // Find eligible sharing deposits
        const eligibleSharing = fdDeposits.filter((fd: any) =>
            (fd.phase === 'phase2_sharing' || fd.phase === 'phase1_completed') &&
            fd.profit_sharing_expiry && new Date(fd.profit_sharing_expiry) > new Date()
        );

        return NextResponse.json({
            wallet_balance: user.wallet_balance,
            summary: {
                totalInvested,
                totalPhase1Earned,
                totalProfitShareEarned,
                totalEarned: totalPhase1Earned + totalProfitShareEarned,
                activeFDCount: activeFDs.length,
                completedFDCount: completedFDs.length,
                lastMonthProfit,
                eligibleSharingCount: eligibleSharing.length,
            },
            fdDeposits,
            profitLogs,
            profitShares,
        });
    } catch (error: any) {
        console.error('FD Dashboard API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
