import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { query, queryOne } from '@/lib/db';

const USD_TO_INR = 98; // Conversion rate

// GET: List deposit requests for admin panel
export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'pending';
        const type = searchParams.get('type') || 'all';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = 20;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        const params: any[] = [];

        if (status !== 'all') {
            whereClause += ' AND dr.status = ?';
            params.push(status);
        }
        if (type !== 'all') {
            whereClause += ' AND dr.deposit_type = ?';
            params.push(type);
        }

        const deposits = await query<any[]>(
            `SELECT dr.*, u.name as user_name, u.email as user_email,
                    a.name as admin_name
             FROM deposit_requests dr
             JOIN users u ON u.id = dr.user_id
             LEFT JOIN users a ON a.id = dr.admin_id
             ${whereClause}
             ORDER BY dr.created_at DESC
             LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
            params
        ) || [];

        const countResult = await queryOne<{ total: number }>(
            `SELECT COUNT(*) as total FROM deposit_requests dr ${whereClause}`,
            params
        );

        // Get summary stats
        const stats = await queryOne<any>(
            `SELECT 
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
                COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as total_approved_amount
             FROM deposit_requests`
        );

        return NextResponse.json({
            deposits,
            total: countResult?.total || 0,
            page,
            totalPages: Math.ceil((countResult?.total || 0) / limit),
            stats: {
                pending: stats?.pending_count || 0,
                approved: stats?.approved_count || 0,
                rejected: stats?.rejected_count || 0,
                totalApproved: parseFloat(stats?.total_approved_amount || 0),
            },
        });
    } catch (error: any) {
        console.error('Admin deposits GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH: Approve or reject a deposit request
export async function PATCH(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { requestId, action, adminNote } = await request.json();

        if (!requestId || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Invalid request ID or action' }, { status: 400 });
        }

        // Get the deposit request
        const depositReq = await queryOne<any>(
            'SELECT * FROM deposit_requests WHERE id = ? AND status = "pending"',
            [requestId]
        );

        if (!depositReq) {
            return NextResponse.json({ error: 'Deposit request not found or already processed' }, { status: 404 });
        }

        if (action === 'approve') {
            const isUsdt = depositReq.deposit_type === 'usdt';
            const originalAmount = parseFloat(depositReq.amount);
            
            if (originalAmount <= 0) {
                return NextResponse.json({ error: 'Invalid deposit amount' }, { status: 400 });
            }

            // For USDT: amount is in USD, convert to INR using 98 rate
            // For UPI: amount is already in INR
            const inrAmount = isUsdt ? originalAmount * USD_TO_INR : originalAmount;

            // Credit user balance (always in INR)
            await query(
                'UPDATE users SET wallet_balance = wallet_balance + ?, total_deposited = total_deposited + ? WHERE id = ?',
                [inrAmount, inrAmount, depositReq.user_id]
            );

            // Update deposit request
            await query(
                'UPDATE deposit_requests SET status = "approved", admin_id = ?, admin_note = ?, reviewed_at = NOW() WHERE id = ?',
                [user.id, adminNote || 'Approved', requestId]
            );

            // Create transaction record
            await query(
                `INSERT INTO transactions (user_id, type, amount, status, tx_hash, notes, network)
                 VALUES (?, 'deposit', ?, 'completed', ?, ?, ?)`,
                [
                    depositReq.user_id,
                    inrAmount,
                    depositReq.tx_hash || depositReq.utr_number || null,
                    isUsdt ? `USDT deposit ($${originalAmount.toFixed(2)} × ${USD_TO_INR} = ₹${inrAmount.toFixed(2)})` : 'UPI deposit approved by admin',
                    isUsdt ? 'BEP20' : 'UPI',
                ]
            );

            // Log admin action
            await query(
                `INSERT INTO admin_activity_log (admin_id, action_type, target_type, target_id, details)
                 VALUES (?, 'deposit_approve', 'deposit_request', ?, ?)`,
                [user.id, requestId, `Approved ${isUsdt ? 'USDT' : 'UPI'} deposit: ${isUsdt ? '$' + originalAmount.toFixed(2) + ' → ₹' + inrAmount.toFixed(2) : '₹' + inrAmount.toFixed(2)} for user ${depositReq.user_id}`]
            );

            return NextResponse.json({
                message: isUsdt 
                    ? `Deposit approved. $${originalAmount.toFixed(2)} USDT → ₹${inrAmount.toFixed(2)} credited to user.`
                    : `Deposit approved. ₹${inrAmount.toFixed(2)} credited to user.`,
            });
        } else {
            // Reject
            await query(
                'UPDATE deposit_requests SET status = "rejected", admin_id = ?, admin_note = ?, reviewed_at = NOW() WHERE id = ?',
                [user.id, adminNote || 'Rejected by admin', requestId]
            );

            // Log admin action
            await query(
                `INSERT INTO admin_activity_log (admin_id, action_type, target_type, target_id, details)
                 VALUES (?, 'deposit_reject', 'deposit_request', ?, ?)`,
                [user.id, requestId, `Rejected deposit for user ${depositReq.user_id}. Reason: ${adminNote || 'No reason provided'}`]
            );

            return NextResponse.json({ message: 'Deposit request rejected.' });
        }
    } catch (error: any) {
        console.error('Admin deposits PATCH error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
