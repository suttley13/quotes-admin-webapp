import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getUserByDeviceId } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId } = body;
    
    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    // Get user by device ID
    const user = await getUserByDeviceId(deviceId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please register first.' },
        { status: 404 }
      );
    }

    // Clear all favorites for this user
    const result = await sql`
      DELETE FROM user_favorites 
      WHERE user_id = ${user.id}
    `;

    const deletedCount = result.rowCount || 0;

    return NextResponse.json({ 
      success: true, 
      deletedCount 
    });
  } catch (error) {
    console.error('Failed to clear favorites:', error);
    return NextResponse.json(
      { error: 'Failed to clear favorites' },
      { status: 500 }
    );
  }
}