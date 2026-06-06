'use client';

import ConfirmDialog from '@/components/ui/ConfirmDialog';

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Единый стиль подтверждений — как «Отменить тур?» в админке. */
export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Закрыть',
  variant = 'default',
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
      variant={variant === 'danger' ? 'warning' : 'emerald'}
      busy={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
