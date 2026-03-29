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

// GET: Fetch all settings + live trading data
export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const duration = searchParams.get('duration') || '7d'; // today, 7d, 30d, all

        // Fetch settings
        const settings = {
            trade_mode: await getSetting('trade_mode') || 'auto',
            manual_winner: await getSetting('manual_winner') || '',
            consecutive_up_wins: parseInt(await getSetting('consecutive_up_wins') || '0'),
            consecutive_down_wins: parseInt(await getSetting('consecutive_down_wins') || '0'),
            force_lose_user_ids: await getSetting('force_lose_user_ids') || '[]',
        };

        // Live data: active rounds + amounts
        const activeRounds = await query<any[]>(
            `SELECT coin_id, total_up_amount, total_down_amount, total_up_users, total_down_users, end_time
             FROM bid_rounds WHERE status = 'open' AND end_time > NOW()`
        ) || [];

        const liveUpAmount = activeRounds.reduce((s, r) => s + parseFloat(r.total_up_amount || 0), 0);
        const liveDownAmount = activeRounds.reduce((s, r) => s + parseFloat(r.total_down_amount || 0), 0);
        const liveUpUsers = activeRounds.reduce((s, r) => s + (r.total_up_users || 0), 0);
        const liveDownUsers = activeRounds.reduce((s, r) => s + (r.total_down_users || 0), 0);

        // Active unique players (users with pending bids in open rounds)
        const activePlayersResult = await queryOne<any>(
            `SELECT COUNT(DISTINCT b.user_id) as count FROM bids b
             JOIN bid_rounds br ON b.round_id = br.id
             WHERE br.status = 'open' AND br.end_time > NOW() AND b.status = 'pending'`
        );
        const activePlayers = activePlayersResult?.count || 0;

        // P&L data based on duration
        let dateFilter = '';
        if (duration === 'today') dateFilter = "AND t.created_at >= CURDATE()";
        else if (duration === '7d') dateFilter = "AND t.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        else if (duration === '30d') dateFilter = "AND t.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";

        // Total bids placed (bid_loss = amount user paid, includes fee)
        const bidsResult = await queryOne<any>(
            `SELECT COALESCE(SUM(amount), 0) as total FROM transactions t WHERE type = 'bid_loss' ${dateFilter}`
        );
        const totalBids = parseFloat(bidsResult?.total || 0);

        // Total payouts (bid_win)
        const payoutsResult = await queryOne<any>(
            `SELECT COALESCE(SUM(amount), 0) as total FROM transactions t WHERE type = 'bid_win' ${dateFilter}`
        );
        const totalPayouts = parseFloat(payoutsResult?.total || 0);

        // Total trading fees collected
        const feesResult = await queryOne<any>(
            `SELECT COALESCE(SUM(amount), 0) as total FROM transactions t WHERE type = 'trading_fee' ${dateFilter}`
        );
        const totalFees = parseFloat(feesResult?.total || 0);

        // Total referral/commission payouts
        const commResult = await queryOne<any>(
            `SELECT COALESCE(SUM(amount), 0) as total FROM transactions t WHERE type = 'referral_bonus' ${dateFilter}`
        );
        const totalCommissions = parseFloat(commResult?.total || 0);

        const netProfit = totalBids - totalPayouts - totalCommissions;

        // P&L chart data (daily for duration)
        let chartInterval = 'INTERVAL 7 DAY';
        if (duration === 'today') chartInterval = 'INTERVAL 1 DAY';
        else if (duration === '30d') chartInterval = 'INTERVAL 30 DAY';
        else if (duration === 'all') chartInterval = 'INTERVAL 365 DAY';

        const chartData = await query<any[]>(
            `SELECT DATE(t.created_at) as date,
                    SUM(CASE WHEN type = 'bid_loss' THEN amount ELSE 0 END) as bids,
                    SUM(CASE WHEN type = 'bid_win' THEN amount ELSE 0 END) as payouts,
                    SUM(CASE WHEN type = 'trading_fee' THEN amount ELSE 0 END) as fees
             FROM transactions t
             WHERE t.created_at >= DATE_SUB(NOW(), ${chartInterval})
             AND type IN ('bid_loss', 'bid_win', 'trading_fee')
             GROUP BY DATE(t.created_at) ORDER BY date ASC`
        ) || [];

        return NextResponse.json({
            settings,
            live: {
                activePlayers,
                activeRounds: activeRounds.length,
                upAmount: liveUpAmount,
                downAmount: liveDownAmount,
                upUsers: liveUpUsers,
                downUsers: liveDownUsers,
                rounds: activeRounds,
            },
            pnl: {
                totalBids,
                totalPayouts,
                totalFees,
                totalCommissions,
                netProfit,
                chartData: chartData.map(d => ({
                    date: d.date,
                    bids: parseFloat(d.bids),
                    payouts: parseFloat(d.payouts),
                    fees: parseFloat(d.fees),
                    profit: parseFloat(d.bids) - parseFloat(d.payouts),
                })),
            },
        });
    } catch (error: any) {
        console.error('Trade control GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH: Update settings
export async function PATCH(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const allowedKeys = ['trade_mode', 'manual_winner', 'consecutive_up_wins', 'consecutive_down_wins', 'force_lose_user_ids'];

        for (const key of allowedKeys) {
            if (body[key] !== undefined) {
                await setSetting(key, String(body[key]));
            }
        }

        return NextResponse.json({ message: 'Settings updated' });
    } catch (error: any) {
        console.error('Trade control PATCH error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
