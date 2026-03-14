import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { triggerDepositMonitor } from '@/lib/monitor';

// POST: Check for new blockchain deposits (admin/cron endpoint)
export async function POST() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const monitor = await triggerDepositMonitor({ force: true });
        const result = monitor.result || { processed: 0, skipped: 0, errors: 0 };

        return NextResponse.json({
            message: `Processed ${result.processed} deposits, skipped ${result.skipped}, errors ${result.errors}`,
            ...result,
        });
    } catch (error: unknown) {
        console.error('Blockchain monitor error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
