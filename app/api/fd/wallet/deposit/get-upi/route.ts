import { NextResponse } from 'next/server';
import { getCurrentFDUser } from '@/lib/fd-user';
import { queryOne } from '@/lib/db';

export async function GET() {
    try {
        const user = await getCurrentFDUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const upi = await queryOne<any>('SELECT upi_id, display_name FROM upi_accounts WHERE is_active = 1 ORDER BY RAND() LIMIT 1');
        if (!upi) {
            return NextResponse.json({ error: 'No active UPI accounts available' }, { status: 404 });
        }

        return NextResponse.json({ upiId: upi.upi_id, displayName: upi.display_name });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to get UPI info' }, { status: 500 });
    }
}
