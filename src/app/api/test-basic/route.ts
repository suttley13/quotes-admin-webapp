import { NextRequest, NextResponse } from 'next/server';
import { getTodayQuote, setTodayQuote } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('Testing basic functionality...');

    // Test 1: Check environment variables
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasFirebase = !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const hasDB = !!process.env.DATABASE_URL;

    console.log('Environment check:', { hasOpenAI, hasFirebase, hasDB });

    // Test 2: Test database connection
    console.log('Testing database...');
    const existingQuote = await getTodayQuote();
    console.log('Today quote check:', !!existingQuote);

    // Test 3: Test external API call (not OpenAI)
    console.log('Testing external API...');
    const testResponse = await fetch('https://httpbin.org/json', {
      signal: AbortSignal.timeout(5000)
    });
    const testData = await testResponse.json();
    console.log('External API test success');

    return NextResponse.json({ 
      success: true, 
      message: 'All basic tests passed',
      results: {
        environment: { hasOpenAI, hasFirebase, hasDB },
        database: { hasTodayQuote: !!existingQuote },
        externalAPI: { success: true, slideshow: testData.slideshow.title }
      }
    });

  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Test failed',
      error: error.message
    }, { status: 500 });
  }
}