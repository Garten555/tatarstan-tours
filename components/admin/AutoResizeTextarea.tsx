'use client';

import { useEffect, useRef } from 'react';

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  minRows?: number;
  maxRows?: number;
}

export default function AutoResizeTextarea({ 
  value, 
  minRows = 3, 
  maxRows = 20,
  className = '',
  ...props 
}: AutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Сбрасываем высоту для правильного расчёта
    textarea.style.height = 'auto';

    // Вычисляем высоту строки
    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = parseInt(computedStyle.lineHeight);
    
    // Вычисляем новую высоту
    const scrollHeight = textarea.scrollHeight;
    const minHeight = lineHeight * minRows;
    const maxHeight = lineHeight * maxRows;

    // Устанавливаем новую высоту с учётом ограничений
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;

    // Включаем скролл только если достигли максимальной высоты
    if (scrollHeight > maxHeight) {
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }
  }, [value, minRows, maxRows]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      className={className}
      style={{
        resize: 'none',
        transition: 'height 0.1s ease',
      }}
      {...props}
    />
  );
}

