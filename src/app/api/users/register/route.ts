import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, deviceToken, notificationTime, timezone } = body;
    
    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    // Always call registerUser - it uses ON CONFLICT to update existing users
    const user = await registerUser(deviceId, deviceToken, notificationTime, timezone);
    console.log(`User registered/updated with device ID: ${deviceId}, timezone: ${timezone}, time: ${notificationTime}, deviceToken: ${deviceToken ? 'present' : 'null'}`);

    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        deviceId: user.device_id,
        createdAt: user.created_at,
        notificationTime: user.notification_time,
        timezone: user.timezone,
        notificationsEnabled: user.notifications_enabled,
        deviceToken: user.device_token
      }
    });
  } catch (error) {
    console.error('Failed to register user:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}