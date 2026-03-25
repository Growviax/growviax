import { NextResponse } from 'next/server';
import { getFDUserIdFromRequest } from '@/lib/fd-user';
import { query, queryOne } from '@/lib/db';
import { z } from 'zod';

const ticketSchema = z.object({
    subject: z.string().min(3, 'Subject too short'),
    description: z.string().min(10, 'Description too short'),
});

export async function GET(request: Request) {
    try {
        const userId = await getFDUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tickets = await query<any[]>(
            'SELECT * FROM fd_support_tickets WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        return NextResponse.json({ tickets });
    } catch (error: any) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const userId = await getFDUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const parsed = ticketSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const { subject, description } = parsed.data;

        await query(
            'INSERT INTO fd_support_tickets (user_id, subject, description) VALUES (?, ?, ?)',
            [userId, subject, description]
        );

        return NextResponse.json({ message: 'Support ticket created successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
