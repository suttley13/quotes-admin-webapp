import { NextRequest, NextResponse } from 'next/server';

// Manual trigger for daily quote generation (no auth required for testing)
export async function POST(request: NextRequest) {
  try {
    console.log('📨 Manual daily quote generation triggered');

    // Call the existing generate-daily-quote API
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/generate-daily-quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const result = await response.json();

    console.log('✅ Manual daily quote generation result:', result);

    return NextResponse.json({
      success: true,
      message: 'Manual daily quote generation completed',
      result: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Manual daily quote generation error:', error);
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