'use client';

import { useCallback, useEffect, useState } from 'react';
import TourRoomMessageReportsPanel from '@/components/admin/TourRoomMessageReportsPanel';
import { type TourRoomReportRow } from '@/components/admin/TourRoomMessageReportsList';
import { PUSHER_BRIDGE_EVENT, type PusherBridgeDetail } from '@/lib/pusher/user-bridge-events';

type Props = {
  initialRows: TourRoomReportRow[];
  viewerRole: string;
};

export default function TourRoomMessageReportsLive({ initialRows, viewerRole }: Props) {
  const [rows, setRows] = useState(initialRows);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tour-room-reports/list', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && Array.isArray(data.rows)) {
        setRows(data.rows);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

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

  return <TourRoomMessageReportsPanel rows={rows} viewerRole={viewerRole} />;
}
