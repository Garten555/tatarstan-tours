/** Роли, чьи отзывы публикуются сразу без модерации. */
const AUTO_PUBLISH_REVIEW_ROLES = new Set(['super_admin']);

export function shouldAutoPublishReview(role: string | null | undefined): boolean {
  return !!role && AUTO_PUBLISH_REVIEW_ROLES.has(role);
}
