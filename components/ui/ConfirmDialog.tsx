'use client';

import { Loader2 } from 'lucide-react';
import {
  DialogFrame,
  dialogCancelButtonClass,
  dialogConfirmButtonClass,
} from '@/components/ui/DialogFrame';
import { resolveDialogIcon, type DialogIconKind } from '@/components/ui/dialogIcons';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info' | 'emerald';
  icon?: DialogIconKind;
  busy?: boolean;
}

const variantConfig = {
  danger: {
    icon: 'text-red-600',
    iconBg: 'bg-red-100',
    iconBorder: 'border-red-200',
    confirm: dialogConfirmButtonClass('bg-red-600 hover:bg-red-700'),
  },
  warning: {
    icon: 'text-amber-600',
    iconBg: 'bg-amber-100',
    iconBorder: 'border-amber-200',
    confirm: dialogConfirmButtonClass('bg-amber-600 hover:bg-amber-700'),
  },
  info: {
    icon: 'text-blue-600',
    iconBg: 'bg-blue-100',
    iconBorder: 'border-blue-200',
    confirm: dialogConfirmButtonClass('bg-blue-600 hover:bg-blue-700'),
  },
  emerald: {
    icon: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    iconBorder: 'border-emerald-200',
    confirm: dialogConfirmButtonClass('bg-emerald-600 hover:bg-emerald-700'),
  },
} as const;

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText = 'Закрыть',
  onConfirm,
  onCancel,
  variant = 'warning',
  icon,
  busy = false,
}: ConfirmDialogProps) {
  const styles = variantConfig[variant];
  const Icon = resolveDialogIcon(icon, variant);
  const defaultConfirmText =
    confirmText ||
    (variant === 'danger' ? 'Удалить' : variant === 'emerald' ? 'Подтвердить' : 'OK');

  return (
    <DialogFrame
      isOpen={isOpen}
      title={title}
      message={message}
      icon={Icon}
      iconClassName={styles.icon}
      iconBgClassName={styles.iconBg}
      iconBorderClassName={styles.iconBorder}
      onClose={busy ? undefined : onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} disabled={busy} className={dialogCancelButtonClass}>
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex items-center justify-center gap-2 ${styles.confirm}`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {defaultConfirmText}
          </button>
        </>
      }
    />
  );
}

export type { DialogIconKind };
