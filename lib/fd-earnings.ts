import dayjs from 'dayjs';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool, { query } from '@/lib/db';
import { getFDPackageName, getFDSettings, roundCurrency, type FDSettings } from '@/lib/fd-config';

interface FDDepositRow extends RowDataPacket {
    id: number;
    user_id: number;
    amount: number | string;
    monthly_rate: number | string;
    duration_days: number;
    start_date: string;
    end_date: string;
    phase: string;
    status: string;
    total_earned: number | string;
}

interface FDUserRow extends RowDataPacket {
    id: number;
    name: string;
    referred_by: string | null;
    is_blocked: number;
}

export interface FDSyncSummary {
    depositsProcessed: number;
    monthlyProfitsCredited: number;
    monthlyProfitAmount: number;
    liquidityBonusesCredited: number;
    liquidityBonusAmount: number;
    principalsReleased: number;
    principalAmount: number;
    referralBonusesCredited: number;
    referralBonusAmount: number;
}

const EMPTY_SUMMARY: FDSyncSummary = {
    depositsProcessed: 0,
    monthlyProfitsCredited: 0,
    monthlyProfitAmount: 0,
    liquidityBonusesCredited: 0,
    liquidityBonusAmount: 0,
    principalsReleased: 0,
    principalAmount: 0,
    referralBonusesCredited: 0,
    referralBonusAmount: 0,
};

function mergeSummary(base: FDSyncSummary, next: FDSyncSummary): FDSyncSummary {
    return {
        depositsProcessed: base.depositsProcessed + next.depositsProcessed,
        monthlyProfitsCredited: base.monthlyProfitsCredited + next.monthlyProfitsCredited,
        monthlyProfitAmount: roundCurrency(base.monthlyProfitAmount + next.monthlyProfitAmount),
        liquidityBonusesCredited: base.liquidityBonusesCredited + next.liquidityBonusesCredited,
        liquidityBonusAmount: roundCurrency(base.liquidityBonusAmount + next.liquidityBonusAmount),
        principalsReleased: base.principalsReleased + next.principalsReleased,
        principalAmount: roundCurrency(base.principalAmount + next.principalAmount),
        referralBonusesCredited: base.referralBonusesCredited + next.referralBonusesCredited,
        referralBonusAmount: roundCurrency(base.referralBonusAmount + next.referralBonusAmount),
    };
}

