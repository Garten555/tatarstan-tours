export type ReviewTone = 'positive' | 'neutral' | 'negative';

export function getReviewTone(rating: number): ReviewTone {
  if (rating >= 4) return 'positive';
  if (rating === 3) return 'neutral';
  return 'negative';
}

export function getReviewToneLabel(tone: ReviewTone): string {
  if (tone === 'positive') return 'Положительный отзыв';
  if (tone === 'neutral') return 'Нейтральный отзыв';
  return 'Отрицательный отзыв';
}

export function getReviewRatingColor(rating: number): string {
  if (rating >= 4.5) return 'text-emerald-600';
  if (rating >= 3.5) return 'text-lime-600';
  if (rating >= 2.5) return 'text-amber-500';
  return 'text-rose-500';
}

export function getReviewTheme(rating: number) {
  const tone = getReviewTone(rating);
  const ratingColor = getReviewRatingColor(rating);

  if (tone === 'positive') {
    return {
      tone,
      label: getReviewToneLabel(tone),
      ratingColor,
      starActive: 'border-emerald-500 bg-emerald-50 text-emerald-600',
      card: 'border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white',
      quote: 'text-emerald-600',
      avatar: 'from-emerald-400 to-emerald-600 border-emerald-100',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      focusRing: 'focus:ring-emerald-500',
      uploadHover: 'hover:border-emerald-400',
      submit: 'bg-emerald-600 hover:bg-emerald-700',
    };
  }

  if (tone === 'neutral') {
    return {
      tone,
      label: getReviewToneLabel(tone),
      ratingColor,
      starActive: 'border-amber-500 bg-amber-50 text-amber-600',
      card: 'border-amber-200 bg-gradient-to-br from-amber-50/80 to-white',
      quote: 'text-amber-500',
      avatar: 'from-amber-400 to-orange-500 border-amber-100',
      badge: 'bg-amber-100 text-amber-900 border-amber-200',
      focusRing: 'focus:ring-amber-500',
      uploadHover: 'hover:border-amber-400',
      submit: 'bg-amber-600 hover:bg-amber-700',
    };
  }

  return {
    tone,
    label: getReviewToneLabel(tone),
    ratingColor,
    starActive: 'border-rose-500 bg-rose-50 text-rose-600',
    card: 'border-rose-200 bg-gradient-to-br from-rose-50/80 to-white',
    quote: 'text-rose-500',
    avatar: 'from-rose-400 to-red-600 border-rose-100',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    focusRing: 'focus:ring-rose-500',
    uploadHover: 'hover:border-rose-400',
    submit: 'bg-rose-600 hover:bg-rose-700',
  };
}
