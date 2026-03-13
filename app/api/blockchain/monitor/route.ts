import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { processDeposits } from '@/lib/monitor';

// POST: Check for new blockchain deposits (admin/cron endpoint)
export async function POST() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const result = await processDeposits();

        return NextResponse.json({
            message: `Processed ${result.processed} deposits, skipped ${result.skipped}`,
            ...result,
        });
    } catch (error: any) {
        console.error('Blockchain monitor error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
