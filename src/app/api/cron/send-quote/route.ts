import { NextRequest, NextResponse } from 'next/server';
import { generateQuote } from '@/lib/openai';
import { saveQuote, checkDuplicateQuote, getAllDevices } from '@/lib/db';
import { sendPushNotification } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    // Verify this is called by Vercel Cron (security check)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🚀 Starting automated quote generation and sending...');

    // Generate quote from OpenAI
    const generatedQuote = await generateQuote();
    console.log('✅ Generated quote:', generatedQuote.text.substring(0, 50) + '...');

    // Check for duplicates
    const isDuplicate = await checkDuplicateQuote(generatedQuote.text, generatedQuote.author);
    if (isDuplicate) {
      console.log('⚠️  Duplicate quote detected, skipping');
      return NextResponse.json({ 
        success: false,
        message: 'Duplicate quote detected, skipping this round',
        quote: generatedQuote
      });
    }

    // Save the quote
    const savedQuote = await saveQuote(
      generatedQuote.text,
      generatedQuote.author,
      generatedQuote.biography,
      'vercel-cron'
    );
    console.log('✅ Saved quote with ID:', savedQuote.id);

    // Get all registered devices
    const devices = await getAllDevices();
    console.log('📱 Found', devices.length, 'registered devices');

    if (devices.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Quote generated but no devices to send to',
        quote: savedQuote,
        recipientCount: 0,
        successCount: 0
      });
    }

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

    // Mark quote as sent (you might want to add this to your database schema)
    // await markQuoteAsSent(savedQuote.id);

    return NextResponse.json({
      success: true,
      message: `Quote sent successfully to ${successCount} of ${devices.length} devices`,
      quote: savedQuote,
      recipientCount: devices.length,
      successCount,
      failureCount
    });

  } catch (error: any) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to process automated quote sending',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}