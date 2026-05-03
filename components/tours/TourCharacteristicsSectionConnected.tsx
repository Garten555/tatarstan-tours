'use client';

import TourCharacteristicsSection from '@/components/tours/TourCharacteristicsSection';
import { useTourSessions } from '@/components/tours/TourSessionsProvider';
import { formatSessionRange, tourDurationLabel } from '@/lib/tour/session-display';

type TourCharacteristicsSectionConnectedProps = {
  fallbackStartDateLabel: string;
  fallbackDurationLabel: string;
  fallbackMaxParticipants: number;
  priceLabel: string;
};

/** Характеристики с датой и лимитом группы по выбранному слоту (если есть слоты в контексте). */
export default function TourCharacteristicsSectionConnected({
  fallbackStartDateLabel,
  fallbackDurationLabel,
  fallbackMaxParticipants,
  priceLabel,
}: TourCharacteristicsSectionConnectedProps) {
  const ctx = useTourSessions();

  const startDateLabel =
    ctx?.hasSessions && ctx.selected
      ? formatSessionRange(ctx.selected.start_at, ctx.selected.end_at)
      : fallbackStartDateLabel;

  const durationLabel =
    ctx?.hasSessions && ctx.selected
      ? tourDurationLabel(ctx.selected.start_at, ctx.selected.end_at)
      : fallbackDurationLabel;

  const maxParticipants =
    ctx?.hasSessions && ctx.selected
      ? ctx.selected.max_participants
      : fallbackMaxParticipants;

  return (
    <TourCharacteristicsSection
      startDateLabel={startDateLabel}
      durationLabel={durationLabel}
      maxParticipants={maxParticipants}
      priceLabel={priceLabel}
    />
  );
}
