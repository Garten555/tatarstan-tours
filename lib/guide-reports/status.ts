export const GUIDE_REPORT_STATUSES = ['open', 'reviewed', 'resolved', 'dismissed'] as const;
export type GuideReportStatus = (typeof GUIDE_REPORT_STATUSES)[number];

export function isGuideReportStatus(value: string): value is GuideReportStatus {
  return (GUIDE_REPORT_STATUSES as readonly string[]).includes(value);
}

const STATUS_LABELS: Record<GuideReportStatus, string> = {
  open: 'Открыта',
  reviewed: 'На рассмотрении',
  resolved: 'Решена',
  dismissed: 'Отклонена',
};

const STATUS_BADGE: Record<GuideReportStatus, string> = {
  open: 'bg-amber-100 text-amber-900 border-amber-200',
  reviewed: 'bg-blue-100 text-blue-900 border-blue-200',
  resolved: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  dismissed: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function guideReportStatusLabel(status: string): string {
  if (isGuideReportStatus(status)) return STATUS_LABELS[status];
  return status;
}

export function guideReportStatusBadgeClass(status: string): string {
  if (isGuideReportStatus(status)) return STATUS_BADGE[status];
  return 'bg-violet-100 text-violet-900 border-violet-200';
}

export function profileDisplayName(
  p: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null | undefined,
  fallback: string
): string {
  if (!p) return fallback;
  const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  return name || p.email || fallback;
}

export function profileInitials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.[0] ?? '?').toUpperCase();
}
