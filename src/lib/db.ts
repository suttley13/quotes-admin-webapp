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
  notification_time: string; // Format: "09:00"
  timezone: string; // Format: "America/New_York"
  notifications_enabled: boolean;
  device_token?: string;
}

export interface DailyQuote {
  id: number;
  quote_id: number;
  date: string; // Format: "2025-01-02"
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notification_time VARCHAR(5) DEFAULT '09:00',
        timezone VARCHAR(100) DEFAULT 'America/New_York',
        notifications_enabled BOOLEAN DEFAULT true,
        device_token VARCHAR(500)
      )
    `;

    // Add new columns to existing users table if they don't exist
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS notification_time VARCHAR(5) DEFAULT '09:00',
      ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'America/New_York',
      ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS device_token VARCHAR(500)
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

    // Create daily_quotes table to track which quote is assigned to each day
    await sql`
      CREATE TABLE IF NOT EXISTS daily_quotes (
        id SERIAL PRIMARY KEY,
        quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
        date DATE UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create user_deliveries table to track which quotes have been delivered to which users
    await sql`
      CREATE TABLE IF NOT EXISTS user_deliveries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
        delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, quote_id)
      )
    `;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

export async function getQuotes(limit: number = 50, sortBy: 'favorites' | 'created_at' = 'favorites'): Promise<(Quote & { favorite_count: number })[]> {
  if (sortBy === 'favorites') {
    const result = await sql<Quote & { favorite_count: number }>`
      SELECT q.*, 
             COALESCE(COUNT(uf.id), 0) as favorite_count
      FROM quotes q
      LEFT JOIN user_favorites uf ON q.id = uf.quote_id
      GROUP BY q.id, q.text, q.author, q.biography, q.meaning, q.application, q.author_summary, q.created_at, q.sent_at, q.sent_by
      ORDER BY favorite_count DESC, q.created_at DESC
      LIMIT ${limit}
    `;
    return result.rows;
  } else {
    const result = await sql<Quote & { favorite_count: number }>`
      SELECT q.*, 
             COALESCE(COUNT(uf.id), 0) as favorite_count
      FROM quotes q
      LEFT JOIN user_favorites uf ON q.id = uf.quote_id
      GROUP BY q.id, q.text, q.author, q.biography, q.meaning, q.application, q.author_summary, q.created_at, q.sent_at, q.sent_by
      ORDER BY q.created_at DESC
      LIMIT ${limit}
    `;
    return result.rows;
  }
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
  
  // Also update the users table with the device token if we have a userId
  if (userId) {
    await sql`
      UPDATE users 
      SET device_token = ${token}
      WHERE id = ${userId}
    `;
  }
}


export async function saveNotificationRecord(quoteId: number, recipientCount: number, successCount: number): Promise<void> {
  await sql`
    INSERT INTO notifications (quote_id, recipient_count, success_count)
    VALUES (${quoteId}, ${recipientCount}, ${successCount})
  `;
}

export async function recordQuoteDelivery(userId: number, quoteId: number): Promise<void> {
  await sql`
    INSERT INTO user_deliveries (user_id, quote_id)
    VALUES (${userId}, ${quoteId})
    ON CONFLICT (user_id, quote_id) DO NOTHING
  `;
}

export async function checkDuplicateQuote(text: string, author: string | null): Promise<boolean> {
  // Normalize the text by trimming whitespace
  const normalizedText = text.trim();
  
  let result;
  if (author === null || author === undefined || author === '') {
    // For quotes without authors, check for null, undefined, or empty string
    result = await sql`
      SELECT COUNT(*) as count FROM quotes 
      WHERE TRIM(text) = ${normalizedText} 
      AND (author IS NULL OR author = '' OR TRIM(author) = '')
    `;
  } else {
    // For quotes with authors, check exact match
    const normalizedAuthor = author.trim();
    result = await sql`
      SELECT COUNT(*) as count FROM quotes 
      WHERE TRIM(text) = ${normalizedText} 
      AND TRIM(author) = ${normalizedAuthor}
    `;
  }
  
  return result.rows[0].count > 0;
}

// User management functions
export async function registerUser(
  deviceId: string, 
  deviceToken?: string,
  notificationTime?: string,
  timezone?: string
): Promise<User> {
  const result = await sql<User>`
    INSERT INTO users (device_id, device_token, notification_time, timezone)
    VALUES (
      ${deviceId}, 
      ${deviceToken || null},
      ${notificationTime || '09:00'},
      ${timezone || 'America/New_York'}
    )
    ON CONFLICT (device_id) DO UPDATE SET 
      device_token = COALESCE(EXCLUDED.device_token, users.device_token),
      notification_time = COALESCE(EXCLUDED.notification_time, users.notification_time),
      timezone = COALESCE(EXCLUDED.timezone, users.timezone)
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

export async function updateUserPreferences(
  deviceId: string,
  preferences: {
    notificationTime?: string;
    timezone?: string;
    deviceToken?: string;
    notificationsEnabled?: boolean;
  }
): Promise<User> {
  const result = await sql<User>`
    UPDATE users SET
      notification_time = COALESCE(${preferences.notificationTime || null}, notification_time),
      timezone = COALESCE(${preferences.timezone || null}, timezone),
      device_token = COALESCE(${preferences.deviceToken || null}, device_token),
      notifications_enabled = COALESCE(${preferences.notificationsEnabled ?? null}, notifications_enabled)
    WHERE device_id = ${deviceId}
    RETURNING *
  `;
  return result.rows[0];
}

export async function getUsersForNotificationTime(hour: number, minute: number = 0): Promise<User[]> {
  const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  
  const result = await sql<User>`
    SELECT * FROM users 
    WHERE notification_time = ${timeString}
    AND notifications_enabled = true
    AND device_token IS NOT NULL
  `;
  return result.rows;
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
    WHERE EXISTS (
      SELECT 1 FROM user_deliveries ud 
      WHERE ud.user_id = ${userId} AND ud.quote_id = q.id
    )
    ORDER BY q.created_at DESC
    LIMIT ${limit}
  `;
  return result.rows;
}

// Daily quote management functions
export async function getTodayQuote(): Promise<(Quote & DailyQuote) | null> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const result = await sql<Quote & DailyQuote>`
    SELECT q.*, dq.date, dq.id as daily_quote_id, dq.created_at as daily_created_at
    FROM daily_quotes dq
    JOIN quotes q ON dq.quote_id = q.id
    WHERE dq.date = ${today}
  `;
  
  return result.rows[0] || null;
}

export async function setTodayQuote(quoteId: number): Promise<DailyQuote> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const result = await sql<DailyQuote>`
    INSERT INTO daily_quotes (quote_id, date)
    VALUES (${quoteId}, ${today})
    ON CONFLICT (date) DO UPDATE SET quote_id = ${quoteId}
    RETURNING *
  `;
  
  return result.rows[0];
}

export async function getQuoteOfTheDay(date?: string): Promise<(Quote & DailyQuote) | null> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const result = await sql<Quote & DailyQuote>`
    SELECT q.*, dq.date, dq.id as daily_quote_id, dq.created_at as daily_created_at
    FROM daily_quotes dq
    JOIN quotes q ON dq.quote_id = q.id
    WHERE dq.date = ${targetDate}
  `;
  
  return result.rows[0] || null;
}