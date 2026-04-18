import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json(
        { error: 'FD deposits are available only in USDT (BEP20).' },
        { status: 410 }
    );
}
