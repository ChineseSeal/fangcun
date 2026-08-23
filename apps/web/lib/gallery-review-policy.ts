export const GALLERY_REVIEW_SUBJECTS = ["post", "report", "appeal"] as const;
export const GALLERY_REVIEW_ACTIONS = ["published", "rejected", "removed", "resolved", "dismissed", "accepted"] as const;

export type GalleryReviewSubject = (typeof GALLERY_REVIEW_SUBJECTS)[number];
export type GalleryReviewAction = (typeof GALLERY_REVIEW_ACTIONS)[number];

type ReviewerClaims = {
  app_metadata?: Record<string, unknown>;
  is_anonymous?: boolean;
};

export function isGalleryReviewer(user: ReviewerClaims | null | undefined): boolean {
  return user?.is_anonymous !== true && user?.app_metadata?.gallery_reviewer === true;
}

export function canApplyGalleryReview(
  subject: GalleryReviewSubject,
  fromStatus: string,
  toStatus: GalleryReviewAction,
): boolean {
  if (subject === "post") {
    return (fromStatus === "pending" && (toStatus === "published" || toStatus === "rejected"))
      || (fromStatus === "published" && toStatus === "removed")
      || ((fromStatus === "rejected" || fromStatus === "removed") && toStatus === "published");
  }
  if (subject === "report") return fromStatus === "open" && (toStatus === "resolved" || toStatus === "dismissed");
  return fromStatus === "pending" && (toStatus === "accepted" || toStatus === "rejected");
}

export function reviewReasonIsValid(status: GalleryReviewAction, note: string | null): boolean {
  if (status !== "rejected" && status !== "removed") return note === null || note.length <= 500;
  return note !== null && note.length >= 5 && note.length <= 500;
}

export function normalizeReviewNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}
