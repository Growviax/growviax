import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { query } from '@/lib/db';

// GET: List pending bids for admin override panel
export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'pending';

        let bids: any[] = [];

        if (status === 'pending') {
            bids = await query<any[]>(
                `SELECT b.id, b.user_id, u.name as user_name, u.email as user_email,
                        b.coin_id, b.direction, b.amount, b.status,
                        b.round_id, br.end_time as round_end, b.created_at,
                        abo.override_action
                 FROM bids b
                 JOIN users u ON u.id = b.user_id
                 JOIN bid_rounds br ON br.id = b.round_id
                 LEFT JOIN admin_bet_overrides abo ON abo.bid_id = b.id AND abo.applied = 0
                 WHERE b.status = 'pending'
                 ORDER BY b.created_at DESC
                 LIMIT 100`
            ) || [];
        } else {
            bids = await query<any[]>(
                `SELECT b.id, b.user_id, u.name as user_name, u.email as user_email,
                        b.coin_id, b.direction, b.amount, b.status, b.payout,
                        b.round_id, b.admin_override, b.engine_reason, b.created_at
                 FROM bids b
                 JOIN users u ON u.id = b.user_id
                 WHERE b.status IN ('won', 'lost')
                 ORDER BY b.created_at DESC
                 LIMIT 50`
            ) || [];
        }

        return NextResponse.json({ bids });
    } catch (error: any) {
        console.error('Admin bet overrides GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Set override for a specific bid
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { bidId, action } = await request.json();

        if (!bidId || !['force_win', 'force_loss', 'system_decide'].includes(action)) {
            return NextResponse.json({ error: 'Invalid bid ID or action' }, { status: 400 });
        }

        // Verify bid exists and is pending
        const bids = await query<any[]>('SELECT id, round_id FROM bids WHERE id = ? AND status = "pending"', [bidId]);
        if (!bids || bids.length === 0) {
            return NextResponse.json({ error: 'Bid not found or already resolved' }, { status: 404 });
        }

        const bid = bids[0];

        if (action === 'system_decide') {
            // Remove any existing override
            await query('DELETE FROM admin_bet_overrides WHERE bid_id = ? AND applied = 0', [bidId]);
        } else {
            // Upsert override
            await query(
                `INSERT INTO admin_bet_overrides (bid_id, round_id, admin_user_id, override_action)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE override_action = VALUES(override_action), admin_user_id = VALUES(admin_user_id)`,
                [bidId, bid.round_id, user.id, action]
            );
        }

        // Log admin action
        await query(
            `INSERT INTO admin_activity_log (admin_id, action_type, target_type, target_id, details)
             VALUES (?, 'bet_override', 'bid', ?, ?)`,
            [user.id, bidId, `Set override: ${action}`]
        );

        return NextResponse.json({ message: `Override set: ${action}` });
    } catch (error: any) {
        console.error('Admin bet override POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
