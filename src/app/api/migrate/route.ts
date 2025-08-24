import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { currentUser } from '@clerk/nextjs/server';
import { isAuthorizedEmail } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await currentUser();
    
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = user.emailAddresses[0].emailAddress;
    if (!isAuthorizedEmail(email)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    console.log('Running database migration...');

    // Add new columns to existing table if they don't exist
    await sql`
      ALTER TABLE quotes 
      ADD COLUMN IF NOT EXISTS meaning TEXT,
      ADD COLUMN IF NOT EXISTS application TEXT,
      ADD COLUMN IF NOT EXISTS author_summary TEXT
    `;

    console.log('Database migration completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully'
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: error.message || 'Migration failed' },
      { status: 500 }
    );
  }
}