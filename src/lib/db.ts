import { sql } from '@vercel/postgres';

export interface Quote {
  id: number;
  text: string;
  author: string | null;
  biography: string | null;
  meaning: string | null;
  application: string | null;
  author_summary: string | null;
  created_at: Date;
  sent_at: Date | null;
  sent_by: string | null;
}

export interface DeviceToken {
  id: number;
  token: string;
  user_id: string | null;
  platform: string;
  created_at: Date;
  active: boolean;
}

export interface Notification {
  id: number;
  quote_id: number;
  sent_at: Date;
  recipient_count: number;
  success_count: number;
}

export interface User {
  id: number;
  device_id: string;
  created_at: Date;
}

export interface UserFavorite {
  id: number;
  user_id: number;
  quote_id: number;
  favorited_at: Date;
}

export async function initializeDatabase() {
  try {
    // Create quotes table
    await sql`
      CREATE TABLE IF NOT EXISTS quotes (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        author VARCHAR(255),
        biography TEXT,
        meaning TEXT,
        application TEXT,
        author_summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP,
        sent_by VARCHAR(255)
      )
    `;

    // Add new columns to existing table if they don't exist
    await sql`
      ALTER TABLE quotes 
      ADD COLUMN IF NOT EXISTS meaning TEXT,
      ADD COLUMN IF NOT EXISTS application TEXT,
      ADD COLUMN IF NOT EXISTS author_summary TEXT
    `;

    // Create device_tokens table
    await sql`
      CREATE TABLE IF NOT EXISTS device_tokens (
        id SERIAL PRIMARY KEY,
        token VARCHAR(255) UNIQUE NOT NULL,
        user_id VARCHAR(255),
        platform VARCHAR(50) DEFAULT 'ios',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        active BOOLEAN DEFAULT true
      )
    `;

    // Create notifications table
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        quote_id INTEGER REFERENCES quotes(id),
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        recipient_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0
      )
    `;

    // Create users table for device-based user management
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create user_favorites table for favorite quotes
    await sql`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
        favorited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, quote_id)
      )
    `;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

export async function getQuotes(limit: number = 50): Promise<Quote[]> {
  const result = await sql<Quote>`
    SELECT * FROM quotes 
    ORDER BY created_at DESC 
    LIMIT ${limit}
  `;
  return result.rows;
}

export async function saveQuote(quote: {
  text: string;
  author: string | null;
  biography: string | null;
  meaning?: string | null;
  application?: string | null;
  authorSummary?: string | null;
  sentBy?: string | null;
}): Promise<Quote> {
  const result = await sql<Quote>`
    INSERT INTO quotes (text, author, biography, meaning, application, author_summary, sent_by)
    VALUES (${quote.text}, ${quote.author}, ${quote.biography}, ${quote.meaning || null}, ${quote.application || null}, ${quote.authorSummary || null}, ${quote.sentBy || null})
    RETURNING *
  `;
  return result.rows[0];
}

export async function markQuoteAsSent(quoteId: number): Promise<void> {
  await sql`
    UPDATE quotes 
    SET sent_at = CURRENT_TIMESTAMP 
    WHERE id = ${quoteId}
  `;
}

export async function getActiveDeviceTokens(): Promise<DeviceToken[]> {
  const result = await sql<DeviceToken>`
    SELECT * FROM device_tokens 
    WHERE active = true
  `;
  return result.rows;
}

export async function registerDeviceToken(token: string, userId?: string): Promise<void> {
  await sql`
    INSERT INTO device_tokens (token, user_id, platform)
    VALUES (${token}, ${userId || null}, 'ios')
    ON CONFLICT (token) DO UPDATE SET
      user_id = ${userId || null},
      active = true,
      created_at = CURRENT_TIMESTAMP
  `;
}

export async function saveNotificationRecord(quoteId: number, recipientCount: number, successCount: number): Promise<void> {
  await sql`
    INSERT INTO notifications (quote_id, recipient_count, success_count)
    VALUES (${quoteId}, ${recipientCount}, ${successCount})
  `;
}

export async function checkDuplicateQuote(text: string, author: string | null): Promise<boolean> {
  const result = await sql`
    SELECT COUNT(*) as count FROM quotes 
    WHERE text = ${text} AND author = ${author}
  `;
  return result.rows[0].count > 0;
}

// User management functions
export async function registerUser(deviceId: string): Promise<User> {
  const result = await sql<User>`
    INSERT INTO users (device_id)
    VALUES (${deviceId})
    ON CONFLICT (device_id) DO UPDATE SET device_id = ${deviceId}
    RETURNING *
  `;
  return result.rows[0];
}

export async function getUserByDeviceId(deviceId: string): Promise<User | null> {
  const result = await sql<User>`
    SELECT * FROM users 
    WHERE device_id = ${deviceId}
  `;
  return result.rows[0] || null;
}

// Favorite management functions
export async function toggleFavorite(userId: number, quoteId: number): Promise<{ favorited: boolean }> {
  // First check if favorite exists
  const existing = await sql`
    SELECT id FROM user_favorites 
    WHERE user_id = ${userId} AND quote_id = ${quoteId}
  `;
  
  if (existing.rows.length > 0) {
    // Remove favorite
    await sql`
      DELETE FROM user_favorites 
      WHERE user_id = ${userId} AND quote_id = ${quoteId}
    `;
    return { favorited: false };
  } else {
    // Add favorite
    await sql`
      INSERT INTO user_favorites (user_id, quote_id)
      VALUES (${userId}, ${quoteId})
    `;
    return { favorited: true };
  }
}

export async function getUserFavorites(userId: number): Promise<Quote[]> {
  const result = await sql<Quote>`
    SELECT q.* FROM quotes q
    JOIN user_favorites uf ON q.id = uf.quote_id
    WHERE uf.user_id = ${userId}
    ORDER BY uf.favorited_at DESC
  `;
  return result.rows;
}

export async function getQuoteWithFavoriteStatus(quoteId: number, userId: number): Promise<Quote & { is_favorited: boolean }> {
  const result = await sql<Quote & { is_favorited: boolean }>`
    SELECT q.*, 
           CASE WHEN uf.id IS NOT NULL THEN true ELSE false END as is_favorited
    FROM quotes q
    LEFT JOIN user_favorites uf ON q.id = uf.quote_id AND uf.user_id = ${userId}
    WHERE q.id = ${quoteId}
  `;
  return result.rows[0];
}

export async function getAllQuotesWithFavoriteStatus(userId: number, limit: number = 50): Promise<(Quote & { is_favorited: boolean })[]> {
  const result = await sql<Quote & { is_favorited: boolean }>`
    SELECT q.*, 
           CASE WHEN uf.id IS NOT NULL THEN true ELSE false END as is_favorited
    FROM quotes q
    LEFT JOIN user_favorites uf ON q.id = uf.quote_id AND uf.user_id = ${userId}
    ORDER BY q.created_at DESC
    LIMIT ${limit}
  `;
  return result.rows;
}