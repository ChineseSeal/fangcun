import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { isGalleryReviewer } from "./gallery-review-policy";

type GalleryReviewConfig = {
  publishableKey: string;
  serviceRoleKey: string;
  url: string;
};

type ReviewerAuthorization =
  | { ok: true; service: SupabaseClient; user: User }
  | { code: "REVIEW_NOT_CONFIGURED" | "REVIEWER_FORBIDDEN" | "UNAUTHORIZED"; ok: false };

function readGalleryReviewConfig(environment: NodeJS.ProcessEnv = process.env): GalleryReviewConfig | null {
  const url = environment.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !publishableKey || !serviceRoleKey) return null;
  return { url, publishableKey, serviceRoleKey };
}

function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

export async function requireGalleryReviewer(request: Request): Promise<ReviewerAuthorization> {
  const config = readGalleryReviewConfig();
  if (!config) return { ok: false, code: "REVIEW_NOT_CONFIGURED" };
  const token = readBearerToken(request);
  if (!token) return { ok: false, code: "UNAUTHORIZED" };
  const authClient = createClient(config.url, config.publishableKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return { ok: false, code: "UNAUTHORIZED" };
  if (!isGalleryReviewer(data.user)) return { ok: false, code: "REVIEWER_FORBIDDEN" };
  const service = createClient(config.url, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  return { ok: true, service, user: data.user };
}
