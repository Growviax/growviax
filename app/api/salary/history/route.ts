import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/user';
import { query } from '@/lib/db';

// GET: Daily salary history for current user
export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        let history: any[] = [];
        try {
            history = await query<any[]>(
                'SELECT * FROM daily_salary_log WHERE user_id = ? ORDER BY credited_at DESC LIMIT 30',
                [userId]
            );
        } catch {
            // Table might not exist
        }

        return NextResponse.json({ history: history || [] });
    } catch (error: any) {
        console.error('Salary history error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
