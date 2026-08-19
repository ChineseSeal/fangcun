import { describe, expect, it } from "vitest";
import { canApplyGalleryReview, isGalleryReviewer, normalizeReviewNote, reviewReasonIsValid } from "./gallery-review-policy";

describe("gallery reviewer authorization", () => {
  it("accepts only the protected app metadata role", () => {
    expect(isGalleryReviewer({ app_metadata: { gallery_reviewer: true } })).toBe(true);
    expect(isGalleryReviewer({ app_metadata: { gallery_reviewer: false } })).toBe(false);
    expect(isGalleryReviewer({ app_metadata: {}, is_anonymous: true })).toBe(false);
    expect(isGalleryReviewer({ app_metadata: {}, user_metadata: { gallery_reviewer: true } } as never)).toBe(false);
  });
});

describe("gallery review transitions", () => {
  it("allows only review queue transitions", () => {
    expect(canApplyGalleryReview("post", "pending", "published")).toBe(true);
    expect(canApplyGalleryReview("post", "published", "removed")).toBe(true);
    expect(canApplyGalleryReview("post", "published", "rejected")).toBe(false);
    expect(canApplyGalleryReview("report", "open", "resolved")).toBe(true);
    expect(canApplyGalleryReview("appeal", "pending", "accepted")).toBe(true);
    expect(canApplyGalleryReview("appeal", "accepted", "published")).toBe(false);
  });

  it("requires a useful reason for rejection and removal", () => {
    expect(normalizeReviewNote("  侵权风险  ")).toBe("侵权风险");
    expect(normalizeReviewNote("   ")).toBeNull();
    expect(reviewReasonIsValid("rejected", "太短")).toBe(false);
    expect(reviewReasonIsValid("rejected", "存在无法核验的授权风险")).toBe(true);
    expect(reviewReasonIsValid("published", null)).toBe(true);
  });
});
