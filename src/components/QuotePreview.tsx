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

interface QuotePreviewProps {
  quote: Quote | null;
  onQuoteSent?: () => void;
}

export default function QuotePreview({ quote, onQuoteSent }: QuotePreviewProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sendQuote = async () => {
    if (!quote) return;

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/quotes/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteId: quote.id,
          quote: {
            text: quote.text,
            author: quote.author,
            biography: quote.biography,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send quote');
      }

      setSuccess(`Quote sent to ${data.successCount} of ${data.recipientCount} devices successfully!`);
      onQuoteSent?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (!quote) {
    return (
      <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
        <p className="text-gray-500 text-center">Generate a quote to preview it here</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Quote Preview</h2>
        {!quote.sent_at && (
          <button
            onClick={sendQuote}
            disabled={sending}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send Now'}
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <blockquote className="text-lg text-gray-800 italic mb-2">
            "{quote.text}"
          </blockquote>
          {quote.author && (
            <p className="text-sm text-gray-600 font-medium">— {quote.author}</p>
          )}
        </div>

        {quote.biography && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">{quote.biography}</p>
          </div>
        )}

        {quote.meaning && (
          <div className="p-3 bg-purple-50 rounded-lg">
            <h4 className="text-sm font-semibold text-purple-900 mb-1">Meaning:</h4>
            <p className="text-sm text-purple-800">{quote.meaning}</p>
          </div>
        )}

        {quote.application && (
          <div className="p-3 bg-green-50 rounded-lg">
            <h4 className="text-sm font-semibold text-green-900 mb-1">Application:</h4>
            <p className="text-sm text-green-800">{quote.application}</p>
          </div>
        )}

        {quote.author_summary && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">Author Summary:</h4>
            <p className="text-sm text-gray-800">{quote.author_summary}</p>
          </div>
        )}

        {quote.sent_at && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-700">
              ✅ Sent on {new Date(quote.sent_at).toLocaleString()}
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800 text-sm">{success}</p>
          </div>
        )}
      </div>
    </div>
  );
}