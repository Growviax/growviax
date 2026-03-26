import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user';
import { query, queryOne } from '@/lib/db';

// GET: List all FD USDT wallets
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const wallets = await query<any[]>(
            'SELECT * FROM fd_usdt_wallets ORDER BY is_active DESC, created_at DESC'
        ) || [];

        return NextResponse.json({ wallets });
    } catch (error: any) {
        console.error('Admin FD Wallets GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Add new FD USDT wallet
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { walletAddress, qrImage, displayName } = await request.json();

        if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress.trim())) {
            return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 });
        }

        const existing = await queryOne<{ id: number }>(
            'SELECT id FROM fd_usdt_wallets WHERE wallet_address = ?', [walletAddress.trim()]
        );
        if (existing) {
            return NextResponse.json({ error: 'This wallet address already exists' }, { status: 409 });
        }

        await query(
            'INSERT INTO fd_usdt_wallets (wallet_address, qr_image, display_name, is_active) VALUES (?, ?, ?, 1)',
            [walletAddress.trim(), qrImage?.trim() || null, displayName?.trim() || walletAddress.trim()]
        );

        return NextResponse.json({ message: 'FD USDT wallet added successfully' });
    } catch (error: any) {
        console.error('Admin FD Wallets POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH: Update FD USDT wallet
export async function PATCH(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id, walletAddress, qrImage, displayName, isActive } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Wallet ID required' }, { status: 400 });
        }

        const existing = await queryOne<any>('SELECT * FROM fd_usdt_wallets WHERE id = ?', [id]);
        if (!existing) {
            return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
        }

        const updates: string[] = [];
        const params: any[] = [];

        if (walletAddress !== undefined) { updates.push('wallet_address = ?'); params.push(walletAddress.trim()); }
        if (qrImage !== undefined) { updates.push('qr_image = ?'); params.push(qrImage.trim()); }
        if (displayName !== undefined) { updates.push('display_name = ?'); params.push(displayName.trim()); }
        if (isActive !== undefined) { updates.push('is_active = ?'); params.push(isActive ? 1 : 0); }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        params.push(id);
        await query(`UPDATE fd_usdt_wallets SET ${updates.join(', ')} WHERE id = ?`, params);

        return NextResponse.json({ message: 'FD USDT wallet updated' });
    } catch (error: any) {
        console.error('Admin FD Wallets PATCH error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE: Remove FD USDT wallet
export async function DELETE(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Wallet ID required' }, { status: 400 });
        }

        const existing = await queryOne<any>('SELECT * FROM fd_usdt_wallets WHERE id = ?', [id]);
        if (!existing) {
            return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
        }

        await query('DELETE FROM fd_usdt_wallets WHERE id = ?', [id]);

        return NextResponse.json({ message: 'FD USDT wallet deleted' });
    } catch (error: any) {
        console.error('Admin FD Wallets DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
