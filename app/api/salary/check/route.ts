import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { processDailySalaries } from '@/lib/salary';

// POST: Run daily salary check (cron-compatible)
export async function POST() {
    try {
        // This can be called by admin or cron job
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const result = await processDailySalaries();

        return NextResponse.json({
            message: `Daily salary processed for ${result.processed} users`,
            ...result,
        });
    } catch (error: any) {
        console.error('Salary check error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
