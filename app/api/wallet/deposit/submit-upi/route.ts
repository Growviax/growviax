import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { query, queryOne } from '@/lib/db';
import { sendDepositRequestEmail } from '@/lib/email';

// Validate UTR number (12-digit numeric)
function isValidUTR(utr: string): boolean {
    return /^\d{12}$/.test(utr.trim());
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

// POST: Submit UPI deposit with UTR number
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { utrNumber, upiId, amount } = await request.json();

        // Validation
        if (!utrNumber || !upiId || !amount) {
            return NextResponse.json({ error: 'UTR number, UPI ID, and amount are required' }, { status: 400 });
        }

        const cleanUTR = utrNumber.trim();
        const cleanUPI = upiId.trim();

        // Validate UTR format
        if (!isValidUTR(cleanUTR)) {
            return NextResponse.json({ error: 'Invalid UTR number. Must be 12 digits.' }, { status: 400 });
        }

        // Validate amount
        const depositAmount = parseFloat(amount);
        if (!depositAmount || depositAmount < 500) {
            return NextResponse.json({ error: 'Minimum UPI deposit amount is ₹500' }, { status: 400 });
        }

        // Verify the UPI ID is one of our active UPIs
        const validUPI = await queryOne<{ id: number }>(
            'SELECT id FROM upi_accounts WHERE upi_id = ? AND is_active = 1',
            [cleanUPI]
        );
        if (!validUPI) {
            return NextResponse.json({ error: 'Invalid UPI ID. Please use the assigned UPI.' }, { status: 400 });
        }

        // Rate limiting
        const allowed = await checkRateLimit(user.id);
        if (!allowed) {
            return NextResponse.json({ error: 'Too many deposit requests. Please wait before submitting another.' }, { status: 429 });
        }

        // Check duplicate UTR
        const existingUTR = await queryOne<{ id: number }>(
            'SELECT id FROM deposit_requests WHERE utr_number = ?',
            [cleanUTR]
        );
        if (existingUTR) {
            return NextResponse.json({ error: 'This UTR number has already been submitted' }, { status: 409 });
        }

        // Create deposit request
        const result = await query<any>(
            `INSERT INTO deposit_requests 
             (user_id, deposit_type, amount, upi_id, utr_number, status)
             VALUES (?, 'upi', ?, ?, ?, 'pending')`,
            [user.id, depositAmount, cleanUPI, cleanUTR]
        );

        // Send email notification to admin
        try {
            await sendDepositRequestEmail({
                username: user.name,
                email: user.email,
                amount: depositAmount.toString(),
                depositType: 'upi',
                upiId: cleanUPI,
                utrNumber: cleanUTR,
                time: new Date().toISOString(),
            });
        } catch (emailErr) {
            console.error('Failed to send deposit notification email:', emailErr);
        }

        return NextResponse.json({
            message: 'UPI deposit request submitted successfully. Awaiting admin approval.',
            requestId: result.insertId,
        });
    } catch (error: any) {
        console.error('UPI deposit submit error:', error);
        if (error?.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ error: 'Duplicate UTR number' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to submit deposit request' }, { status: 500 });
    }
}
