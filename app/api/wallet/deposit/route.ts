import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { query, queryOne } from '@/lib/db';

/**
 * Deposit wallets — server-side source of truth
 * Each wallet has a QR code image in /public/img/
 */
const DEPOSIT_WALLETS = [
    { qr: '/img/qr1.jpeg', address: '0xEE6edC5cb5C07D7A1Eb2ec5EB953d640fE046152' },
    { qr: '/img/qr2.jpeg', address: '0x3cC8B270a33997a95AdB4511A701dD159734D433' },
    { qr: '/img/qr3.jpeg', address: '0xEb22c11a8f4A9028f7103CC303b43C4B0e35D476' },
    { qr: '/img/qr4.jpeg', address: '0x1a7d0e91aaCe0256Baf375C18c333165a49851a8' },
    { qr: '/img/qr5.jpeg', address: '0xED7D925FAab46C08fbbaba6AFbC382C6533c403a' },
];

// POST: Generate a deposit request — assign a wallet to the user
export async function POST() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Check if user already has an active (pending) deposit request
        const existing = await queryOne<any>(
            'SELECT id, wallet_address FROM deposit_requests WHERE user_id = ? AND status = "pending" AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY created_at DESC LIMIT 1',
            [user.id]
        );

        if (existing) {
            // Return the existing wallet assignment
            const wallet = DEPOSIT_WALLETS.find(
                (w) => w.address.toLowerCase() === existing.wallet_address.toLowerCase()
            );
            return NextResponse.json({
                wallet_address: existing.wallet_address,
                qr: wallet?.qr || '/img/qr1.jpeg',
                request_id: existing.id,
                reused: true,
            });
        }

        // Pick a random wallet
        const selectedWallet = DEPOSIT_WALLETS[Math.floor(Math.random() * DEPOSIT_WALLETS.length)];

        // Create deposit request in database (expires in 2 hours)
        const result = await query<any>(
            'INSERT INTO deposit_requests (user_id, wallet_address, status, expires_at) VALUES (?, ?, "pending", DATE_ADD(NOW(), INTERVAL 2 HOUR))',
            [user.id, selectedWallet.address]
        );

        return NextResponse.json({
            wallet_address: selectedWallet.address,
            qr: selectedWallet.qr,
            request_id: result.insertId,
            reused: false,
        });
    } catch (error: any) {
        console.error('Deposit request error:', error);
        return NextResponse.json({ error: 'Failed to generate deposit info' }, { status: 500 });
    }
}
