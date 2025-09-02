import { NextRequest, NextResponse } from 'next/server';

// This cron job runs at midnight UTC to generate the daily quote
export async function POST(request: NextRequest) {
  try {
    // Verify this is called by Vercel Cron (security check)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🎯 Daily quote generation cron job started at:', new Date().toISOString());

    // Call our generate-daily-quote API
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/generate-daily-quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!result.success) {
      console.error('❌ Failed to generate daily quote:', result.message);
      return NextResponse.json({
        success: false,
        message: 'Failed to generate daily quote',
        error: result.message
      });
    }

    console.log('✅ Daily quote generated successfully:', result.quote.text.substring(0, 50) + '...');

    return NextResponse.json({
      success: true,
      message: 'Daily quote generated successfully',
      quote: result.quote,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Daily quote generation cron error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to generate daily quote',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}