import { NextRequest, NextResponse } from 'next/server';
import { registerUser, getUserByDeviceId } from '@/lib/db';

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

    // Check if user already exists
    let user = await getUserByDeviceId(deviceId);
    
    if (!user) {
      // Create new user
      user = await registerUser(deviceId);
      console.log(`New user registered with device ID: ${deviceId}`);
    } else {
      console.log(`Existing user found for device ID: ${deviceId}`);
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        deviceId: user.device_id,
        createdAt: user.created_at
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