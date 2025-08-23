import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { generateQuote } from '@/lib/openai';
import { saveQuote, checkDuplicateQuote } from '@/lib/db';
import { isAuthorizedEmail } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = user.emailAddresses[0].emailAddress;
    if (!isAuthorizedEmail(email)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
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

    // Save the quote but don't mark as sent yet
    const savedQuote = await saveQuote(
      generatedQuote.text,
      generatedQuote.author,
      generatedQuote.biography,
      user.id
    );

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