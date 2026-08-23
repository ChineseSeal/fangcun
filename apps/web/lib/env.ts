const appEnv = process.env.NEXT_PUBLIC_APP_ENV ?? process.env.VERCEL_ENV ?? "development";

export const env = {
  appEnv:
    appEnv === "production"
      ? "production"
      : appEnv === "preview" || appEnv === "staging"
        ? "staging"
        : "development",
} as const;
