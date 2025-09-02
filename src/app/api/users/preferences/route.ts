import { NextRequest, NextResponse } from 'next/server';
import { updateUserPreferences, getUserByDeviceId } from '@/lib/db';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, notificationTime, timezone, deviceToken, notificationsEnabled } = body;

    if (!deviceId) {
      return NextResponse.json(
        { success: false, message: 'Device ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await getUserByDeviceId(deviceId);
    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Update user preferences
    const updatedUser = await updateUserPreferences(deviceId, {
      notificationTime,
      timezone,
      deviceToken,
      notificationsEnabled
    });

    console.log('✅ Updated user preferences for device:', deviceId);

    return NextResponse.json({ 
      success: true, 
      user: updatedUser,
      message: 'Preferences updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating user preferences:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}