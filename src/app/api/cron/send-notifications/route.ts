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

    // Calculate what local time it would be for Central Time users right now
    // CDT (Daylight Time) is UTC-5, CST (Standard Time) is UTC-6
    // Currently in September, we're in Daylight Saving Time (CDT = UTC-5)
    const centralHour = (currentUTCHour - 5 + 24) % 24;
    console.log(`Current UTC time: ${currentUTCHour}:${currentMinute.toString().padStart(2, '0')}, Central time: ${centralHour}:${currentMinute.toString().padStart(2, '0')}`);
    
    // Only check the current CST hour - this will send notifications to users who have their notification time set to this hour
    try {
      const response = await fetch(`${baseUrl}/api/send-daily-notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hour: centralHour, minute: 0 }) // Check for users who want notifications at this Central Time hour
      });

      const result = await response.json();

      if (result.success && result.sentCount > 0) {
        console.log(`✅ Sent ${result.sentCount} notifications for Central time ${centralHour}:00`);
        totalSent += result.sentCount;
        totalFailed += result.failedCount || 0;
        totalUsers += result.totalUsers || 0;
      } else {
        console.log(`No notifications sent for Central time ${centralHour}:00`);
      }
    } catch (error) {
      console.error(`❌ Error checking Central time ${centralHour}:00:`, error);
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