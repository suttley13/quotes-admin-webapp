'use client';

import { useState } from 'react';

interface Quote {
  id: number;
  text: string;
  author: string | null;
  biography: string | null;
  meaning: string | null;
  application: string | null;
  author_summary: string | null;
  created_at: string;
  sent_at: string | null;
}

interface QuoteGeneratorProps {
  onQuoteGenerated: (quote: Quote) => void;
}

export default function QuoteGenerator({ onQuoteGenerated }: QuoteGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateQuote = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/quotes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quote');
      }

      onQuoteGenerated(data.quote);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Generate New Quote</h2>
        <button
          onClick={generateQuote}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating...' : 'Generate Quote'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}