import { NextApiRequest, NextApiResponse } from 'next';
import { getTodayQuote, getQuoteOfTheDay } from '../../lib/db';

interface TodayQuoteResponse {
  success: boolean;
  quote?: any;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TodayQuoteResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { date } = req.query;
    
    let quote;
    if (typeof date === 'string') {
      quote = await getQuoteOfTheDay(date);
    } else {
      quote = await getTodayQuote();
    }

    if (!quote) {
      return res.status(404).json({ 
        success: false, 
        message: 'No quote found for today' 
      });
    }

    return res.status(200).json({ 
      success: true, 
      quote: quote
    });

  } catch (error) {
    console.error('❌ Error fetching today\'s quote:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch today\'s quote' 
    });
  }
}