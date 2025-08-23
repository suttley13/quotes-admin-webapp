import { NextRequest, NextResponse } from 'next/server';
import { registerDeviceToken } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, userId } = body;

    if (!token) {
      return NextResponse.json({ error: 'Device token required' }, { status: 400 });
    }

    await registerDeviceToken(token, userId);

    return NextResponse.json({
      success: true,
      message: 'Device token registered successfully'
    });

  } catch (error: any) {
    console.error('Device registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to register device' },
      { status: 500 }
    );
  }
}