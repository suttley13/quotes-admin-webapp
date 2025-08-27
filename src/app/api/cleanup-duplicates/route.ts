import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Starting duplicate quote cleanup...');

    // Find duplicate quotes (same text and author combination)
    const duplicatesResult = await sql`
      SELECT text, author, COUNT(*) as count, ARRAY_AGG(id ORDER BY created_at ASC) as ids
      FROM quotes 
      GROUP BY text, author
      HAVING COUNT(*) > 1
    `;

    const duplicates = duplicatesResult.rows;
    console.log(`Found ${duplicates.length} sets of duplicates`);

    let totalDeleted = 0;

    for (const duplicate of duplicates) {
      const { text, author, count, ids } = duplicate;
      console.log(`Processing duplicate: "${text.substring(0, 50)}..." by ${author || 'Unknown'} (${count} copies)`);

      // Keep the first (oldest) quote, delete the rest
      const idsToDelete = ids.slice(1); // Remove first ID (keep it)
      
      if (idsToDelete.length > 0) {
        // First, remove any favorites for the quotes we're about to delete
        await sql`
          DELETE FROM user_favorites 
          WHERE quote_id = ANY(${idsToDelete})
        `;

        // Then delete the duplicate quotes
        const deleteResult = await sql`
          DELETE FROM quotes 
          WHERE id = ANY(${idsToDelete})
        `;

        totalDeleted += deleteResult.rowCount || 0;
        console.log(`Deleted ${idsToDelete.length} duplicate copies`);
      }
    }

    console.log(`✅ Cleanup complete. Total quotes deleted: ${totalDeleted}`);

    return NextResponse.json({ 
      success: true, 
      duplicateSets: duplicates.length,
      quotesDeleted: totalDeleted,
      message: `Removed ${totalDeleted} duplicate quotes from ${duplicates.length} duplicate sets`
    });

  } catch (error) {
    console.error('❌ Failed to cleanup duplicates:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup duplicates' },
      { status: 500 }
    );
  }
}