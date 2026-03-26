import { NextResponse } from 'next/server';
import { getCurrentFDUser } from '@/lib/fd-user';
import { query } from '@/lib/db';

export async function POST() {
    try {
        const user = await getCurrentFDUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        // Read from FD-specific USDT wallets table
        const wallets = await query<any[]>(
            'SELECT wallet_address as address, qr_image as qr FROM fd_usdt_wallets WHERE is_active = 1'
        ) || [];

        if (wallets.length === 0) {
            return NextResponse.json({ error: 'No active USDT wallets available' }, { status: 404 });
        }

        const selectedWallet = wallets[Math.floor(Math.random() * wallets.length)];
        return NextResponse.json({ wallet_address: selectedWallet.address, qr: selectedWallet.qr, wallets });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to get deposit info' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const user = await getCurrentFDUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        // Read from FD-specific USDT wallets table
        const wallets = await query<any[]>(
            'SELECT wallet_address as address, qr_image as qr FROM fd_usdt_wallets WHERE is_active = 1'
        ) || [];

        if (wallets.length === 0) {
            return NextResponse.json({ error: 'No active USDT wallets available' }, { status: 404 });
        }

        const randomIdx = Math.floor(Math.random() * wallets.length);
        return NextResponse.json({ wallet: wallets[randomIdx], wallets });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to get deposit info' }, { status: 500 });
    }
}
