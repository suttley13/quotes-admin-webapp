import { getQuotes, checkDuplicateQuote } from './db';

export interface GeneratedQuote {
  text: string;
  author: string | null;
  biography: string | null;
}

export async function generateQuote(): Promise<GeneratedQuote> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Get existing quotes to avoid duplicates
  const existingQuotes = await getQuotes(100);
  const pastQuoteStrings = existingQuotes.map(quote => {
    if (quote.author) {
      return `"${quote.text}" - ${quote.author}`;
    }
    return `"${quote.text}"`;
  });

  const avoidDuplicatesText = pastQuoteStrings.length > 0
    ? `\n\nPlease avoid these quotes that have already been used:\n• ${pastQuoteStrings.join('\n• ')}`
    : '';

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5',
      input: `You are a helpful assistant that provides inspirational quotes with author biographies. Return an inspirational quote in this exact format:

"Quote" - Author Name
Brief 1-2 sentence biography of the author.

If no author is known, just return the quote without attribution or biography. Always provide a different quote than any previously shown.

Give me an inspirational quote.${avoidDuplicatesText}`,
      reasoning: {
        effort: 'low'
      },
      text: {
        verbosity: 'low'
      }
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  
  // Parse the response structure
  if (data.output) {
    for (const outputItem of data.output) {
      if (outputItem.type === 'message' && outputItem.content) {
        for (const contentItem of outputItem.content) {
          if (contentItem.type === 'output_text' && contentItem.text) {
            return parseQuoteFromText(contentItem.text);
          }
        }
      }
    }
  }

  throw new Error('No content received from OpenAI API');
}

function parseQuoteFromText(content: string): GeneratedQuote {
  const trimmedContent = content.trim();
  const lines = trimmedContent.split('\n');

  if (lines.length >= 2) {
    // First line should be quote and author
    const quoteLine = lines[0].trim();
    // Second line should be biography
    const biography = lines[1].trim();

    const dashIndex = quoteLine.lastIndexOf(' - ');
    if (dashIndex !== -1) {
      const text = quoteLine.substring(0, dashIndex).replace(/^"/, '').replace(/"$/, '');
      const author = quoteLine.substring(dashIndex + 3);
      return {
        text,
        author,
        biography: biography.length > 0 ? biography : null
      };
    }
  }

  // Fallback to single line parsing
  const dashIndex = trimmedContent.lastIndexOf(' - ');
  if (dashIndex !== -1) {
    const text = trimmedContent.substring(0, dashIndex).replace(/^"/, '').replace(/"$/, '');
    const author = trimmedContent.substring(dashIndex + 3);
    return { text, author, biography: null };
  } else {
    const cleanedQuote = trimmedContent.replace(/^"/, '').replace(/"$/, '');
    return { text: cleanedQuote, author: null, biography: null };
  }
}