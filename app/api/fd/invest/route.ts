import { NextResponse } from 'next/server';
import { getFDUserIdFromRequest } from '@/lib/fd-user';
import { query, queryOne } from '@/lib/db';
import { z } from 'zod';
import dayjs from 'dayjs';

const investSchema = z.object({
    amount: z.number().min(1000, 'Minimum investment is ₹1,000').max(50000, 'Maximum investment is ₹50,000'),
});

export async function POST(request: Request) {
    try {
        const userId = await getFDUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const parsed = investSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const { amount } = parsed.data;

        // Check wallet balance
        const user = await queryOne<any>('SELECT wallet_balance FROM fd_users WHERE id = ?', [userId]);
        if (!user || Number(user.wallet_balance) < amount) {
            return NextResponse.json({
                error: `Insufficient balance. Available: ₹${Number(user?.wallet_balance || 0).toFixed(2)}, Required: ₹${amount.toFixed(2)}`
            }, { status: 400 });
        }

        // Get FD settings
        const rateSetting = await queryOne<any>("SELECT setting_value FROM fd_settings WHERE setting_key = 'fd_monthly_rate'");
        const durationSetting = await queryOne<any>("SELECT setting_value FROM fd_settings WHERE setting_key = 'fd_duration_days'");
        const sharingDurationSetting = await queryOne<any>("SELECT setting_value FROM fd_settings WHERE setting_key = 'profit_sharing_duration_months'");

        const monthlyRate = parseFloat(rateSetting?.setting_value || '5');
        const durationDays = parseInt(durationSetting?.setting_value || '60');
        const sharingDurationMonths = parseInt(sharingDurationSetting?.setting_value || '12');

        const startDate = dayjs().format('YYYY-MM-DD');
        const endDate = dayjs().add(durationDays, 'day').format('YYYY-MM-DD');
        const profitSharingExpiry = dayjs().add(durationDays, 'day').add(sharingDurationMonths, 'month').format('YYYY-MM-DD');

        // Deduct from wallet
        await query('UPDATE fd_users SET wallet_balance = wallet_balance - ? WHERE id = ?', [amount, userId]);

        // Create FD deposit
        await query(
            `INSERT INTO fd_deposits (user_id, amount, monthly_rate, duration_days, start_date, end_date, phase, status, profit_sharing_expiry) 
             VALUES (?, ?, ?, ?, ?, ?, 'phase1_active', 'active', ?)`,
            [userId, amount, monthlyRate, durationDays, startDate, endDate, profitSharingExpiry]
        );

        // Record transaction
        await query(
            `INSERT INTO fd_transactions (user_id, type, amount, status, notes) VALUES (?, 'fd_invest', ?, 'completed', ?)`,
            [userId, amount, `FD Investment of ₹${amount.toFixed(2)} for ${durationDays} days at ${monthlyRate}% monthly`]
        );

        return NextResponse.json({
            message: `FD Investment of ₹${amount.toLocaleString()} created successfully! Your funds are locked for ${durationDays} days.`,
            fd: { amount, startDate, endDate, monthlyRate, durationDays },
        });
    } catch (error: any) {
        console.error('FD Invest error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
