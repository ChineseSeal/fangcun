import type { SupabaseClient } from "@supabase/supabase-js";
import type { GalleryReviewAction, GalleryReviewSubject } from "./gallery-review-policy";

export type ReviewPost = {
  createdAt: string;
  id: string;
  ownerId: string;
  publishedAt: string | null;
  reviewReason: string | null;
  status: "pending" | "published" | "rejected" | "removed";
  text: string;
  title: string | null;
};

export type ReviewReport = {
  createdAt: string;
  detail: string | null;
  id: string;
  postId: string;
  reason: "copyright" | "impersonation" | "illegal" | "other";
  reporterId: string;
};

export type ReviewAppeal = {
  createdAt: string;
  id: string;
  postId: string;
  reason: string;
  appellantId: string;
};

export type GalleryReviewDashboard = {
  appeals: ReviewAppeal[];
  posts: ReviewPost[];
  reports: ReviewReport[];
};

type ReviewRequest = {
  nextStatus: GalleryReviewAction;
  reviewerNote?: string;
  subjectId: string;
  subjectType: GalleryReviewSubject;
};

async function reviewRequest<T>(client: SupabaseClient, init?: RequestInit): Promise<T> {
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("REVIEW_AUTH_REQUIRED");
  const response = await fetch("/api/gallery/review", {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...init?.headers,
    },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok || typeof body !== "object" || body === null || !("ok" in body) || body.ok !== true) {
    const code = typeof body === "object" && body !== null && "error" in body && typeof body.error === "object" && body.error !== null && "code" in body.error && typeof body.error.code === "string"
      ? body.error.code
      : "REVIEW_REQUEST_FAILED";
    throw new Error(code);
  }
  return body as T;
}

export async function fetchGalleryReviewDashboard(client: SupabaseClient): Promise<GalleryReviewDashboard> {
  const result = await reviewRequest<{ dashboard: GalleryReviewDashboard }>(client);
  return result.dashboard;
}

export async function applyGalleryReview(client: SupabaseClient, request: ReviewRequest): Promise<void> {
  await reviewRequest(client, { body: JSON.stringify(request), method: "PATCH" });
}
