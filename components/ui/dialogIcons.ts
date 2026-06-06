import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArchiveX,
  Ban,
  CheckCircle2,
  DoorClosed,
  Info,
  Timer,
  Trash2,
  Undo2,
} from 'lucide-react';

/** Смысловая иконка диалога — не путать с цветовым variant. */
export type DialogIconKind =
  | 'auto'
  | 'warning'
  | 'delete'
  | 'delete-all'
  | 'cancel'
  | 'cleanup'
  | 'confirm'
  | 'info'
  | 'room'
  | 'back';

const ICONS: Record<ConcreteIconKind, LucideIcon> = {
  warning: AlertTriangle,
  delete: Trash2,
  'delete-all': ArchiveX,
  cancel: Ban,
  cleanup: Timer,
  confirm: CheckCircle2,
  info: Info,
  room: DoorClosed,
  back: Undo2,
};

type ConcreteIconKind = Exclude<DialogIconKind, 'auto'>;

const VARIANT_DEFAULT_ICON: Record<
  'danger' | 'warning' | 'info' | 'emerald',
  ConcreteIconKind
> = {
  danger: 'delete',
  warning: 'cancel',
  info: 'info',
  emerald: 'confirm',
};

export function resolveDialogIcon(
  kind: DialogIconKind | undefined,
  variant: 'danger' | 'warning' | 'info' | 'emerald' = 'warning'
): LucideIcon {
  const resolved: ConcreteIconKind =
    !kind || kind === 'auto' ? VARIANT_DEFAULT_ICON[variant] : kind;
  return ICONS[resolved];
}

export { ICONS as DIALOG_ICONS };
