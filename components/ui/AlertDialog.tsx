'use client';

import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  DialogFrame,
  dialogConfirmButtonClass,
} from '@/components/ui/DialogFrame';

interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
  variant?: 'success' | 'error' | 'warning' | 'info';
}

const variantConfig: Record<
  NonNullable<AlertDialogProps['variant']>,
  { icon: LucideIcon; iconClass: string; iconBg: string; iconBorder: string; button: string }
> = {
  success: {
    icon: CheckCircle,
    iconClass: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    iconBorder: 'border-emerald-200',
    button: dialogConfirmButtonClass('bg-emerald-600 hover:bg-emerald-700'),
  },
  error: {
    icon: AlertCircle,
    iconClass: 'text-red-600',
    iconBg: 'bg-red-100',
    iconBorder: 'border-red-200',
    button: dialogConfirmButtonClass('bg-red-600 hover:bg-red-700'),
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-600',
    iconBg: 'bg-amber-100',
    iconBorder: 'border-amber-200',
    button: dialogConfirmButtonClass('bg-amber-600 hover:bg-amber-700'),
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-600',
    iconBg: 'bg-blue-100',
    iconBorder: 'border-blue-200',
    button: dialogConfirmButtonClass('bg-blue-600 hover:bg-blue-700'),
  },
};

export default function AlertDialog({
  isOpen,
  title,
  message,
  buttonText = 'OK',
  onClose,
  variant = 'info',
}: AlertDialogProps) {
  const styles = variantConfig[variant];
  const Icon = styles.icon;

  return (
    <DialogFrame
      isOpen={isOpen}
      title={title}
      message={message}
      icon={Icon}
      iconClassName={styles.iconClass}
      iconBgClassName={styles.iconBg}
      iconBorderClassName={styles.iconBorder}
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className={styles.button}>
          {buttonText}
        </button>
      }
    />
  );
}
