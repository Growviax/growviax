import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { queryOne } from '@/lib/db';

export interface FDUser {
    id: number;
    name: string;
    email: string;
    phone: string;
    wallet_balance: number;
    total_deposited: number;
    referral_code: string;
    referred_by: string | null;
    role: string;
    is_verified: number;
    is_blocked: number;
    profit_sharing_enabled: number;
    created_at: string;
}

export async function getCurrentFDUser(): Promise<FDUser | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('fd_token')?.value;

        if (!token) return null;

        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'growviax_secret');
        const { payload } = await jwtVerify(token, secret);
        const fdUserId = (payload as any).fdUserId;

        if (!fdUserId) return null;

        const user = await queryOne<FDUser>(
            'SELECT id, name, email, phone, wallet_balance, total_deposited, referral_code, referred_by, role, is_verified, is_blocked, profit_sharing_enabled, created_at FROM fd_users WHERE id = ?',
            [fdUserId]
        );

        return user;
    } catch {
        return null;
    }
}

export async function getFDUserIdFromRequest(request: Request): Promise<number | null> {
    try {
        const cookieHeader = request.headers.get('cookie') || '';
        const tokenMatch = cookieHeader.match(/fd_token=([^;]+)/);
        const token = tokenMatch?.[1];

        if (!token) return null;

        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'growviax_secret');
        const { payload } = await jwtVerify(token, secret);

        return (payload as any).fdUserId || null;
    } catch {
        return null;
    }
}
