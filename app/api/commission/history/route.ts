import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/user';
import { query } from '@/lib/db';

// GET: Commission history for current user
export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        let history: any[] = [];
        let totalEarnings = 0;

        try {
            history = await query<any[]>(
                `SELECT ch.*, u.name as from_user_name FROM commission_history ch LEFT JOIN users u ON ch.from_user_id = u.id WHERE ch.user_id = ? ORDER BY ch.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
                [userId]
            );

            const totalResult = await query<any[]>(
                'SELECT SUM(commission_amount) as total FROM commission_history WHERE user_id = ?',
                [userId]
            );
            totalEarnings = totalResult?.[0]?.total || 0;
        } catch {
            // Table might not exist yet
        }

        return NextResponse.json({
            history: history || [],
            totalEarnings,
        });
    } catch (error: any) {
        console.error('Commission history error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
