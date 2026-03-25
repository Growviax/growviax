import { NextResponse } from 'next/server';
import { getCurrentFDUser } from '@/lib/fd-user';

export async function GET() {
    try {
        const user = await getCurrentFDUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        return NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                wallet_balance: user.wallet_balance,
                total_deposited: user.total_deposited,
                referral_code: user.referral_code,
                role: user.role,
                profit_sharing_enabled: user.profit_sharing_enabled,
                created_at: user.created_at,
            },
        });
    } catch (error: any) {
        console.error('FD User API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
