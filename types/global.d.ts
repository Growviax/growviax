// Type declarations for packages without @types installed
declare module 'jsonwebtoken' {
    export interface JwtPayload {
        [key: string]: any;
    }
    export function sign(payload: string | object | Buffer, secret: string, options?: any): string;
    export function verify(token: string, secret: string, options?: any): JwtPayload | string;
    export function decode(token: string, options?: any): JwtPayload | string | null;
    export default { sign, verify, decode } as const;
}

declare module 'bcryptjs' {
    export function hash(data: string, salt: number | string): Promise<string>;
    export function compare(data: string, encrypted: string): Promise<boolean>;
    export function genSaltSync(rounds?: number): string;
    export function hashSync(data: string, salt: number | string): string;
    export function compareSync(data: string, encrypted: string): boolean;
    export default { hash, compare, genSaltSync, hashSync, compareSync } as const;
}

declare module 'nodemailer' {
    export interface TransportOptions {
        host?: string;
        port?: number;
        secure?: boolean;
        auth?: { user: string; pass: string };
    }
    export interface MailOptions {
        from?: string;
        to?: string;
        subject?: string;
        text?: string;
        html?: string;
    }
    export interface Transporter {
        sendMail(options: MailOptions): Promise<any>;
    }
    export function createTransport(options: TransportOptions): Transporter;
    export default { createTransport } as const;
}
