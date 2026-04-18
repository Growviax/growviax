import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        message: 'Legacy profit sharing is disabled for the FD section.',
        distributions: [],
        eligibleUsers: [],
        eligibleCount: 0,
        totalDistributed: 0,
    });
}

export async function POST() {
    return NextResponse.json(
        { error: 'Profit sharing is disabled for the FD section.' },
        { status: 410 }
    );
}
