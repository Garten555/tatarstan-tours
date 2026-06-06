'use client';

import ConfirmDialog, { type DialogIconKind } from '@/components/ui/ConfirmDialog';

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** default — зелёный; warning — янтарный; danger — красный */
  variant?: 'default' | 'warning' | 'danger';
  icon?: DialogIconKind;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const variantMap = {
  default: 'emerald',
  warning: 'warning',
  danger: 'danger',
} as const;

/** Единый стиль подтверждений — как «Отменить тур?» в админке. */
export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Закрыть',
  variant = 'default',
  icon = 'auto',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <ConfirmDialog
      isOpen={open}
      title={title}
      message={description}
      confirmText={confirmLabel}
      cancelText={cancelLabel}
      variant={variantMap[variant]}
      icon={icon}
      busy={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

export type { DialogIconKind };
