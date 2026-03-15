import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { query } from '@/lib/db';

// GET: Get a random active UPI ID for deposit
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const accounts = await query<any[]>(
            'SELECT id, upi_id, display_name FROM upi_accounts WHERE is_active = 1'
        ) || [];

        if (accounts.length === 0) {
            return NextResponse.json({ error: 'No active UPI accounts available. Please try USDT deposit.' }, { status: 404 });
        }

        // Pick random UPI
        const randomIdx = Math.floor(Math.random() * accounts.length);
        const selected = accounts[randomIdx];

        return NextResponse.json({
            upiId: selected.upi_id,
            displayName: selected.display_name,
        });
    } catch (error: any) {
        console.error('Get UPI error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
