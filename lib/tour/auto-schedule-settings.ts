import type { SupabaseClient } from '@supabase/supabase-js';

import {
  DEFAULT_TOUR_AUTO_SCHEDULE_CONFIG,
  toStoredTourAutoScheduleConfig,
  TOUR_AUTO_SCHEDULE_SETTINGS_KEY,
  type TourAutoScheduleConfig,
} from '@/lib/tour/auto-schedule-config';

function readConfigFromValueJson(valueJson: unknown): TourAutoScheduleConfig {
  if (!valueJson || typeof valueJson !== 'object') {
    return { ...DEFAULT_TOUR_AUTO_SCHEDULE_CONFIG };
  }

  const envelope = valueJson as Record<string, unknown>;
  const raw =
    envelope.defaults != null && typeof envelope.defaults === 'object'
      ? envelope.defaults
      : valueJson;

  return toStoredTourAutoScheduleConfig(raw);
}

export async function loadTourAutoScheduleConfig(
  serviceClient: SupabaseClient
): Promise<TourAutoScheduleConfig> {
  const { data, error } = await serviceClient
    .from('site_settings')
    .select('value_json')
    .eq('key', TOUR_AUTO_SCHEDULE_SETTINGS_KEY)
    .maybeSingle();

  if (error || !data) {
    return { ...DEFAULT_TOUR_AUTO_SCHEDULE_CONFIG };
  }

  return readConfigFromValueJson((data as { value_json?: unknown }).value_json);
}

/** Полная замена шаблона в БД — в value_json только defaults + updated_at. */
export async function saveTourAutoScheduleConfig(
  serviceClient: SupabaseClient,
  config: TourAutoScheduleConfig
): Promise<TourAutoScheduleConfig> {
  const stored = toStoredTourAutoScheduleConfig(config);
  const value_json = {
    defaults: stored,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await serviceClient
    .from('site_settings')
    .select('key')
    .eq('key', TOUR_AUTO_SCHEDULE_SETTINGS_KEY)
    .maybeSingle();

  if (existing) {
    const { error } = await serviceClient
      .from('site_settings')
      .update({ value_json })
      .eq('key', TOUR_AUTO_SCHEDULE_SETTINGS_KEY);
    if (error) throw error;
  } else {
    const { error } = await serviceClient.from('site_settings').insert({
      key: TOUR_AUTO_SCHEDULE_SETTINGS_KEY,
      value_json,
    });
    if (error) throw error;
  }

  return stored;
}

export async function loadActiveGuideIds(
  serviceClient: SupabaseClient
): Promise<string[]> {
  const { data, error } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('role', 'guide')
    .eq('is_banned', false);

  if (error) throw error;
  return (data ?? []).map((r) => (r as { id: string }).id);
}
