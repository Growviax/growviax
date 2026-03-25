import { NextResponse } from 'next/server';
import { getCurrentFDUser } from '@/lib/fd-user';

const DEPOSIT_WALLETS = [
    { qr: '/img/qr1.jpeg', address: '0xEE6edC5cb5C07D7A1Eb2ec5EB953d640fE046152' },
    { qr: '/img/qr2.jpeg', address: '0x3cC8B270a33997a95AdB4511A701dD159734D433' },
    { qr: '/img/qr3.jpeg', address: '0xEb22c11a8f4A9028f7103CC303b43C4B0e35D476' },
    { qr: '/img/qr4.jpeg', address: '0x1a7d0e91aaCe0256Baf375C18c333165a49851a8' },
    { qr: '/img/qr5.jpeg', address: '0xED7D925FAab46C08fbbaba6AFbC382C6533c403a' },
];

export async function POST() {
    try {
        const user = await getCurrentFDUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const selectedWallet = DEPOSIT_WALLETS[Math.floor(Math.random() * DEPOSIT_WALLETS.length)];
        return NextResponse.json({ wallet_address: selectedWallet.address, qr: selectedWallet.qr, wallets: DEPOSIT_WALLETS });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to get deposit info' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const user = await getCurrentFDUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const randomIdx = Math.floor(Math.random() * DEPOSIT_WALLETS.length);
        return NextResponse.json({ wallet: DEPOSIT_WALLETS[randomIdx], wallets: DEPOSIT_WALLETS });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to get deposit info' }, { status: 500 });
    }
}
