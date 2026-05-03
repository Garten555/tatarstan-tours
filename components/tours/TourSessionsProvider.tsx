'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { TourSessionOption } from '@/lib/types/tour-session-option';
import { pickDefaultSessionId } from '@/lib/tour/session-display';

type TourSessionsContextValue = {
  sessions: TourSessionOption[];
  /** Есть ли активные слоты в БД */
  hasSessions: boolean;
  selectedId: string;
  setSelectedId: (id: string) => void;
  selected: TourSessionOption | null;
};

const TourSessionsContext = createContext<TourSessionsContextValue | null>(null);

export function useTourSessions(): TourSessionsContextValue | null {
  return useContext(TourSessionsContext);
}

type TourSessionsProviderProps = {
  sessions: TourSessionOption[];
  children: ReactNode;
};

export function TourSessionsProvider({
  sessions,
  children,
}: TourSessionsProviderProps) {
  const valid = useMemo(
    () =>
      (sessions || []).filter(
        (s) => s?.id && s?.start_at && typeof s.max_participants === 'number'
      ),
    [sessions]
  );

  const hasSessions = valid.length > 0;

  const initialId = useMemo(() => pickDefaultSessionId(valid), [valid]);

  const [selectedId, setSelectedIdState] = useState(initialId);

  const setSelectedId = useCallback((id: string) => {
    setSelectedIdState(id);
  }, []);

  const selected = useMemo(() => {
    if (!hasSessions) return null;
    return valid.find((s) => s.id === selectedId) ?? valid[0] ?? null;
  }, [hasSessions, valid, selectedId]);

  const value = useMemo<TourSessionsContextValue>(
    () => ({
      sessions: valid,
      hasSessions,
      selectedId: selected?.id ?? selectedId,
      setSelectedId,
      selected,
    }),
    [valid, hasSessions, selected, selectedId, setSelectedId]
  );

  return (
    <TourSessionsContext.Provider value={value}>{children}</TourSessionsContext.Provider>
  );
}
