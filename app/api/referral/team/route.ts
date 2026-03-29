import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/user';
import { query, queryOne } from '@/lib/db';

// GET: Full referral team list for current user
export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Get current user's referral code
        const user = await queryOne<any>(
            'SELECT referral_code FROM users WHERE id = ?',
            [userId]
        );

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Get all direct referrals with details
        const referrals = await query<any[]>(
            `SELECT u.id, u.name, u.email, u.created_at, u.wallet_balance,
                    COALESCE(
                        (SELECT SUM(t.amount) FROM transactions t 
                         WHERE t.user_id = u.id AND t.type = 'deposit' AND t.status = 'completed'), 0
                    ) as total_deposit,
                    COALESCE(
                        (SELECT COUNT(*) FROM bids b WHERE b.user_id = u.id), 0
                    ) as total_trades
             FROM users u 
             WHERE u.referred_by = ? 
             ORDER BY u.created_at DESC`,
            [user.referral_code]
        );

        return NextResponse.json({
            referrals: (referrals || []).map(r => ({
                id: r.id,
                name: r.name,
                email: r.email,
                joinedAt: r.created_at,
                totalDeposit: parseFloat(r.total_deposit) || 0,
                totalTrades: parseInt(r.total_trades) || 0,
                hasDeposited: parseFloat(r.total_deposit) > 0,
            })),
            totalCount: referrals?.length || 0,
        });
    } catch (error: any) {
        console.error('Referral team error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
