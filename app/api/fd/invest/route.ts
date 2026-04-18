import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { z } from 'zod';
import { getFDUserIdFromRequest } from '@/lib/fd-user';
import { query, queryOne } from '@/lib/db';
import { getFDPackageDetails, getFDSettings } from '@/lib/fd-config';
import { processFDReferralBonusForDeposit, syncFDInvestmentsForUser } from '@/lib/fd-earnings';

const investSchema = z.object({
    amountUsdt: z.number().positive('Investment amount must be positive'),
});

export async function POST(request: Request) {
    try {
        const userId = await getFDUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await syncFDInvestmentsForUser(userId);

        const body = await request.json();
        const parsed = investSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const settings = await getFDSettings();
        const packageDetails = getFDPackageDetails(parsed.data.amountUsdt, settings);

        if (!packageDetails) {
            return NextResponse.json({
                error: `Choose a valid package amount: ${settings.starterMinUsdt}-${settings.starterMaxUsdt - 0.01} USDT for Starter or ${settings.eliteMinUsdt}+ USDT for Elite.`,
            }, { status: 400 });
        }

        const user = await queryOne<any>('SELECT wallet_balance FROM fd_users WHERE id = ?', [userId]);
        if (!user || Number(user.wallet_balance) < packageDetails.amountInr) {
            return NextResponse.json({
                error: `Insufficient balance. Available: ₹${Number(user?.wallet_balance || 0).toFixed(2)}, Required: ₹${packageDetails.amountInr.toFixed(2)}`,
            }, { status: 400 });
        }

        const startDate = dayjs();
        const endDate = startDate.add(settings.lockMonths, 'month');
        const durationDays = endDate.diff(startDate, 'day');

        const deductResult = await query<any>(
            'UPDATE fd_users SET wallet_balance = wallet_balance - ? WHERE id = ? AND wallet_balance >= ?',
            [packageDetails.amountInr, userId, packageDetails.amountInr]
        );

        if (!deductResult || Number(deductResult.affectedRows || 0) === 0) {
            return NextResponse.json({ error: 'Insufficient balance for this package.' }, { status: 400 });
        }

        const result = await query<any>(
            `INSERT INTO fd_deposits (
                user_id,
                amount,
                monthly_rate,
                duration_days,
                start_date,
                end_date,
                phase,
                status,
                profit_sharing_eligible,
                profit_sharing_expiry
            ) VALUES (?, ?, ?, ?, ?, ?, 'phase1_active', 'active', 0, NULL)`,
            [
                userId,
                packageDetails.amountInr,
                packageDetails.monthlyRate,
                durationDays,
                startDate.format('YYYY-MM-DD'),
                endDate.format('YYYY-MM-DD'),
            ]
        );

        await query(
            `INSERT INTO fd_transactions (user_id, type, amount, status, notes, network)
             VALUES (?, 'fd_invest', ?, 'completed', ?, 'BEP20')`,
            [
                userId,
                packageDetails.amountInr,
                `${packageDetails.name} activated: ${packageDetails.amountUsdt.toFixed(2)} USDT at ${packageDetails.monthlyRate}% monthly for ${settings.lockMonths} months`,
            ]
        );

        try {
            await processFDReferralBonusForDeposit(result.insertId);
        } catch (referralError) {
            console.error('FD referral bonus processing failed:', referralError);
        }

        return NextResponse.json({
            message: `${packageDetails.name} created successfully. Your funds are locked for ${settings.lockMonths} months.`,
            fd: {
                id: result.insertId,
                packageName: packageDetails.name,
                amountUsdt: packageDetails.amountUsdt,
                amountInr: packageDetails.amountInr,
                startDate: startDate.format('YYYY-MM-DD'),
                endDate: endDate.format('YYYY-MM-DD'),
                monthlyRate: packageDetails.monthlyRate,
                lockMonths: settings.lockMonths,
                usdtRate: settings.usdtRate,
            },
        });
    } catch (error: any) {
        console.error('FD Invest error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
