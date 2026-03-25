import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const settings = await query<any[]>('SELECT * FROM fd_settings ORDER BY id');
        const settingsMap: Record<string, string> = {};
        settings.forEach((s: any) => { settingsMap[s.setting_key] = s.setting_value; });
        return NextResponse.json({ settings: settingsMap });
    } catch (error: any) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { settings } = body;

        if (!settings || typeof settings !== 'object') return NextResponse.json({ error: 'Invalid settings' }, { status: 400 });

        for (const [key, value] of Object.entries(settings)) {
            await query(
                'INSERT INTO fd_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                [key, String(value), String(value)]
            );
        }

        return NextResponse.json({ message: 'Settings updated' });
    } catch (error: any) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
