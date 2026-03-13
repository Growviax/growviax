import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { query } from '@/lib/db';

// GET: All support tickets (admin only)
export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        let where = '';
        const params: any[] = [];
        if (status) { where = 'WHERE st.status = ?'; params.push(status); }

        const tickets = await query<any[]>(
            `SELECT st.*, u.name as user_name, u.email as user_email FROM support_tickets st LEFT JOIN users u ON st.user_id = u.id ${where} ORDER BY st.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
            params
        );

        return NextResponse.json({ tickets: tickets || [] });
    } catch (error: any) {
        console.error('Admin support error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH: Resolve/close ticket (admin only)
export async function PATCH(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { ticketId, status, reply } = await request.json();

        if (!ticketId) {
            return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 });
        }

        if (status) {
            await query('UPDATE support_tickets SET status = ? WHERE id = ?', [status, ticketId]);
        }

        if (reply) {
            await query(
                'INSERT INTO ticket_replies (ticket_id, user_id, message) VALUES (?, ?, ?)',
                [ticketId, user.id, reply]
            );
        }

        return NextResponse.json({ message: 'Ticket updated' });
    } catch (error: any) {
        console.error('Admin support patch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
