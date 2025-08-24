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

export async function saveQuote(
  text: string, 
  author: string | null, 
  biography: string | null, 
  meaning: string | null = null, 
  application: string | null = null, 
  authorSummary: string | null = null, 
  sentBy: string | null = null
): Promise<Quote> {
  const result = await sql<Quote>`
    INSERT INTO quotes (text, author, biography, meaning, application, author_summary, sent_by)
    VALUES (${text}, ${author}, ${biography}, ${meaning}, ${application}, ${authorSummary}, ${sentBy})
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