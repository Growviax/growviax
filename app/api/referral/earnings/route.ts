import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/user';
import { query } from '@/lib/db';

// GET: Referral earnings for current user
export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10000');
        const offset = (page - 1) * limit;

        const earnings = await query<any[]>(
            `SELECT re.*, u.name as from_user_name FROM referral_earnings re LEFT JOIN users u ON re.from_user_id = u.id WHERE re.user_id = ? ORDER BY re.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
            [userId]
        );

        const totalResult = await query<any[]>(
            'SELECT SUM(amount) as total_earnings, COUNT(*) as total_count FROM referral_earnings WHERE user_id = ?',
            [userId]
        );

        return NextResponse.json({
            earnings: earnings || [],
            totalEarnings: totalResult?.[0]?.total_earnings || 0,
            totalCount: totalResult?.[0]?.total_count || 0,
        });
    } catch (error: any) {
        console.error('Referral earnings error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
