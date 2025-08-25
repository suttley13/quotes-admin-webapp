import { NextRequest, NextResponse } from 'next/server';
import { toggleFavorite, getUserByDeviceId } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, quoteId } = body;
    
    if (!deviceId || !quoteId) {
      return NextResponse.json(
        { error: 'Device ID and Quote ID are required' },
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

    // Toggle favorite
    const result = await toggleFavorite(user.id, parseInt(quoteId));

    return NextResponse.json({ 
      success: true, 
      favorited: result.favorited 
    });
  } catch (error) {
    console.error('Failed to toggle favorite:', error);
    return NextResponse.json(
      { error: 'Failed to toggle favorite' },
      { status: 500 }
    );
  }
}