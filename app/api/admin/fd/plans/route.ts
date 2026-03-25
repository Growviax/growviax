import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const plans = await query<any[]>(
            `SELECT fd.*, fu.name, fu.email FROM fd_deposits fd 
             JOIN fd_users fu ON fd.user_id = fu.id 
             ORDER BY fd.created_at DESC LIMIT 100`
        );

        return NextResponse.json({ plans });
    } catch (error: any) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
