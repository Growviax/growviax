import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { query, queryOne } from '@/lib/db';
import { sendDepositRequestEmail } from '@/lib/email';

const DEPOSIT_WALLETS = [
    '0xEE6edC5cb5C07D7A1Eb2ec5EB953d640fE046152',
    '0x3cC8B270a33997a95AdB4511A701dD159734D433',
    '0xEb22c11a8f4A9028f7103CC303b43C4B0e35D476',
    '0x1a7d0e91aaCe0256Baf375C18c333165a49851a8',
    '0xED7D925FAab46C08fbbaba6AFbC382C6533c403a',
].map(a => a.toLowerCase());

// Validate BSC transaction hash format
function isValidTxHash(hash: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(hash.trim());
}

// Rate limit: max 5 deposit requests per user per hour
async function checkRateLimit(userId: number): Promise<boolean> {
    try {
        const result = await queryOne<{ count: number }>(
            `SELECT COUNT(*) as count FROM deposit_requests 
             WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
            [userId]
        );
        return (result?.count || 0) < 5;
    } catch { return true; }
}

// POST: Submit USDT deposit with transaction hash
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { txHash, walletAddress, amount } = await request.json();

        // Validation
        if (!txHash || !walletAddress) {
            return NextResponse.json({ error: 'Transaction hash and wallet address are required' }, { status: 400 });
        }

        const cleanHash = txHash.trim();
        const cleanAddress = walletAddress.trim().toLowerCase();

        // Validate hash format
        if (!isValidTxHash(cleanHash)) {
            return NextResponse.json({ error: 'Invalid transaction hash format. Must be 0x followed by 64 hex characters.' }, { status: 400 });
        }

        // Validate wallet address matches one of our wallets
        if (!DEPOSIT_WALLETS.includes(cleanAddress)) {
            return NextResponse.json({ error: 'Wallet address does not match any platform deposit wallet' }, { status: 400 });
        }

        // Validate amount
        const depositAmount = parseFloat(amount);
        if (!depositAmount || depositAmount <= 0) {
            return NextResponse.json({ error: 'Please enter a valid deposit amount' }, { status: 400 });
        }

        // Rate limiting
        const allowed = await checkRateLimit(user.id);
        if (!allowed) {
            return NextResponse.json({ error: 'Too many deposit requests. Please wait before submitting another.' }, { status: 429 });
        }

        // Check duplicate hash — UNIQUE constraint
        const existingHash = await queryOne<{ id: number }>(
            'SELECT id FROM deposit_requests WHERE tx_hash = ?',
            [cleanHash]
        );
        if (existingHash) {
            return NextResponse.json({ error: 'This transaction hash has already been submitted' }, { status: 409 });
        }

        // Also check transactions table for used hashes
        const existingTx = await queryOne<{ id: number }>(
            'SELECT id FROM transactions WHERE tx_hash = ?',
            [cleanHash]
        );
        if (existingTx) {
            return NextResponse.json({ error: 'This transaction hash has already been processed' }, { status: 409 });
        }

        // Create deposit request
        const result = await query<any>(
            `INSERT INTO deposit_requests 
             (user_id, deposit_type, amount, wallet_address, tx_hash, status)
             VALUES (?, 'usdt', ?, ?, ?, 'pending')`,
            [user.id, depositAmount, cleanAddress, cleanHash]
        );

        // Send email notification to admin
        try {
            await sendDepositRequestEmail({
                username: user.name,
                email: user.email,
                amount: depositAmount.toString(),
                depositType: 'usdt',
                walletAddress: cleanAddress,
                txHash: cleanHash,
                time: new Date().toISOString(),
            });
        } catch (emailErr) {
            console.error('Failed to send deposit notification email:', emailErr);
        }

        return NextResponse.json({
            message: 'Deposit request submitted successfully. Awaiting admin approval.',
            requestId: result.insertId,
        });
    } catch (error: any) {
        console.error('Deposit submit error:', error);
        if (error?.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ error: 'Duplicate transaction hash' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to submit deposit request' }, { status: 500 });
    }
}
