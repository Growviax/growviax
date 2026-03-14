import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/user';
import { queryOne } from '@/lib/db';
import { triggerDepositMonitor } from '@/lib/monitor';

const DEPOSIT_WALLETS = [
    { qr: '/img/qr1.jpeg', address: '0xEE6edC5cb5C07D7A1Eb2ec5EB953d640fE046152' },
    { qr: '/img/qr2.jpeg', address: '0x3cC8B270a33997a95AdB4511A701dD159734D433' },
    { qr: '/img/qr3.jpeg', address: '0xEb22c11a8f4A9028f7103CC303b43C4B0e35D476' },
    { qr: '/img/qr4.jpeg', address: '0x1a7d0e91aaCe0256Baf375C18c333165a49851a8' },
    { qr: '/img/qr5.jpeg', address: '0xED7D925FAab46C08fbbaba6AFbC382C6533c403a' },
];

type DepositRequestRow = {
    id: number;
    wallet_address: string;
    status: 'pending' | 'completed' | 'expired';
    matched_tx_hash: string | null;
    created_at: string;
    expires_at: string | null;
};

type DepositTransactionRow = {
    id: number;
    amount: number | string;
    tx_hash: string | null;
    notes: string | null;
    created_at: string;
};

export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const latestRequest = await queryOne<DepositRequestRow>(
            `SELECT id, wallet_address, status, matched_tx_hash, created_at, expires_at
             FROM deposit_requests
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId]
        );

        let monitor = null;
        if (latestRequest?.status === 'pending') {
            try {
                monitor = await triggerDepositMonitor();
            } catch (error) {
                console.error('Deposit status monitor warning:', error);
                monitor = {
                    ran: false,
                    reusedActiveRun: false,
                    error: 'Deposit scan temporarily unavailable',
                };
            }
        }

        const depositRequest = await queryOne<DepositRequestRow>(
            `SELECT id, wallet_address, status, matched_tx_hash, created_at, expires_at
             FROM deposit_requests
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId]
        );

        const latestDeposit = await queryOne<DepositTransactionRow>(
            `SELECT id, amount, tx_hash, notes, created_at
             FROM transactions
             WHERE user_id = ? AND type = "deposit"
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId]
        );

        const wallet = depositRequest
            ? DEPOSIT_WALLETS.find(
                (item) => item.address.toLowerCase() === depositRequest.wallet_address.toLowerCase()
            )
            : null;

        return NextResponse.json({
            depositRequest: depositRequest
                ? {
                    ...depositRequest,
                    qr: wallet?.qr || '/img/qr1.jpeg',
                }
                : null,
            latestDeposit: latestDeposit || null,
            monitor,
        });
    } catch (error: unknown) {
        console.error('Deposit status error:', error);
        return NextResponse.json({ error: 'Failed to check deposit status' }, { status: 500 });
    }
}
