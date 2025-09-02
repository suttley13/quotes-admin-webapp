import { NextRequest, NextResponse } from 'next/server';

// This cron job runs every hour to send notifications to users at their configured time
export async function POST(request: NextRequest) {
  try {
    // Verify this is called by Vercel Cron (security check)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentHour = new Date().getUTCHours();
    console.log(`📨 Notification sending cron job started for UTC hour: ${currentHour}`);

    // Call our send-daily-notifications API for the current hour
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/send-daily-notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hour: currentHour, minute: 0 })
    });

    const result = await response.json();

    if (!result.success) {
      console.error('❌ Failed to send notifications:', result.message);
      return NextResponse.json({
        success: false,
        message: 'Failed to send notifications',
        error: result.message
      });
    }

    console.log(`✅ Notifications sent for hour ${currentHour}: ${result.sentCount} sent`);

    return NextResponse.json({
      success: true,
      message: `Notifications sent for hour ${currentHour}`,
      sentCount: result.sentCount,
      failedCount: result.failedCount || 0,
      totalUsers: result.totalUsers || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Notification sending cron error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to send notifications',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}