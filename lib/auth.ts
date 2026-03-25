import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'growviax_secret';

export interface JWTPayload {
    userId: number;
    email: string;
    role: string;
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export function signToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
        return null;
    }
}

export function generateWalletAddress(): string {
    const hex = uuidv4().replace(/-/g, '');
    return '0x' + hex.substring(0, 40);
}

export function generateReferralCode(): string {
    return 'GVX' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// FD Platform token
export interface FDJWTPayload {
    fdUserId: number;
    email: string;
    role: string;
}

export function signFDToken(payload: FDJWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
