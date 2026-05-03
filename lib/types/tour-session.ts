/** Строка таблицы tour_sessions (слот выезда) */
export type TourSessionRow = {
  id: string;
  start_at: string;
  end_at: string | null;
  max_participants: number;
  current_participants: number | null;
  status: string;
  guide_id?: string | null;
};
