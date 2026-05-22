'use client';

import { useCallback, useEffect, useState } from 'react';
import GuideReportsList, { type GuideReportRow } from '@/components/admin/GuideReportsList';
import { PUSHER_BRIDGE_EVENT, type PusherBridgeDetail } from '@/lib/pusher/user-bridge-events';

type Props = {
  initialRows: GuideReportRow[];
  viewerRole: string;
};

export default function GuideReportsLive({ initialRows, viewerRole }: Props) {
  const [rows, setRows] = useState(initialRows);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/guide-reports/list', { cache: 'no-store' });
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
    const onBridge = (e: Event) => {
      const detail = (e as CustomEvent<PusherBridgeDetail>).detail;
      if (detail?.channel === 'moderation' && detail.event === 'reports-changed') {
        void refresh();
      }
    };
    window.addEventListener(PUSHER_BRIDGE_EVENT, onBridge);
    return () => window.removeEventListener(PUSHER_BRIDGE_EVENT, onBridge);
  }, [refresh]);

  return <GuideReportsList rows={rows} viewerRole={viewerRole} onRowsChange={setRows} />;
}
