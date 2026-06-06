'use client';

import { useState, useEffect } from 'react';
import { MessageSquareText } from 'lucide-react';
import {
  DialogFrame,
  dialogCancelButtonClass,
  dialogConfirmButtonClass,
} from '@/components/ui/DialogFrame';

interface PromptDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function PromptDialog({
  isOpen,
  title,
  message,
  placeholder = 'Введите значение...',
  defaultValue = '',
  confirmText = 'OK',
  cancelText = 'Закрыть',
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) setValue(defaultValue);
  }, [isOpen, defaultValue]);

  const handleConfirm = () => onConfirm(value);

  return (
    <DialogFrame
      isOpen={isOpen}
      title={title}
      message={message}
      icon={MessageSquareText}
      iconClassName="text-blue-600"
      iconBgClassName="bg-blue-100"
      iconBorderClassName="border-blue-200"
      onClose={onCancel}
      children={
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm();
            if (e.key === 'Escape') onCancel();
          }}
          placeholder={placeholder}
          className="mt-4 w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          autoFocus
        />
      }
      footer={
        <>
          <button type="button" onClick={onCancel} className={dialogCancelButtonClass}>
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={dialogConfirmButtonClass('bg-emerald-600 hover:bg-emerald-700')}
          >
            {confirmText}
          </button>
        </>
      }
    />
  );
}
