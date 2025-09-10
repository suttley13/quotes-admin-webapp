import { NextRequest, NextResponse } from 'next/server';
import { getTodayQuote, getUsersForNotificationTime, saveNotificationRecord, recordQuoteDelivery } from '@/lib/db';
import { initializeFirebase, sendPushNotification } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase
    initializeFirebase();

    // Get today's quote
    const todayQuote = await getTodayQuote();
    if (!todayQuote) {
      return NextResponse.json(
        { success: false, message: 'No quote for today' },
        { status: 404 }
      );
    }

    console.log('📨 Sending daily notifications for quote:', todayQuote.text.substring(0, 50) + '...');

    // Get the current hour and minute (for the specific time-based sending)
    const requestBody = await request.json();
    const { hour, minute = 0 } = requestBody;

    if (hour === undefined) {
      return NextResponse.json(
        { success: false, message: 'Hour parameter is required' },
        { status: 400 }
      );
    }

    // Get users who want notifications at this specific time
    const users = await getUsersForNotificationTime(hour, minute);
    
    if (users.length === 0) {
      console.log(`No users found for ${hour}:${minute.toString().padStart(2, '0')}`);
      return NextResponse.json({ 
        success: true, 
        message: `No users for ${hour}:${minute.toString().padStart(2, '0')}`,
        sentCount: 0
      });
    }

    console.log(`Found ${users.length} users for ${hour}:${minute.toString().padStart(2, '0')}`);

    // Filter users with valid device tokens and get both user data and tokens
    const validUsers = users.filter(user => user.device_token && user.notifications_enabled);
    const deviceTokens = validUsers.map(user => user.device_token!);

    if (deviceTokens.length === 0) {
      console.log('No valid device tokens found');
      return NextResponse.json({ 
        success: true, 
        message: 'No valid device tokens',
        sentCount: 0
      });
    }

    // Prepare notification data
    const title = todayQuote.author || 'Daily Quote';
    const body = todayQuote.text;
    
    // Include all quote data in the notification payload
    const notificationData = {
      type: 'quote_notification',
      quote_text: todayQuote.text,
      quote_author: todayQuote.author || '',
      quote_biography: todayQuote.biography || '',
      quote_meaning: todayQuote.meaning || '',
      quote_application: todayQuote.application || '',
      quote_author_summary: todayQuote.author_summary || '',
      quoteId: todayQuote.id.toString()
    };

    // Send push notifications
    const result = await sendPushNotification(
      deviceTokens,
      title,
      body,
      notificationData
    );

    // Save notification record
    await saveNotificationRecord(
      todayQuote.id,
      deviceTokens.length,
      result.successCount
    );

    // Record delivery for each user (assuming all successful for simplicity)
    // In a production system, you'd want to track individual delivery success/failure
    for (const user of validUsers) {
      try {
        await recordQuoteDelivery(user.id, todayQuote.id);
        console.log(`📝 Recorded delivery for user ${user.id}`);
      } catch (error) {
        console.error(`❌ Failed to record delivery for user ${user.id}:`, error);
      }
    }

    console.log(`✅ Sent notifications: ${result.successCount} success, ${result.failureCount} failures`);

    return NextResponse.json({ 
      success: true, 
      sentCount: result.successCount,
      failedCount: result.failureCount,
      totalUsers: deviceTokens.length,
      message: `Sent ${result.successCount} notifications for ${hour}:${minute.toString().padStart(2, '0')}`
    });

  } catch (error) {
    console.error('❌ Error sending daily notifications:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send notifications' },
      { status: 500 }
    );
  }
}

// GET endpoint to trigger notifications for current hour (for testing)
export async function GET(request: NextRequest) {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  // Create a new request with the current time
  const body = JSON.stringify({ hour, minute });
  const postRequest = new NextRequest(request.url, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' }
  });
  
  return POST(postRequest);
}