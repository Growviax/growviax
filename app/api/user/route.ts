import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/user';
import { query, queryOne } from '@/lib/db';
import { hashPassword, comparePassword } from '@/lib/auth';
import { z } from 'zod';

const updateSchema = z.object({
    name: z.string().min(2).optional(),
    phone: z.string().min(10).optional(),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
});

export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await queryOne<any>(
            'SELECT id, name, email, phone, wallet_address, wallet_balance, referral_code, referred_by, role, is_verified, created_at FROM users WHERE id = ?',
            [userId]
        );

        return NextResponse.json({ user });
    } catch (error: any) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();

        // Handle password change
        if (body.currentPassword && body.newPassword) {
            const parsed = passwordSchema.safeParse(body);
            if (!parsed.success) {
                return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
            }

            const user = await queryOne<any>('SELECT password_hash FROM users WHERE id = ?', [userId]);
            const isValid = await comparePassword(parsed.data.currentPassword, user.password_hash);

            if (!isValid) {
                return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
            }

            const newHash = await hashPassword(parsed.data.newPassword);
            await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

            return NextResponse.json({ message: 'Password changed successfully' });
        }

        // Handle profile update
        const parsed = updateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const updates: string[] = [];
        const values: any[] = [];

        if (parsed.data.name) {
            updates.push('name = ?');
            values.push(parsed.data.name);
        }
        if (parsed.data.phone) {
            updates.push('phone = ?');
            values.push(parsed.data.phone);
        }

        if (updates.length > 0) {
            values.push(userId);
            await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        return NextResponse.json({ message: 'Profile updated successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
