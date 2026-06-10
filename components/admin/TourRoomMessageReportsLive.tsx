'use client';

import { useCallback, useEffect, useState } from 'react';
import TourRoomMessageReportsPanel from '@/components/admin/TourRoomMessageReportsPanel';
import { type TourRoomReportRow } from '@/components/admin/TourRoomMessageReportsList';
import { PUSHER_BRIDGE_EVENT, type PusherBridgeDetail } from '@/lib/pusher/user-bridge-events';

type Props = {
  initialRows: TourRoomReportRow[];
  viewerRole: string;
  initialError?: string | null;
  initialSetupHint?: string | null;
};

export default function TourRoomMessageReportsLive({
  initialRows,
  viewerRole,
  initialError = null,
  initialSetupHint = null,
}: Props) {
  const [rows, setRows] = useState(initialRows);
  const [loadError, setLoadError] = useState<string | null>(initialError);
  const [setupHint, setSetupHint] = useState<string | null>(initialSetupHint);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tour-room-reports/list', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && Array.isArray(data.rows)) {
        setRows(data.rows);
        setLoadError(data.error ?? null);
        setSetupHint(data.setupHint ?? null);
      } else {
        setLoadError(data.error || 'Не удалось загрузить жалобы');
        setSetupHint(data.setupHint ?? null);
      }
    } catch {
      setLoadError('Не удалось загрузить жалобы');
    }
  }, []);

  useEffect(() => {
    setRows(initialRows);
    setLoadError(initialError);
    setSetupHint(initialSetupHint);
  }, [initialRows, initialError, initialSetupHint]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onBridge = (e: Event) => {
      const detail = (e as CustomEvent<PusherBridgeDetail>).detail;
      if (detail?.channel === 'moderation' && detail.event === 'reports-changed') {
        void refresh();
      }
    };
    window.addEventListener(PUSHER_BRIDGE_EVENT, onBridge);
    return () => window.removeEventListener(PUSHER_BRIDGE_EVENT, onBridge);
  }, [refresh]);

  return (
    <div className="space-y-4">
      {loadError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
          {loadError}
        </div>
      ) : null}
      {setupHint && rows.length === 0 && !loadError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
          Жалобы сохраняются в таблицу <code className="text-xs">tour_room_message_reports</code>. Если её нет в Supabase,
          выполните SQL из <code className="text-xs">{setupHint}</code>.
        </div>
      ) : null}
      <TourRoomMessageReportsPanel rows={rows} viewerRole={viewerRole} />
    </div>
  );
}
