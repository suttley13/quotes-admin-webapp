'use client';

import { useState, useEffect } from 'react';

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

export default function QuoteHistory() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotes = async () => {
    try {
      const response = await fetch('/api/quotes');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch quotes');
      }

      setQuotes(data.quotes);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p className="text-gray-500 text-center">Loading quote history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <p className="text-red-600 text-center">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Quote History</h2>
        <p className="text-sm text-gray-600 mt-1">{quotes.length} quotes generated</p>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {quotes.length === 0 ? (
          <div className="p-6">
            <p className="text-gray-500 text-center">No quotes generated yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {quotes.map((quote) => (
              <div key={quote.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <blockquote className="text-sm text-gray-800 mb-1">
                      "{quote.text}"
                    </blockquote>
                    {quote.author && (
                      <p className="text-xs text-gray-600 mb-2">— {quote.author}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Created: {new Date(quote.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-4">
                    {quote.sent_at ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Draft
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}