async function queryOneConnection<T extends RowDataPacket>(connection: PoolConnection, sql: string, params: any[] = []): Promise<T | null> {
    const [rows] = await connection.execute<T[]>(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

function getPayoutMonths(deposit: FDDepositRow): number {
    const diffMonths = dayjs(deposit.end_date).diff(dayjs(deposit.start_date), 'month', true);
    return Math.max(1, Math.round(diffMonths));
}

function getDueDateForMonth(deposit: FDDepositRow, monthNumber: number, payoutMonths: number) {
    const durationDays = Number(deposit.duration_days) || 0;

    if (durationDays > 0 && durationDays <= 90) {
        const daysPerCycle = durationDays / payoutMonths;
        return dayjs(deposit.start_date).add(Math.round(daysPerCycle * monthNumber), 'day').endOf('day');
    }

    return dayjs(deposit.start_date).add(monthNumber, 'month').endOf('day');
}

async function creditLiquidityBonus(
    connection: PoolConnection,
    owner: FDUserRow,
    deposit: FDDepositRow,
    monthNumber: number,
    payoutMonths: number,
    settings: FDSettings,
): Promise<{ credited: boolean; amount: number }> {
    try {
        if (!owner.referred_by) {
            return { credited: false, amount: 0 };
        }

        const referrer = await queryOneConnection<FDUserRow>(
            connection,
            'SELECT id, name, referred_by, is_blocked FROM fd_users WHERE referral_code = ? FOR UPDATE',
            [owner.referred_by]
        );

        if (!referrer || referrer.is_blocked) {
            return { credited: false, amount: 0 };
        }

        const bonusAmount = roundCurrency(Number(deposit.amount) * (settings.liquidityBonusRate / 100));
        if (bonusAmount <= 0) {
            return { credited: false, amount: 0 };
        }

        const eventKey = `liquidity_bonus:${deposit.id}:${monthNumber}`;
        const [insertResult] = await connection.execute<ResultSetHeader>(
            `INSERT IGNORE INTO fd_referral_earnings
             (user_id, from_user_id, fd_deposit_id, amount, type, month_number, event_key)
             VALUES (?, ?, ?, ?, 'liquidity_bonus', ?, ?)`,
            [referrer.id, owner.id, deposit.id, bonusAmount, monthNumber, eventKey]
        );

        if (insertResult.affectedRows === 0) {
            return { credited: false, amount: 0 };
        }

        await connection.execute(
            'UPDATE fd_users SET wallet_balance = wallet_balance + ? WHERE id = ?',
            [bonusAmount, referrer.id]
        );

        await connection.execute(
            `INSERT INTO fd_transactions (user_id, type, amount, status, notes, network)
             VALUES (?, 'liquidity_bonus', ?, 'completed', ?, 'BEP20')`,
            [
                referrer.id,
                bonusAmount,
                `Liquidity provider bonus month ${monthNumber}/${payoutMonths} from ${owner.name}'s ${getFDPackageName(Number(deposit.amount), Number(deposit.monthly_rate), settings)}`,
            ]
        );

        return { credited: true, amount: bonusAmount };
    } catch (error) {
        console.error('FD liquidity bonus error:', error);
        return { credited: false, amount: 0 };
    }
}

async function syncSingleDeposit(depositId: number): Promise<FDSyncSummary> {
    const summary = { ...EMPTY_SUMMARY };
    const settings = await getFDSettings();
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const deposit = await queryOneConnection<FDDepositRow>(
            connection,
            `SELECT id, user_id, amount, monthly_rate, duration_days, start_date, end_date, phase, status, total_earned
             FROM fd_deposits
             WHERE id = ?
             FOR UPDATE`,
            [depositId]
        );

        if (!deposit || ['cancelled', 'withdrawn'].includes(deposit.status)) {
            await connection.rollback();
            return summary;
        }

        const owner = await queryOneConnection<FDUserRow>(
            connection,
            'SELECT id, name, referred_by, is_blocked FROM fd_users WHERE id = ? FOR UPDATE',
            [deposit.user_id]
        );

        if (!owner || owner.is_blocked) {
            await connection.rollback();
            return summary;
        }

        const payoutMonths = getPayoutMonths(deposit);
        const now = dayjs();
        const principalAmount = Number(deposit.amount);
        const monthlyRate = Number(deposit.monthly_rate);
        const packageName = getFDPackageName(principalAmount, monthlyRate, settings);

        let processedThisDeposit = false;

        for (let monthNumber = 1; monthNumber <= payoutMonths; monthNumber += 1) {
            const dueDate = getDueDateForMonth(deposit, monthNumber, payoutMonths);
            if (now.isBefore(dueDate)) {
                break;
            }

            const existingLog = await queryOneConnection<RowDataPacket>(
                connection,
                'SELECT id FROM fd_profit_logs WHERE fd_deposit_id = ? AND month_number = ?',
                [deposit.id, monthNumber]
            );

            if (existingLog) {
                continue;
            }

            const profitAmount = roundCurrency(principalAmount * (monthlyRate / 100));
            if (profitAmount <= 0) {
                continue;
            }

            await connection.execute(
                `INSERT INTO fd_profit_logs (fd_deposit_id, user_id, month_number, amount)
                 VALUES (?, ?, ?, ?)`,
                [deposit.id, deposit.user_id, monthNumber, profitAmount]
            );

            await connection.execute(
                'UPDATE fd_users SET wallet_balance = wallet_balance + ? WHERE id = ?',
                [profitAmount, deposit.user_id]
            );

            await connection.execute(
                `INSERT INTO fd_transactions (user_id, type, amount, status, notes, network)
                 VALUES (?, 'fd_profit', ?, 'completed', ?, 'BEP20')`,
                [
                    deposit.user_id,
                    profitAmount,
                    `Monthly return month ${monthNumber}/${payoutMonths} from ${packageName} at ${monthlyRate}%`,
                ]
            );

            await connection.execute(
                'UPDATE fd_deposits SET total_earned = total_earned + ? WHERE id = ?',
                [profitAmount, deposit.id]
            );

            summary.monthlyProfitsCredited += 1;
            summary.monthlyProfitAmount = roundCurrency(summary.monthlyProfitAmount + profitAmount);
            processedThisDeposit = true;

            const liquidityResult = await creditLiquidityBonus(connection, owner, deposit, monthNumber, payoutMonths, settings);
            if (liquidityResult.credited) {
                summary.liquidityBonusesCredited += 1;
                summary.liquidityBonusAmount = roundCurrency(summary.liquidityBonusAmount + liquidityResult.amount);
            }
        }

        const principalAlreadyReleased = deposit.status === 'completed';
        const hasMatured = now.isSame(dayjs(deposit.end_date), 'day') || now.isAfter(dayjs(deposit.end_date));
        if (!principalAlreadyReleased && hasMatured) {
            await connection.execute(
                'UPDATE fd_users SET wallet_balance = wallet_balance + ? WHERE id = ?',
                [principalAmount, deposit.user_id]
            );

            await connection.execute(
                `INSERT INTO fd_transactions (user_id, type, amount, status, notes, network)
                 VALUES (?, 'fd_return', ?, 'completed', ?, 'BEP20')`,
                [
                    deposit.user_id,
                    principalAmount,
                    `Principal released after ${payoutMonths} months from ${packageName}`,
                ]
            );

            await connection.execute(
                `UPDATE fd_deposits
                 SET status = 'completed',
                     phase = 'phase1_completed',
                     profit_sharing_eligible = 0,
                     profit_sharing_expiry = NULL
                 WHERE id = ?`,
                [deposit.id]
            );

            summary.principalsReleased += 1;
            summary.principalAmount = roundCurrency(summary.principalAmount + principalAmount);
            processedThisDeposit = true;
        }

        await connection.commit();

        if (processedThisDeposit) {
            summary.depositsProcessed = 1;
        }

        return summary;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function syncFDInvestmentsForUser(userId: number): Promise<FDSyncSummary> {
    const deposits = await query<any[]>(
        `SELECT id
         FROM fd_deposits
         WHERE user_id = ?
           AND status IN ('active', 'completed')
           AND phase IN ('phase1_active', 'phase1_completed')
         ORDER BY id ASC`,
        [userId]
    );

    let summary = { ...EMPTY_SUMMARY };
    for (const deposit of deposits || []) {
        summary = mergeSummary(summary, await syncSingleDeposit(Number(deposit.id)));
    }

    return summary;
}

export async function syncAllFDInvestments(): Promise<FDSyncSummary> {
    const deposits = await query<any[]>(
        `SELECT id
         FROM fd_deposits
         WHERE status IN ('active', 'completed')
           AND phase IN ('phase1_active', 'phase1_completed')
         ORDER BY id ASC`
    );

    let summary = { ...EMPTY_SUMMARY };
    for (const deposit of deposits || []) {
        summary = mergeSummary(summary, await syncSingleDeposit(Number(deposit.id)));
    }

    return summary;
}

export async function processFDReferralBonusForDeposit(fdDepositId: number): Promise<FDSyncSummary> {
    const summary = { ...EMPTY_SUMMARY };
    const settings = await getFDSettings();
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const deposit = await queryOneConnection<FDDepositRow>(
            connection,
            `SELECT id, user_id, amount, monthly_rate, duration_days, start_date, end_date, phase, status, total_earned
             FROM fd_deposits
             WHERE id = ?
             FOR UPDATE`,
            [fdDepositId]
        );

        if (!deposit) {
            await connection.rollback();
            return summary;
        }

        const owner = await queryOneConnection<FDUserRow>(
            connection,
            'SELECT id, name, referred_by, is_blocked FROM fd_users WHERE id = ? FOR UPDATE',
            [deposit.user_id]
        );

        if (!owner || !owner.referred_by || owner.is_blocked) {
            await connection.rollback();
            return summary;
        }

        const referrer = await queryOneConnection<FDUserRow>(
            connection,
            'SELECT id, name, referred_by, is_blocked FROM fd_users WHERE referral_code = ? FOR UPDATE',
            [owner.referred_by]
        );

        if (!referrer || referrer.is_blocked) {
            await connection.rollback();
            return summary;
        }

        const bonusAmount = roundCurrency(Number(deposit.amount) * (settings.referralBonusRate / 100));
        if (bonusAmount <= 0) {
            await connection.rollback();
            return summary;
        }

        const eventKey = `referral_bonus:${owner.id}`;
        const [insertResult] = await connection.execute<ResultSetHeader>(
            `INSERT IGNORE INTO fd_referral_earnings
             (user_id, from_user_id, fd_deposit_id, amount, type, month_number, event_key)
             VALUES (?, ?, ?, ?, 'referral_bonus', NULL, ?)`,
            [referrer.id, owner.id, deposit.id, bonusAmount, eventKey]
        );

        if (insertResult.affectedRows === 0) {
            await connection.rollback();
            return summary;
        }

        await connection.execute(
            'UPDATE fd_users SET wallet_balance = wallet_balance + ? WHERE id = ?',
            [bonusAmount, referrer.id]
        );

        await connection.execute(
            `INSERT INTO fd_transactions (user_id, type, amount, status, notes, network)
             VALUES (?, 'referral_bonus', ?, 'completed', ?, 'BEP20')`,
            [
                referrer.id,
                bonusAmount,
                `${settings.referralBonusRate}% referral income from ${owner.name}'s first stacking package`,
            ]
        );

        await connection.commit();

        summary.referralBonusesCredited = 1;
        summary.referralBonusAmount = bonusAmount;
        return summary;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
