import { NextApiRequest, NextApiResponse } from 'next';
import { saveQuote, getTodayQuote, setTodayQuote, getAllQuotesWithFavoriteStatus, checkDuplicateQuote } from '../../lib/db';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions';

interface QuoteResponse {
  success: boolean;
  quote?: any;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QuoteResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Check if today already has a quote
    const existingQuote = await getTodayQuote();
    if (existingQuote) {
      return res.status(200).json({ 
        success: true, 
        quote: existingQuote,
        message: 'Today\'s quote already exists' 
      });
    }

    // Generate a new unique quote
    console.log('🎯 Generating daily quote for', new Date().toISOString().split('T')[0]);
    
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
      return res.status(500).json({ success: false, message: 'OpenAI API key not configured' });
    }

    // Get recent quotes for duplicate avoidance (last 100)
    const recentQuotes = await getAllQuotesWithFavoriteStatus(1, 100); // Use dummy user ID for now
    const avoidQuotesPrompt = createAvoidDuplicatesPrompt(recentQuotes);

    const requestBody = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `You are a helpful assistant that provides inspiring, profound, or funny quotes with detailed analysis. Return a quote that is either inspiring, deeply profound, or genuinely funny in this exact format:

"Quote" - Author Name
Brief 1-2 sentence biography of the author.
MEANING: Explain what this quote means in 2-3 sentences.
APPLICATION: Give a practical example of how someone could apply this quote in their daily life (2-3 sentences).
AUTHOR SUMMARY: Provide a concise summary including their birth/death years, country of origin, and key contributions (2-3 sentences). Format: "Name (YYYY-YYYY) was a [nationality] [profession] who [key contributions]."

If no author is known, just return the quote without attribution but still include the meaning and application sections. Always provide a different quote than any previously shown.

Give me a quote that is inspiring, profound, or funny.${avoidQuotesPrompt}`
        }
      ],
      max_tokens: 800,
      temperature: 0.8
    };

    console.log('📡 Making request to OpenAI API...');
    const response = await fetch(OPENAI_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API Error:', response.status, errorText);
      return res.status(response.status).json({ 
        success: false, 
        message: `OpenAI API error: ${response.status}` 
      });
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      console.error('❌ No content in OpenAI response:', data);
      return res.status(500).json({ success: false, message: 'No content received from AI' });
    }

    const content = data.choices[0].message.content;
    console.log('📝 Raw API response:', content);

    // Parse the quote
    const parsedQuote = parseQuote(content);
    console.log('✅ Parsed quote:', parsedQuote.text, 'by', parsedQuote.author);

    // Check for duplicates
    const isDuplicate = await checkDuplicateQuote(parsedQuote.text, parsedQuote.author);
    if (isDuplicate) {
      console.log('⚠️ Quote already exists in database, but using it as daily quote');
    }

    // Save the quote to database
    const savedQuote = await saveQuote({
      text: parsedQuote.text,
      author: parsedQuote.author,
      biography: parsedQuote.biography,
      meaning: parsedQuote.meaning,
      application: parsedQuote.application,
      authorSummary: parsedQuote.authorSummary,
      sentBy: 'daily-generator'
    });

    // Set as today's quote
    await setTodayQuote(savedQuote.id);

    console.log('✅ Successfully generated and saved daily quote:', savedQuote.id);

    return res.status(200).json({ 
      success: true, 
      quote: savedQuote,
      message: 'Daily quote generated successfully' 
    });

  } catch (error) {
    console.error('❌ Error generating daily quote:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to generate daily quote' 
    });
  }
}

function createAvoidDuplicatesPrompt(quotes: any[]): string {
  if (quotes.length === 0) return '';

  const quoteStrings = quotes.slice(0, 50).map(quote => {
    if (quote.author) {
      return `"${quote.text}" - ${quote.author}`;
    } else {
      return `"${quote.text}"`;
    }
  });

  return `\n\nPlease avoid these quotes I've already seen:\n• ${quoteStrings.join('\n• ')}`;
}

function parseQuote(content: string) {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  
  let text = '';
  let author = null;
  let biography = null;
  let meaning = null;
  let application = null;
  let authorSummary = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // First line should be the quote and author
    if (i === 0) {
      const quoteMatch = line.match(/^"(.+?)"\s*-\s*(.+)$/);
      if (quoteMatch) {
        text = quoteMatch[1];
        author = quoteMatch[2];
      } else {
        // Fallback: treat entire first line as quote
        text = line.replace(/^"(.*)"$/, '$1');
      }
    }
    // Second line is usually biography
    else if (i === 1 && !line.startsWith('MEANING:') && !line.startsWith('APPLICATION:') && !line.startsWith('AUTHOR SUMMARY:')) {
      biography = line;
    }
    // Look for specific sections
    else if (line.startsWith('MEANING:')) {
      meaning = line.replace('MEANING:', '').trim();
      // Include following lines until next section
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith('APPLICATION:') || lines[j].startsWith('AUTHOR SUMMARY:')) {
          break;
        }
        meaning += ' ' + lines[j];
      }
    }
    else if (line.startsWith('APPLICATION:')) {
      application = line.replace('APPLICATION:', '').trim();
      // Include following lines until next section
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith('AUTHOR SUMMARY:') || lines[j].startsWith('MEANING:')) {
          break;
        }
        application += ' ' + lines[j];
      }
    }
    else if (line.startsWith('AUTHOR SUMMARY:')) {
      authorSummary = line.replace('AUTHOR SUMMARY:', '').trim();
      // Include following lines
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith('MEANING:') || lines[j].startsWith('APPLICATION:')) {
          break;
        }
        authorSummary += ' ' + lines[j];
      }
    }
  }

  return {
    text: text || content.split('\n')[0],
    author: author?.trim() || null,
    biography: biography || null,
    meaning: meaning || null,
    application: application || null,
    authorSummary: authorSummary || null
  };
}