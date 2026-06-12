import type { SupabaseClient } from '@supabase/supabase-js';

import {
  DEFAULT_TOUR_AUTO_SCHEDULE_CONFIG,
  normalizeTourAutoScheduleConfig,
  TOUR_AUTO_SCHEDULE_SETTINGS_KEY,
  type TourAutoScheduleConfig,
} from '@/lib/tour/auto-schedule-config';

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

  const json = (data as { value_json?: unknown }).value_json;
  if (json && typeof json === 'object' && 'defaults' in (json as object)) {
    return normalizeTourAutoScheduleConfig((json as { defaults: unknown }).defaults);
  }

  return normalizeTourAutoScheduleConfig(json);
}

export async function saveTourAutoScheduleConfig(
  serviceClient: SupabaseClient,
  config: TourAutoScheduleConfig
): Promise<void> {
  const normalized = normalizeTourAutoScheduleConfig(config);
  const payload = {
    key: TOUR_AUTO_SCHEDULE_SETTINGS_KEY,
    value_json: { defaults: normalized, updated_at: new Date().toISOString() },
  };

  const { data: existing } = await serviceClient
    .from('site_settings')
    .select('key')
    .eq('key', TOUR_AUTO_SCHEDULE_SETTINGS_KEY)
    .maybeSingle();

  if (existing) {
    const { error } = await serviceClient
      .from('site_settings')
      .update({ value_json: payload.value_json })
      .eq('key', TOUR_AUTO_SCHEDULE_SETTINGS_KEY);
    if (error) throw error;
  } else {
    const { error } = await serviceClient.from('site_settings').insert(payload);
    if (error) throw error;
  }
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
