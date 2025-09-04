import { NextRequest, NextResponse } from 'next/server';

// Manual trigger for notification sending (no auth required for testing)
export async function POST(request: NextRequest) {
  try {
    console.log('📨 Manual notification sending triggered');

    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    let totalSent = 0;
    let totalFailed = 0;
    let totalUsers = 0;

    // Check all possible local hours (0-23) for notifications
    for (let localHour = 0; localHour < 24; localHour++) {
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

    console.log(`✅ Total notifications sent: ${totalSent}, failed: ${totalFailed}`);

    return NextResponse.json({
      success: true,
      message: 'Manual notification sending completed',
      sentCount: totalSent,
      failedCount: totalFailed,
      totalUsers: totalUsers,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Manual notification sending error:', error);
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