import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { hashPassword, generateWalletAddress, generateReferralCode } from '@/lib/auth';
import { getCurrentUser } from '@/lib/user';

const DEMO_ACCOUNTS = [
    {
        name: 'Demo User 1',
        email: 'demo1@growviax.com',
        phone: '9999900001',
        password: 'demo123456',
        balance: 1000,
    },
    {
        name: 'Demo User 2',
        email: 'demo2@growviax.com',
        phone: '9999900002',
        password: 'demo123456',
        balance: 1000,
    },
];

export async function POST() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const created: string[] = [];
        const skipped: string[] = [];

        for (const account of DEMO_ACCOUNTS) {
            // Check if already exists
            const existing = await queryOne<any>(
                'SELECT id FROM users WHERE email = ?',
                [account.email]
            );

            if (existing) {
                // Update balance to $1000 in case it was changed
                await query(
                    'UPDATE users SET wallet_balance = ? WHERE id = ?',
                    [account.balance, existing.id]
                );
                skipped.push(`${account.email} (already exists, balance reset to $${account.balance})`);
                continue;
            }

            const passwordHash = await hashPassword(account.password);
            const walletAddress = generateWalletAddress();
            const referralCode = generateReferralCode();

            await query<any>(
                'INSERT INTO users (name, email, phone, password_hash, wallet_address, wallet_balance, referral_code, is_verified, role) VALUES (?, ?, ?, ?, ?, ?, ?, 1, "user")',
                [account.name, account.email, account.phone, passwordHash, walletAddress, account.balance, referralCode]
            );

            created.push(`${account.email} ($${account.balance} credit, password: ${account.password})`);
        }

        return NextResponse.json({
            message: 'Seed completed',
            created,
            skipped,
        });
    } catch (error: any) {
        console.error('Seed error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
