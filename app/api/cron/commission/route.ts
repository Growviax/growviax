/**
 * Cron endpoint: Credit pending commissions
 * Called nightly at midnight IST (18:30 UTC) via VPS crontab
 * 
 * Security: Protected by CRON_SECRET bearer token
 * 
 * Usage: 
 *   curl -X POST https://growviax.live/api/cron/commission \
 *     -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
import { NextResponse } from 'next/server';
import { creditPendingCommissions } from '@/lib/commission';

export async function POST(request: Request) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        // Hardcoded secret as requested
        const cronSecret = 'a6cc373335a75edd7ab324b41640a74c31f6d92b1b5f4b1fc5537f5708141134';

        if (!cronSecret) {
            console.error('[Cron/Commission] CRON_SECRET not configured');
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }

        const token = authHeader?.replace('Bearer ', '').trim();
        const cleanSecret = cronSecret.trim();
        
        if (!token || token !== cleanSecret) {
            console.error(`[Cron/Commission] Auth failed. Expected length: ${cleanSecret.length}, Got length: ${token?.length}`);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Process pending commissions
        const result = await creditPendingCommissions();

        console.log(`[Cron/Commission] Processed: ${result.usersProcessed} users, ₹${result.totalAmount.toFixed(4)} total, ${result.recordsProcessed} records`);

        return NextResponse.json({
            success: true,
            message: 'Pending commissions credited',
            ...result,
        });
    } catch (error: any) {
        console.error('[Cron/Commission] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
