import { NextResponse } from 'next/server';

export async function POST() {
    const response = NextResponse.json({ message: 'Logged out successfully' });
    response.cookies.delete('fd_token');
    return response;
}
