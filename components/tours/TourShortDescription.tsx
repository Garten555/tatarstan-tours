'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface TourShortDescriptionProps {
  text: string | null;
  maxLength?: number;
}

export default function TourShortDescription({ 
  text, 
  maxLength = 200 
}: TourShortDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) {
    return null;
  }

  const shouldTruncate = text.length > maxLength;
  const displayText = isExpanded || !shouldTruncate 
    ? text 
    : text.slice(0, maxLength) + '...';

  return (
    <div className="mb-6">
      <p 
        className="text-lg text-gray-600 leading-relaxed break-words whitespace-pre-wrap overflow-hidden"
        style={{
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          hyphens: 'auto',
          maxWidth: '100%',
        }}
      >
        {displayText}
      </p>
      
      {shouldTruncate && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Свернуть
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Читать полностью
            </>
          )}
        </button>
      )}
    </div>
  );
}

