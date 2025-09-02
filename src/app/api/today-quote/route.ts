import { NextRequest, NextResponse } from 'next/server';
import { getTodayQuote, getQuoteOfTheDay } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    let quote;
    if (date) {
      quote = await getQuoteOfTheDay(date);
    } else {
      quote = await getTodayQuote();
    }

    if (!quote) {
      return NextResponse.json(
        { success: false, message: 'No quote found for today' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      quote: quote
    });

  } catch (error) {
    console.error('❌ Error fetching today\'s quote:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch today\'s quote' },
      { status: 500 }
    );
  }
}