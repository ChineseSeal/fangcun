import { describe, expect, it } from "vitest";
import { eventNames, trackEvent } from "./events";

describe("trackEvent", () => {
  it("records only achievement codes and source events", () => {
    const event = trackEvent(eventNames.achievementEarned, {
      achievementCode: "shi_zhu_bai",
      sourceEvent: "quiz_completed",
      text: "朱白",
    });

    expect(event.properties).toEqual({ achievementCode: "shi_zhu_bai", sourceEvent: "quiz_completed" });
  });

  it("records annotation toggles without seal content", () => {
    const event = trackEvent(eventNames.annotationLayerToggled, {
      annotationKind: "border",
      enabled: false,
      sealSlug: "ying-qu",
      text: "应衢",
    });

    expect(event.properties).toEqual({ annotationKind: "border", enabled: false, sealSlug: "ying-qu" });
  });

  it("creates a serializable event envelope", () => {
    const event = trackEvent(eventNames.routeViewed, { route: "/" });

    expect(event.name).toBe("route_viewed");
    expect(event.properties).toEqual({ route: "/" });
    expect(Number.isNaN(Date.parse(event.occurredAt))).toBe(false);
  });

  it("removes original seal text from telemetry properties", () => {
    const event = trackEvent(eventNames.sealGenerateClicked, {
      sealText: "清风明月",
      characterCount: 4,
      style: "汉印",
    });

    expect(event.properties).toEqual({
      characterCount: 4,
      style: "汉印",
    });
  });

  it("records lesson funnel events without lesson body content", () => {
    const event = trackEvent(eventNames.lessonCompleted, {
      lessonSlug: "zhu-bai",
      lessonOrder: 1,
      content: "课程正文",
    });

    expect(event.properties).toEqual({ lessonSlug: "zhu-bai", lessonOrder: 1 });
  });

  it("records lesson diagram changes without lesson content", () => {
    const event = trackEvent(eventNames.lessonDiagramChanged, {
      lessonSlug: "reading-order",
      variantId: "traditional",
      content: "不记录课程正文",
    });

    expect(event.name).toBe("lesson_diagram_changed");
    expect(event.properties).toEqual({ lessonSlug: "reading-order", variantId: "traditional" });
  });

  it("records 3D readiness without original seal text", () => {
    const event = trackEvent(eventNames.viewer3dReady, {
      elapsedMs: 218,
      material: "qingtian",
      text: "方寸",
    });

    expect(event.properties).toEqual({ elapsedMs: 218, material: "qingtian" });
  });

  it("records only material codes for 3D material changes", () => {
    const event = trackEvent(eventNames.viewer3dMaterialChanged, {
      from: "qingtian",
      to: "jade",
      text: "方寸",
    });

    expect(event.name).toBe("viewer_3d_material_changed");
    expect(event.properties).toEqual({ from: "qingtian", to: "jade" });
  });

  it("records scroll narrative progress without seal content", () => {
    const event = trackEvent(eventNames.motionStoryCompleted, {
      storyId: "seal-making",
      text: "方寸",
    });

    expect(event.name).toBe("motion_story_completed");
    expect(event.properties).toEqual({ storyId: "seal-making" });
  });

  it("records encyclopedia views without original seal text", () => {
    const event = trackEvent(eventNames.wikiEntryViewed, {
      category: "mode",
      termSlug: "zhuwen",
      text: "不得进入遥测",
    });

    expect(event.name).toBe("wiki_entry_viewed");
    expect(event.properties).toEqual({ category: "mode", termSlug: "zhuwen" });
  });

  it("records quiz completion without answer content", () => {
    const event = trackEvent(eventNames.quizCompleted, {
      setSlug: "intro",
      score: 4,
      total: 5,
      content: "不记录题目或答案",
    });

    expect(event.name).toBe("quiz_completed");
    expect(event.properties).toEqual({ setSlug: "intro", score: 4, total: 5 });
  });

  it("records AI fallback metadata without the prompt or inscription", () => {
    const event = trackEvent(eventNames.aiFallbackUsed, {
      cacheHit: true,
      fallbackReason: "AI_PROVIDER_UNAVAILABLE",
      text: "听雨",
      content: "完整提示词",
    });

    expect(event.name).toBe("ai_fallback_used");
    expect(event.properties).toEqual({ cacheHit: true, fallbackReason: "AI_PROVIDER_UNAVAILABLE" });
  });
});
