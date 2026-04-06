import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/user';
import { query, queryOne } from '@/lib/db';
import { creditPendingCommissions } from '@/lib/commission';

/**
 * GET - Preview pending commission disbursement amount
 * POST - Manually trigger commission disbursement (admin only)
 */

export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Check admin
        const user = await queryOne<any>('SELECT role FROM users WHERE id = ?', [userId]);
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Admin only' }, { status: 403 });
        }

        // Get pending commission totals
        const pendingRow = await queryOne<any>(
            `SELECT 
                COUNT(*) as total_records,
                COUNT(DISTINCT user_id) as total_users,
                COALESCE(SUM(commission_amount), 0) as total_amount
             FROM pending_commissions WHERE status = 'pending'`
        );

        // Get today's already disbursed amount
        const todayRow = await queryOne<any>(
            `SELECT 
                COUNT(*) as records_credited,
                COUNT(DISTINCT user_id) as users_credited,
                COALESCE(SUM(commission_amount), 0) as amount_credited
             FROM pending_commissions 
             WHERE status = 'credited' AND DATE(credited_at) = CURDATE()`
        );

        // Get last disbursement time
        const lastRow = await queryOne<any>(
            `SELECT credited_at FROM pending_commissions WHERE status = 'credited' ORDER BY credited_at DESC LIMIT 1`
        );

        return NextResponse.json({
            pending: {
                records: pendingRow?.total_records || 0,
                users: pendingRow?.total_users || 0,
                amount: parseFloat(pendingRow?.total_amount || '0'),
            },
            todayDisbursed: {
                records: todayRow?.records_credited || 0,
                users: todayRow?.users_credited || 0,
                amount: parseFloat(todayRow?.amount_credited || '0'),
            },
            lastDisbursedAt: lastRow?.credited_at || null,
        });
    } catch (error: any) {
        console.error('Commission preview error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Check admin
        const user = await queryOne<any>('SELECT role FROM users WHERE id = ?', [userId]);
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Admin only' }, { status: 403 });
        }

        // Run commission disbursement
        const result = await creditPendingCommissions();

        return NextResponse.json({
            success: true,
            message: result.totalAmount > 0
                ? `Disbursed ₹${result.totalAmount.toFixed(2)} to ${result.usersProcessed} users (${result.recordsProcessed} records)`
                : 'No pending commissions to disburse',
            ...result,
        });
    } catch (error: any) {
        console.error('Commission manual trigger error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
