import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/user';
import { query } from '@/lib/db';
import { z } from 'zod';

const createTicketSchema = z.object({
    subject: z.string().min(3, 'Subject is required'),
    description: z.string().min(10, 'Description is required'),
    attachmentUrl: z.string().optional(),
});

const replySchema = z.object({
    ticketId: z.number(),
    message: z.string().min(1, 'Message is required'),
});

export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const ticketId = searchParams.get('ticketId');

        if (ticketId) {
            // Fetch single ticket with replies
            const ticket = await query<any[]>(
                'SELECT * FROM support_tickets WHERE id = ? AND user_id = ?',
                [parseInt(ticketId), userId]
            );
            if (!ticket || ticket.length === 0) {
                return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
            }

            const replies = await query<any[]>(
                `SELECT tr.*, u.name as sender_name, u.role as sender_role 
                 FROM ticket_replies tr 
                 LEFT JOIN users u ON tr.user_id = u.id 
                 WHERE tr.ticket_id = ? 
                 ORDER BY tr.created_at ASC`,
                [parseInt(ticketId)]
            );

            return NextResponse.json({ ticket: ticket[0], replies: replies || [] });
        }

        const tickets = await query<any[]>(
            'SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        return NextResponse.json({ tickets: tickets || [] });
    } catch (error: any) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();

        // Check if this is a reply or a new ticket
        if (body.ticketId && body.message) {
            const parsed = replySchema.safeParse(body);
            if (!parsed.success) {
                return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
            }

            // Verify the ticket belongs to this user
            const ticket = await query<any[]>(
                'SELECT id FROM support_tickets WHERE id = ? AND user_id = ?',
                [parsed.data.ticketId, userId]
            );
            if (!ticket || ticket.length === 0) {
                return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
            }

            await query(
                'INSERT INTO ticket_replies (ticket_id, user_id, message) VALUES (?, ?, ?)',
                [parsed.data.ticketId, userId, parsed.data.message]
            );

            return NextResponse.json({ message: 'Reply sent' });
        }

        // Create new ticket
        const parsed = createTicketSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const { subject, description, attachmentUrl } = parsed.data;

        await query(
            'INSERT INTO support_tickets (user_id, subject, description, attachment_url) VALUES (?, ?, ?, ?)',
            [userId, subject, description, attachmentUrl || null]
        );

        return NextResponse.json({ message: 'Ticket created successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
