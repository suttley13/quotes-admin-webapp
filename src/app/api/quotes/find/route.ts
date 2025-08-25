import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');
    const author = searchParams.get('author');
    
    if (!text) {
      return NextResponse.json(
        { error: 'Quote text is required' },
        { status: 400 }
      );
    }

    // Find quote by text and author
    const result = await sql`
      SELECT * FROM quotes 
      WHERE text = ${text} AND author = ${author || null}
      LIMIT 1
    `;

    if (result.rows.length > 0) {
      return NextResponse.json({ 
        success: true, 
        quote: result.rows[0] 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Quote not found' 
      }, { status: 404 });
    }
  } catch (error) {
    console.error('Failed to find quote:', error);
    return NextResponse.json(
      { error: 'Failed to find quote' },
      { status: 500 }
    );
  }
}