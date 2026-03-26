import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { query, queryOne } from '@/lib/db';

// GET: List all FD UPI accounts
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const accounts = await query<any[]>(
            'SELECT * FROM fd_upi_accounts ORDER BY is_active DESC, created_at DESC'
        ) || [];

        return NextResponse.json({ accounts });
    } catch (error: any) {
        console.error('Admin FD UPI GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Add new FD UPI account
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { upiId, displayName } = await request.json();

        if (!upiId || !upiId.includes('@')) {
            return NextResponse.json({ error: 'Invalid UPI ID format' }, { status: 400 });
        }

        const existing = await queryOne<{ id: number }>(
            'SELECT id FROM fd_upi_accounts WHERE upi_id = ?', [upiId.trim()]
        );
        if (existing) {
            return NextResponse.json({ error: 'This UPI ID already exists' }, { status: 409 });
        }

        await query(
            'INSERT INTO fd_upi_accounts (upi_id, display_name, is_active) VALUES (?, ?, 1)',
            [upiId.trim(), displayName?.trim() || upiId.trim()]
        );

        return NextResponse.json({ message: 'FD UPI account added successfully' });
    } catch (error: any) {
        console.error('Admin FD UPI POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH: Update FD UPI account
export async function PATCH(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id, upiId, displayName, isActive } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'UPI account ID required' }, { status: 400 });
        }

        const existing = await queryOne<any>('SELECT * FROM fd_upi_accounts WHERE id = ?', [id]);
        if (!existing) {
            return NextResponse.json({ error: 'UPI account not found' }, { status: 404 });
        }

        const updates: string[] = [];
        const params: any[] = [];

        if (upiId !== undefined) { updates.push('upi_id = ?'); params.push(upiId.trim()); }
        if (displayName !== undefined) { updates.push('display_name = ?'); params.push(displayName.trim()); }
        if (isActive !== undefined) { updates.push('is_active = ?'); params.push(isActive ? 1 : 0); }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        params.push(id);
        await query(`UPDATE fd_upi_accounts SET ${updates.join(', ')} WHERE id = ?`, params);

        return NextResponse.json({ message: 'FD UPI account updated' });
    } catch (error: any) {
        console.error('Admin FD UPI PATCH error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE: Remove FD UPI account
export async function DELETE(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'UPI account ID required' }, { status: 400 });
        }

        const existing = await queryOne<any>('SELECT * FROM fd_upi_accounts WHERE id = ?', [id]);
        if (!existing) {
            return NextResponse.json({ error: 'UPI account not found' }, { status: 404 });
        }

        await query('DELETE FROM fd_upi_accounts WHERE id = ?', [id]);

        return NextResponse.json({ message: 'FD UPI account deleted' });
    } catch (error: any) {
        console.error('Admin FD UPI DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
