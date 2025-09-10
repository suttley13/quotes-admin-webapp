import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    // Get the most recent quote that has been delivered to users
    const result = await sql`
      SELECT q.* FROM quotes q
      WHERE EXISTS (
        SELECT 1 FROM notifications n WHERE n.quote_id = q.id AND n.success_count > 0
      )
      ORDER BY q.created_at DESC 
      LIMIT 1
    `;

    if (result.rows.length > 0) {
      const quote = result.rows[0];
      return NextResponse.json({ 
        success: true, 
        quote: {
          id: quote.id,
          text: quote.text,
          author: quote.author,
          biography: quote.biography,
          meaning: quote.meaning,
          application: quote.application,
          authorSummary: quote.author_summary,
          createdAt: quote.created_at
        }
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'No quotes found' 
      }, { status: 404 });
    }
  } catch (error) {
    console.error('Failed to get latest quote:', error);
    return NextResponse.json(
      { error: 'Failed to get latest quote' },
      { status: 500 }
    );
  }
}