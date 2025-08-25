import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getQuotes } from '@/lib/db';
import { isAuthorizedEmail } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = user.emailAddresses[0].emailAddress;
    if (!isAuthorizedEmail(email)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sort') as 'favorites' | 'created_at' || 'favorites';

    const quotes = await getQuotes(limit, sortBy);

    return NextResponse.json({
      success: true,
      quotes
    });

  } catch (error: any) {
    console.error('Get quotes error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}