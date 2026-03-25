import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import dayjs from 'dayjs';

export async function GET() {
    try {
        const distributions = await query<any[]>(
            'SELECT * FROM fd_profit_distributions ORDER BY created_at DESC LIMIT 50'
        );

        // Get some stats
        const totalDistributed = await queryOne<any>(
            "SELECT COALESCE(SUM(pool_amount), 0) as total FROM fd_profit_distributions WHERE status = 'distributed'"
        );

        const eligibleUsers = await query<any[]>(
            `SELECT fu.id, fu.name, fu.email, fu.wallet_balance, fu.profit_sharing_enabled,
             fd.id as fd_id, fd.amount as fd_amount, fd.phase, fd.profit_sharing_expiry
             FROM fd_users fu 
             JOIN fd_deposits fd ON fu.id = fd.user_id 
             WHERE fu.profit_sharing_enabled = 1 
             AND fu.is_blocked = 0
             AND (fd.phase = 'phase2_sharing' OR fd.phase = 'phase1_completed')
             AND fd.profit_sharing_expiry > NOW()
             ORDER BY fd.amount DESC`
        );

        return NextResponse.json({
            distributions,
            totalDistributed: totalDistributed?.total || 0,
            eligibleUsers,
            eligibleCount: eligibleUsers.length,
        });
    } catch (error: any) {
        console.error('Admin FD profit GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { companyProfit, distributionPercentage, adminNotes } = body;

        if (!companyProfit || companyProfit <= 0) return NextResponse.json({ error: 'Company profit must be positive' }, { status: 400 });
        if (!distributionPercentage || distributionPercentage <= 0 || distributionPercentage > 100) return NextResponse.json({ error: 'Distribution percentage must be 1-100' }, { status: 400 });

        const poolAmount = (companyProfit * distributionPercentage) / 100;
        const distributionMonth = dayjs().format('YYYY-MM');

        // Get eligible users with their last FD amount
        const eligibleUsers = await query<any[]>(
            `SELECT fu.id as user_id, fd.id as fd_id, fd.amount as fd_amount
             FROM fd_users fu 
             JOIN fd_deposits fd ON fu.id = fd.user_id 
             WHERE fu.profit_sharing_enabled = 1 
             AND fu.is_blocked = 0
             AND (fd.phase = 'phase2_sharing' OR fd.phase = 'phase1_completed')
             AND fd.profit_sharing_expiry > NOW()
             ORDER BY fd.id DESC`
        );

        if (eligibleUsers.length === 0) {
            return NextResponse.json({ error: 'No eligible users for profit sharing' }, { status: 400 });
        }

        // Group by user, take last FD amount
        const userMap = new Map<number, { userId: number; fdId: number; fdAmount: number }>();
        for (const eu of eligibleUsers) {
            if (!userMap.has(eu.user_id)) {
                userMap.set(eu.user_id, { userId: eu.user_id, fdId: eu.fd_id, fdAmount: Number(eu.fd_amount) });
            }
        }

        const eligibleList = Array.from(userMap.values());
        const totalEligibleInvestment = eligibleList.reduce((sum, u) => sum + u.fdAmount, 0);

        if (totalEligibleInvestment === 0) {
            return NextResponse.json({ error: 'Total eligible investment is zero' }, { status: 400 });
        }

        // Create distribution record
        const distResult = await query<any>(
            `INSERT INTO fd_profit_distributions (company_profit, distribution_percentage, pool_amount, eligible_users_count, total_eligible_investment, distribution_month, status, distributed_at, admin_notes) 
             VALUES (?, ?, ?, ?, ?, ?, 'distributed', NOW(), ?)`,
            [companyProfit, distributionPercentage, poolAmount, eligibleList.length, totalEligibleInvestment, distributionMonth, adminNotes || null]
        );

        const distributionId = distResult.insertId;

        // Distribute to each user
        let totalCredited = 0;
        for (const user of eligibleList) {
            const sharePercentage = (user.fdAmount / totalEligibleInvestment) * 100;
            const shareAmount = (user.fdAmount / totalEligibleInvestment) * poolAmount;

            // Record share
            await query(
                `INSERT INTO fd_user_profit_shares (distribution_id, user_id, fd_deposit_id, investment_amount, share_percentage, amount) VALUES (?, ?, ?, ?, ?, ?)`,
                [distributionId, user.userId, user.fdId, user.fdAmount, sharePercentage, shareAmount]
            );

            // Credit to wallet
            await query('UPDATE fd_users SET wallet_balance = wallet_balance + ? WHERE id = ?', [shareAmount, user.userId]);

            // Record transaction
            await query(
                `INSERT INTO fd_transactions (user_id, type, amount, status, notes) VALUES (?, 'profit_share', ?, 'completed', ?)`,
                [user.userId, shareAmount, `Profit sharing for ${distributionMonth}: ₹${shareAmount.toFixed(2)} (${sharePercentage.toFixed(2)}% share)`]
            );

            totalCredited += shareAmount;
        }

        return NextResponse.json({
            message: `Profit shared successfully! ₹${totalCredited.toFixed(2)} distributed to ${eligibleList.length} users.`,
            distribution: {
                id: distributionId,
                poolAmount,
                eligibleUsers: eligibleList.length,
                totalCredited,
            },
        });
    } catch (error: any) {
        console.error('Admin FD profit POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
