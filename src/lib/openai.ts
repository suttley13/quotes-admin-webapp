import { getQuotes, checkDuplicateQuote } from './db';

export interface GeneratedQuote {
  text: string;
  author: string | null;
  biography: string | null;
  meaning: string | null;
  application: string | null;
  authorSummary: string | null;
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
      input: `You are a helpful assistant that provides inspiring, profound, or funny quotes with detailed analysis. Return a quote that is either inspiring, deeply profound, or genuinely funny in this exact format:

"Quote" - Author Name
Brief 1-2 sentence biography of the author.
MEANING: Explain what this quote means in 2-3 sentences.
APPLICATION: Give a practical example of how someone could apply this quote in their daily life (2-3 sentences).
AUTHOR SUMMARY: Provide a concise summary including their birth/death years, country of origin, and key contributions (2-3 sentences). Format: "Name (YYYY-YYYY) was a [nationality] [profession] who [key contributions]."

If no author is known, just return the quote without attribution but still include the meaning and application sections. Always provide a different quote than any previously shown.

Give me a quote that is inspiring, profound, or funny.${avoidDuplicatesText}`,
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
  const lines = trimmedContent.split('\n').map(line => line.trim());
  
  let text = '';
  let author: string | null = null;
  let biography: string | null = null;
  let meaning: string | null = null;
  let application: string | null = null;
  let authorSummary: string | null = null;
  
  // Parse the structured response
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (i === 0) {
      // First line: "Quote" - Author Name
      const dashIndex = line.lastIndexOf(' - ');
      if (dashIndex !== -1) {
        text = line.substring(0, dashIndex).replace(/^"/, '').replace(/"$/, '');
        author = line.substring(dashIndex + 3);
      } else {
        text = line.replace(/^"/, '').replace(/"$/, '');
      }
    } else if (i === 1 && !line.startsWith('MEANING:') && !line.startsWith('APPLICATION:') && !line.startsWith('AUTHOR SUMMARY:')) {
      // Second line: Biography (if it exists and isn't one of our special sections)
      biography = line.length > 0 ? line : null;
    } else if (line.startsWith('MEANING:')) {
      meaning = line.substring('MEANING:'.length).trim();
    } else if (line.startsWith('APPLICATION:')) {
      application = line.substring('APPLICATION:'.length).trim();
    } else if (line.startsWith('AUTHOR SUMMARY:')) {
      authorSummary = line.substring('AUTHOR SUMMARY:'.length).trim();
    }
  }
  
  return {
    text,
    author,
    biography,
    meaning,
    application,
    authorSummary
  };
}