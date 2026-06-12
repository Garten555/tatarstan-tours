import type { TourAutoScheduleConfig } from '@/lib/tour/auto-schedule-config';
import {
  isGuideRotatingRestOnTourDay,
  resolveGuideRestWeekdays,
} from '@/lib/tour/guide-rest-schedule';

export type GuideRestKind = 'fixed' | 'rotation';

export function getGuideRestOnDay(params: {
  guideId: string;
  slotWeekday: number;
  slotDayKey: string;
  guideIds: string[];
  config: TourAutoScheduleConfig;
}): GuideRestKind | null {
  if (resolveGuideRestWeekdays(params.config).includes(params.slotWeekday)) {
    return 'fixed';
  }
  if (
    isGuideRotatingRestOnTourDay({
      guideId: params.guideId,
      slotWeekday: params.slotWeekday,
      slotDayKey: params.slotDayKey,
      guideIds: params.guideIds,
      config: params.config,
    })
  ) {
    return 'rotation';
  }
  return null;
}

export function listGuidesRestingOnDay(params: {
  dayKey: string;
  weekday: number;
  guideIds: string[];
  guideNames: Map<string, string>;
  config: TourAutoScheduleConfig;
  /** Гиды с выездом в этот день — не считаются отдыхающими. */
  guideIdsWithSessions: Set<string>;
}): Array<{ id: string; name: string; kind: GuideRestKind }> {
  const out: Array<{ id: string; name: string; kind: GuideRestKind }> = [];
  for (const id of params.guideIds) {
    if (params.guideIdsWithSessions.has(id)) continue;
    const kind = getGuideRestOnDay({
      guideId: id,
      slotWeekday: params.weekday,
      slotDayKey: params.dayKey,
      guideIds: params.guideIds,
      config: params.config,
    });
    if (kind) {
      out.push({ id, name: params.guideNames.get(id) ?? 'Гид', kind });
    }
  }
  return out;
}

export function guideRestKindLabel(kind: GuideRestKind): string {
  return kind === 'fixed' ? 'выходной по шаблону' : 'ротация (день без выезда)';
}
