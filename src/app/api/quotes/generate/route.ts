import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { generateQuote } from '@/lib/openai';
import { saveQuote, checkDuplicateQuote, getActiveDeviceTokens, saveNotificationRecord, markQuoteAsSent } from '@/lib/db';
import { isAuthorizedEmail } from '@/lib/auth';
import { sendPushNotification } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  return handleQuoteGeneration(request);
}

export async function GET(request: NextRequest) {
  return handleQuoteGeneration(request);
}

async function handleQuoteGeneration(request: NextRequest) {
  try {
    // Check for API key authentication (for GitHub Actions)
    const apiKey = request.headers.get('x-api-key');
    const isApiKeyAuth = apiKey === process.env.API_SECRET_KEY;
    
    let user = null;
    if (!isApiKeyAuth) {
      // Fall back to Clerk user authentication
      user = await currentUser();
      
      if (!user?.emailAddresses?.[0]?.emailAddress) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const email = user.emailAddresses[0].emailAddress;
      if (!isAuthorizedEmail(email)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Generate quote from OpenAI
    const generatedQuote = await generateQuote();

    // Check for duplicates
    const isDuplicate = await checkDuplicateQuote(generatedQuote.text, generatedQuote.author);
    if (isDuplicate) {
      return NextResponse.json({ 
        error: 'Duplicate quote detected',
        quote: generatedQuote,
        duplicate: true 
      }, { status: 409 });
    }

    // Save the quote
    const userId = isApiKeyAuth ? 'github-actions' : user?.id;
    const savedQuote = await saveQuote(
      generatedQuote.text,
      generatedQuote.author,
      generatedQuote.biography,
      userId
    );

    // Check if this is an automated call (API key auth = automated, no user = automated)
    const userAgent = request.headers.get('user-agent') || '';
    const isAutomatedCall = isApiKeyAuth || !user;
    
    console.log('User-Agent:', userAgent);
    console.log('Is API Key Auth:', isApiKeyAuth);
    console.log('Is Automated Call:', isAutomatedCall);

    if (isAutomatedCall) {
      console.log('🤖 Auto-sending push notifications (Automated call detected) - v2');
      
      // Get all registered devices
      const devices = await getActiveDeviceTokens();
      console.log('📱 Found', devices.length, 'registered devices');

      if (devices.length > 0) {
        // Send push notifications
        const tokens = devices.map(device => device.token);
        const { successCount, failureCount } = await sendPushNotification(
          tokens,
          'Daily Inspiration',
          `"${generatedQuote.text}" - ${generatedQuote.author}`,
          {
            quoteId: savedQuote.id.toString(),
            author: generatedQuote.author,
            biography: generatedQuote.biography || ''
          }
        );

        console.log(`✅ Push notifications sent: ${successCount} successful, ${failureCount} failed`);

        // Mark quote as sent and save notification record
        await markQuoteAsSent(savedQuote.id);
        await saveNotificationRecord(savedQuote.id, devices.length, successCount);

        return NextResponse.json({
          success: true,
          quote: savedQuote,
          notifications: {
            recipientCount: devices.length,
            successCount,
            failureCount
          },
          message: `Quote generated and sent to ${successCount} of ${devices.length} devices`
        });
      } else {
        return NextResponse.json({
          success: true,
          quote: savedQuote,
          message: 'Quote generated but no devices to send to'
        });
      }
    }

    return NextResponse.json({
      success: true,
      quote: savedQuote
    });

  } catch (error: any) {
    console.error('Quote generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate quote' },
      { status: 500 }
    );
  }
}