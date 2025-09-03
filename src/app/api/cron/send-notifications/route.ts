import { NextRequest, NextResponse } from 'next/server';

// This cron job runs every hour to send notifications to users at their configured time
export async function POST(request: NextRequest) {
  try {
    // Verify this is called by Vercel Cron (security check)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUTCHour = new Date().getUTCHours();
    const currentMinute = new Date().getUTCMinutes();
    console.log(`📨 Notification sending cron job started for UTC ${currentUTCHour}:${currentMinute.toString().padStart(2, '0')}`);

    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    let totalSent = 0;
    let totalFailed = 0;
    let totalUsers = 0;

    // Check all possible local hours (0-23) to see if any match the current UTC time
    // when converted from their respective timezones
    for (let localHour = 0; localHour < 24; localHour++) {
      // Test with both minute 0 and current minute for more precision
      const testMinutes = [0, 15, 30, 45]; // Check common notification times
      
      for (const minute of testMinutes) {
        try {
          const response = await fetch(`${baseUrl}/api/send-daily-notifications`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ hour: localHour, minute })
          });

          const result = await response.json();

          if (result.success && result.sentCount > 0) {
            console.log(`✅ Sent ${result.sentCount} notifications for local time ${localHour}:${minute.toString().padStart(2, '0')}`);
            totalSent += result.sentCount;
            totalFailed += result.failedCount || 0;
            totalUsers += result.totalUsers || 0;
          }
        } catch (error) {
          console.error(`❌ Error checking time ${localHour}:${minute.toString().padStart(2, '0')}:`, error);
        }
      }
    }

    console.log(`✅ Total notifications sent this hour: ${totalSent}, failed: ${totalFailed}, total users checked: ${totalUsers}`);

    return NextResponse.json({
      success: true,
      message: `Notification cron completed for UTC hour ${currentUTCHour}`,
      sentCount: totalSent,
      failedCount: totalFailed,
      totalUsers: totalUsers,
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