import { NextRequest, NextResponse } from 'next/server';
import { saveQuote, checkDuplicateQuote } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, author, biography, meaning, application, authorSummary } = body;
    
    if (!text) {
      return NextResponse.json(
        { error: 'Quote text is required' },
        { status: 400 }
      );
    }

    // Check for duplicates
    const isDuplicate = await checkDuplicateQuote(text, author || null);
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Quote already exists', duplicate: true },
        { status: 409 }
      );
    }

    const quote = await saveQuote({
      text,
      author: author || null,
      biography: biography || null,
      meaning: meaning || null,
      application: application || null,
      authorSummary: authorSummary || null
    });

    return NextResponse.json({ success: true, quote });
  } catch (error) {
    console.error('Failed to save quote:', error);
    return NextResponse.json(
      { error: 'Failed to save quote' },
      { status: 500 }
    );
  }
}