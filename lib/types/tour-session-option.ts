/** Слот выезда для UI (список на карточке тура) */
export type TourSessionOption = {
  id: string;
  start_at: string;
  end_at: string | null;
  max_participants: number;
  current_participants: number | null;
};
