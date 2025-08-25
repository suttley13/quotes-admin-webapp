import { NextRequest, NextResponse } from 'next/server';
import { getAllQuotesWithFavoriteStatus, getUserByDeviceId } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const limitParam = searchParams.get('limit');
    
    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    const limit = limitParam ? parseInt(limitParam) : 50;

    // Get user by device ID
    const user = await getUserByDeviceId(deviceId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please register first.' },
        { status: 404 }
      );
    }

    // Get all quotes with favorite status for this user
    const quotes = await getAllQuotesWithFavoriteStatus(user.id, limit);

    return NextResponse.json({ 
      success: true, 
      quotes 
    });
  } catch (error) {
    console.error('Failed to get quotes:', error);
    return NextResponse.json(
      { error: 'Failed to get quotes' },
      { status: 500 }
    );
  }
}