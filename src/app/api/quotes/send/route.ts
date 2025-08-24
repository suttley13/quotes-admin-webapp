import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getActiveDeviceTokens, markQuoteAsSent, saveNotificationRecord } from '@/lib/db';
import { sendPushNotification } from '@/lib/firebase';
import { isAuthorizedEmail, validateApiKey } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { quoteId, quote } = requestBody;

    // Check authentication - either Clerk user or API key
    let isAuthorized = false;
    let userId = null;

    // Check for API key (for GitHub Actions)
    const apiKey = request.headers.get('x-api-key');
    if (apiKey && validateApiKey(apiKey)) {
      isAuthorized = true;
      userId = 'github-action';
    } else {
      // Check Clerk authentication
      const user = await currentUser();
      if (user?.emailAddresses?.[0]?.emailAddress) {
        const email = user.emailAddresses[0].emailAddress;
        if (isAuthorizedEmail(email)) {
          isAuthorized = true;
          userId = user.id;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!quoteId || !quote) {
      return NextResponse.json({ error: 'Quote ID and quote data required' }, { status: 400 });
    }

    // Get all active device tokens
    const deviceTokens = await getActiveDeviceTokens();
    
    if (deviceTokens.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No active devices to send to',
        recipientCount: 0,
        successCount: 0
      });
    }

    const tokens = deviceTokens.map(device => device.token);

    // Send push notification
    const title = quote.author || 'Inspirational Quote';
    const body = quote.text;
    const data = {
      type: 'quote_notification',
      quote_id: quoteId.toString(),
      quote_text: quote.text,
      quote_author: quote.author || '',
      quote_biography: quote.biography || '',
      quote_meaning: quote.meaning || '',
      quote_application: quote.application || '',
      quote_author_summary: quote.author_summary || ''
    };

    const result = await sendPushNotification(tokens, title, body, data);

    // Mark quote as sent
    await markQuoteAsSent(quoteId);

    // Save notification record
    await saveNotificationRecord(quoteId, tokens.length, result.successCount);

    return NextResponse.json({
      success: true,
      recipientCount: tokens.length,
      successCount: result.successCount,
      failureCount: result.failureCount
    });

  } catch (error: any) {
    console.error('Send quote error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send quote' },
      { status: 500 }
    );
  }
}