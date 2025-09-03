import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, deviceToken, notificationTime, timezone } = body;
    
    if (!userId || !deviceToken) {
      return NextResponse.json({ error: 'userId and deviceToken required' }, { status: 400 });
    }

    // Update user with device token and notification preferences
    await sql`
      UPDATE users 
      SET device_token = ${deviceToken},
          notification_time = ${notificationTime || '09:00'},
          timezone = ${timezone || 'America/Chicago'}
      WHERE id = ${userId}
    `;

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}