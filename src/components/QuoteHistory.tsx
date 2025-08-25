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
  favorite_count: number;
}

export default function QuoteHistory() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'favorites' | 'created_at'>('favorites');

  const fetchQuotes = async () => {
    try {
      const response = await fetch(`/api/quotes?sort=${sortBy}`);
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
  }, [sortBy]);
  
  const handleSortChange = (newSort: 'favorites' | 'created_at') => {
    setSortBy(newSort);
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Quote History</h2>
            <p className="text-sm text-gray-600 mt-1">{quotes.length} quotes generated</p>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as 'favorites' | 'created_at')}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="favorites">Most Favorited</option>
              <option value="created_at">Chronological</option>
            </select>
          </div>
        </div>
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
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Created: {new Date(quote.created_at).toLocaleDateString()}</span>
                      <span className="flex items-center space-x-1">
                        <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                        <span>{quote.favorite_count} favorite{quote.favorite_count !== 1 ? 's' : ''}</span>
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col items-end space-y-1">
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