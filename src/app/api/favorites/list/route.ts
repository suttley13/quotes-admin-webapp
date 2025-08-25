import { NextRequest, NextResponse } from 'next/server';
import { getUserFavorites, getUserByDeviceId } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    
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

    // Get user's favorite quotes
    const favorites = await getUserFavorites(user.id);

    return NextResponse.json({ 
      success: true, 
      favorites 
    });
  } catch (error) {
    console.error('Failed to get user favorites:', error);
    return NextResponse.json(
      { error: 'Failed to get favorites' },
      { status: 500 }
    );
  }
}