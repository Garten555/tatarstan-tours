'use client';

import { useCallback, useEffect, useState } from 'react';
import GuideReportsPanel from '@/components/admin/GuideReportsPanel';
import { type GuideReportRow } from '@/components/admin/GuideReportsList';
import type { BanProfileUpdate } from '@/components/admin/BanUserButton';
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

  const handleGuideBanChange = useCallback((guideUserId: string, profile: BanProfileUpdate) => {
    setRows((prev) =>
      prev.map((r) =>
        r.guide_user_id === guideUserId
          ? { ...r, guide_is_banned: profile.is_banned, guide_role: profile.role }
          : r
      )
    );
  }, []);

  return (
    <GuideReportsPanel
      rows={rows}
      viewerRole={viewerRole}
      onGuideBanChange={handleGuideBanChange}
    />
  );
}
