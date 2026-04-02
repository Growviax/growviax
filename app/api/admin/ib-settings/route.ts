import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { query, queryOne } from '@/lib/db';
import { DEFAULT_SALARY_TIERS } from '@/lib/salary';
import type { SalaryTier } from '@/lib/salary';

const SETTINGS_KEY = 'ib_salary_tiers';

// GET: Return current IB milestone tiers
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        let tiers: SalaryTier[] = DEFAULT_SALARY_TIERS;
        try {
            const row = await queryOne<{ setting_value: string }>(
                'SELECT setting_value FROM platform_settings WHERE setting_key = ?',
                [SETTINGS_KEY]
            );
            if (row?.setting_value) {
                const parsed = JSON.parse(row.setting_value);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    tiers = parsed;
                }
            }
        } catch { }

        return NextResponse.json({ tiers });
    } catch (error: any) {
        console.error('IB settings GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Save updated IB milestone tiers
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { tiers } = await request.json();

        if (!Array.isArray(tiers) || tiers.length === 0) {
            return NextResponse.json({ error: 'Tiers must be a non-empty array' }, { status: 400 });
        }

        // Validate each tier
        for (let i = 0; i < tiers.length; i++) {
            const t = tiers[i];
            if (
                typeof t.minDirect !== 'number' || t.minDirect < 0 ||
                typeof t.minActive !== 'number' || t.minActive < 0 ||
                typeof t.minDeposit !== 'number' || t.minDeposit < 0 ||
                typeof t.dailySalary !== 'number' || t.dailySalary < 0
            ) {
                return NextResponse.json({ error: `Invalid tier at index ${i}. All values must be non-negative numbers.` }, { status: 400 });
            }
            // Assign sequential IDs
            tiers[i].id = i + 1;
        }

        const tiersJson = JSON.stringify(tiers);

        await query(
            'INSERT INTO platform_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            [SETTINGS_KEY, tiersJson, tiersJson]
        );

        return NextResponse.json({ message: 'IB salary tiers updated successfully', tiers });
    } catch (error: any) {
        console.error('IB settings POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
