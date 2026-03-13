import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { queryOne } from '@/lib/db';

export interface CurrentUser {
    id: number;
    name: string;
    email: string;
    phone: string;
    wallet_address: string;
    wallet_balance: number;
    referral_code: string;
    referred_by: string | null;
    role: string;
    is_verified: number;
    created_at: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) return null;

        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'growviax_secret');
        const { payload } = await jwtVerify(token, secret);
        const userId = (payload as any).userId;

        if (!userId) return null;

        const user = await queryOne<CurrentUser>(
            'SELECT id, name, email, phone, wallet_address, wallet_balance, referral_code, referred_by, role, is_verified, created_at FROM users WHERE id = ?',
            [userId]
        );

        return user;
    } catch {
        return null;
    }
}

export async function getUserIdFromRequest(request: Request): Promise<number | null> {
    try {
        const cookieHeader = request.headers.get('cookie') || '';
        const tokenMatch = cookieHeader.match(/token=([^;]+)/);
        const token = tokenMatch?.[1];

        if (!token) return null;

        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'growviax_secret');
        const { payload } = await jwtVerify(token, secret);

        return (payload as any).userId || null;
    } catch {
        return null;
    }
}
