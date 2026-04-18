import { NextResponse } from 'next/server';
import { syncAllFDInvestments } from '@/lib/fd-earnings';

export async function POST() {
    try {
        const result = await syncAllFDInvestments();

        return NextResponse.json({
            success: true,
            message: 'FD earnings sync completed',
            ...result,
        });
    } catch (error: any) {
        console.error('[Cron/FD Earnings] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
