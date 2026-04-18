import { query } from '@/lib/db';

export interface FDSettings {
    usdtRate: number;
    lockMonths: number;
    referralBonusRate: number;
    liquidityBonusRate: number;
    starterMinUsdt: number;
    starterMaxUsdt: number;
    starterMonthlyRate: number;
    eliteMinUsdt: number;
    eliteMonthlyRate: number;
}

export interface FDPackageDetails {
    code: 'starter' | 'elite';
    name: string;
    amountUsdt: number;
    amountInr: number;
    monthlyRate: number;
}

const DEFAULT_SETTINGS: FDSettings = {
    usdtRate: 98,
    lockMonths: 6,
    referralBonusRate: 5,
    liquidityBonusRate: 1,
    starterMinUsdt: 50,
    starterMaxUsdt: 1000,
    starterMonthlyRate: 5,
    eliteMinUsdt: 1000,
    eliteMonthlyRate: 6,
};

export function roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
}

export function toUsdt(amountInr: number, usdtRate: number): number {
    if (!usdtRate) return 0;
    return roundCurrency(amountInr / usdtRate);
}

export function toInr(amountUsdt: number, usdtRate: number): number {
    return roundCurrency(amountUsdt * usdtRate);
}

function parseNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function getFDSettings(): Promise<FDSettings> {
    const rows = await query<any[]>(
        `SELECT setting_key, setting_value
         FROM fd_settings
         WHERE setting_key IN (
            'usd_to_inr_rate',
            'fd_lock_months',
            'fd_referral_bonus_rate',
            'fd_liquidity_bonus_rate',
            'fd_starter_min_usdt',
            'fd_starter_max_usdt',
            'fd_starter_monthly_rate',
            'fd_elite_min_usdt',
            'fd_elite_monthly_rate'
         )`
    );

    const map = new Map<string, string>();
    for (const row of rows || []) {
        map.set(row.setting_key, row.setting_value);
    }

    return {
        usdtRate: parseNumber(map.get('usd_to_inr_rate'), DEFAULT_SETTINGS.usdtRate),
        lockMonths: parseNumber(map.get('fd_lock_months'), DEFAULT_SETTINGS.lockMonths),
        referralBonusRate: parseNumber(map.get('fd_referral_bonus_rate'), DEFAULT_SETTINGS.referralBonusRate),
        liquidityBonusRate: parseNumber(map.get('fd_liquidity_bonus_rate'), DEFAULT_SETTINGS.liquidityBonusRate),
        starterMinUsdt: parseNumber(map.get('fd_starter_min_usdt'), DEFAULT_SETTINGS.starterMinUsdt),
        starterMaxUsdt: parseNumber(map.get('fd_starter_max_usdt'), DEFAULT_SETTINGS.starterMaxUsdt),
        starterMonthlyRate: parseNumber(map.get('fd_starter_monthly_rate'), DEFAULT_SETTINGS.starterMonthlyRate),
        eliteMinUsdt: parseNumber(map.get('fd_elite_min_usdt'), DEFAULT_SETTINGS.eliteMinUsdt),
        eliteMonthlyRate: parseNumber(map.get('fd_elite_monthly_rate'), DEFAULT_SETTINGS.eliteMonthlyRate),
    };
}

export function getFDPackageDetails(amountUsdt: number, settings: FDSettings): FDPackageDetails | null {
    if (amountUsdt < settings.starterMinUsdt) {
        return null;
    }

    const amountInr = toInr(amountUsdt, settings.usdtRate);

    if (amountUsdt >= settings.eliteMinUsdt) {
        return {
            code: 'elite',
            name: 'Elite Stacking Pool',
            amountUsdt,
            amountInr,
            monthlyRate: settings.eliteMonthlyRate,
        };
    }

    if (amountUsdt >= settings.starterMinUsdt && amountUsdt < settings.starterMaxUsdt) {
        return {
            code: 'starter',
            name: 'Starter Stacking Pool',
            amountUsdt,
            amountInr,
            monthlyRate: settings.starterMonthlyRate,
        };
    }

    return null;
}

export function getFDPackageName(amountInr: number, monthlyRate: number, settings: FDSettings): string {
    const amountUsdt = toUsdt(amountInr, settings.usdtRate);

    if (monthlyRate >= settings.eliteMonthlyRate || amountUsdt >= settings.eliteMinUsdt) {
        return 'Elite Stacking Pool';
    }

    return 'Starter Stacking Pool';
}
