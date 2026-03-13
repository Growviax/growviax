import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/user';
import { queryOne, query } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user info
        const user = await queryOne<any>(
            'SELECT id, name, email, phone, wallet_address, wallet_balance, referral_code, referred_by, role, created_at FROM users WHERE id = ?',
            [userId]
        );

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get referral stats
        const referralCount = await queryOne<any>(
            'SELECT COUNT(*) as total FROM users WHERE referred_by = ?',
            [user.referral_code]
        );

        const referralEarnings = await queryOne<any>(
            'SELECT COALESCE(SUM(amount), 0) as total FROM referral_earnings WHERE user_id = ?',
            [userId]
        );

        // Get recent trades
        const recentTrades = await query<any[]>(
            'SELECT b.*, br.winning_side FROM bids b JOIN bid_rounds br ON b.round_id = br.id WHERE b.user_id = ? ORDER BY b.created_at DESC LIMIT 5',
            [userId]
        );

        // Get support tickets count
        const openTickets = await queryOne<any>(
            'SELECT COUNT(*) as total FROM support_tickets WHERE user_id = ? AND status != "closed"',
            [userId]
        );

        return NextResponse.json({
            user,
            referralStats: {
                totalReferred: referralCount?.total || 0,
                totalEarnings: referralEarnings?.total || 0,
            },
            recentTrades: recentTrades || [],
            openTickets: openTickets?.total || 0,
        });
    } catch (error: any) {
        console.error('Dashboard error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
