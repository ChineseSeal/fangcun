export const eventNames = {
  achievementEarned: "achievement_earned",
  aiFallbackUsed: "ai_fallback_used",
  aiPromptSubmitted: "ai_prompt_submitted",
  aiRecommendationApplied: "ai_recommendation_applied",
  annotationLayerToggled: "annotation_layer_toggled",
  homeInputStarted: "home_input_started",
  lessonCompleted: "lesson_completed",
  lessonDiagramChanged: "lesson_diagram_changed",
  lessonDisplayModeChanged: "lesson_display_mode_changed",
  lessonHandoutPrinted: "lesson_handout_printed",
  lessonPracticeClicked: "lesson_practice_clicked",
  lessonStarted: "lesson_started",
  motionStoryCompleted: "motion_story_completed",
  motionStorySkipped: "motion_story_skipped",
  motionStoryStarted: "motion_story_started",
  quizCompleted: "quiz_completed",
  quizShared: "quiz_shared",
  quizStarted: "quiz_started",
  sealGenerateClicked: "seal_generate_clicked",
  routeViewed: "route_viewed",
  viewer3dFallback: "viewer_3d_fallback",
  viewer3dMaterialChanged: "viewer_3d_material_changed",
  viewer3dOpened: "viewer_3d_opened",
  viewer3dReady: "viewer_3d_ready",
  viewer3dViewChanged: "viewer_3d_view_changed",
  wikiEntryViewed: "wiki_entry_viewed",
} as const;

export type FangcunEventName = (typeof eventNames)[keyof typeof eventNames];

export type FangcunEvent = {
  name: FangcunEventName;
  occurredAt: string;
  properties?: Record<string, string | number | boolean | undefined>;
};

const sensitivePropertyNames = new Set([
  "text",
  "sealText",
  "originalText",
  "content",
]);

function sanitizeProperties(
  properties: FangcunEvent["properties"],
): FangcunEvent["properties"] {
  if (!properties) return undefined;

  return Object.fromEntries(
    Object.entries(properties).filter(
      ([key, value]) => value !== undefined && !sensitivePropertyNames.has(key),
    ),
  );
}

export function trackEvent(
  name: FangcunEventName,
  properties?: FangcunEvent["properties"],
): FangcunEvent {
  const event: FangcunEvent = {
    name,
    occurredAt: new Date().toISOString(),
    properties: sanitizeProperties(properties),
  };

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<FangcunEvent>("fangcun:event", { detail: event }),
    );
  }

  return event;
}
