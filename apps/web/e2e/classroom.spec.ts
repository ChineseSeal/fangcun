import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { openStudioControls } from "./studio-helpers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLocalClassroomService = Boolean(
  supabaseUrl
  && publishableKey
  && serviceRoleKey
  && (() => {
    try {
      return ["127.0.0.1", "localhost"].includes(new URL(supabaseUrl).hostname);
    } catch {
      return false;
    }
  })(),
);

function serviceHeaders() {
  return {
    apikey: serviceRoleKey ?? "",
    Authorization: "Bearer " + (serviceRoleKey ?? ""),
    "Content-Type": "application/json",
  };
}

function memberHeaders(accessToken: string) {
  return {
    apikey: publishableKey ?? "",
    Authorization: "Bearer " + accessToken,
    "Content-Type": "application/json",
  };
}

async function createMember(request: APIRequestContext, email: string, password: string) {
  const created = await request.post(supabaseUrl + "/auth/v1/admin/users", {
    data: { email, email_confirm: true, password },
    headers: serviceHeaders(),
  });
  expect(created.ok()).toBe(true);
  const member = await created.json() as { id?: string };
  if (!member.id) throw new Error("CLASSROOM_MEMBER_CREATE_FAILED");
  const signIn = await request.post(supabaseUrl + "/auth/v1/token?grant_type=password", {
    data: { email, password },
    headers: { apikey: publishableKey ?? "", "Content-Type": "application/json" },
  });
  expect(signIn.ok()).toBe(true);
  const session = await signIn.json() as { access_token?: string };
  if (!session.access_token) throw new Error("CLASSROOM_MEMBER_SIGN_IN_FAILED");
  return { id: member.id, token: session.access_token };
}

async function signInThroughAccount(page: Page, email: string, password: string) {
  await page.goto("/account");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录并同步" }).click();
  await expect(page.getByRole("heading", { name: email })).toBeVisible();
}

test("keeps all classroom templates available without cloud configuration", async ({ page }) => {
  test.skip(Boolean(supabaseUrl), "uses the local classroom integration when Supabase is configured");
  await page.goto("/academy/classroom");
  await expect(page.getByRole("heading", { name: "课堂练习模板" })).toBeVisible();
  await expect(page.getByTestId(/^classroom-studio-/)).toHaveCount(3);
  await expect(page.getByText("云课堂尚未配置", { exact: true })).toBeVisible();
  await expect(page.getByTestId("classroom-studio-name-seal")).toHaveAttribute("href", /\/studio\?/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);

  const critical = (await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()).violations.filter((violation) => violation.impact === "critical");
  expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);

  await page.goto("/en/academy/classroom");
  await expect(page.getByRole("heading", { name: "Exercise templates" })).toBeVisible();
  await expect(page.getByTestId(/^classroom-studio-/)).toHaveCount(3);
  await expect(page.getByText("Cloud classrooms are not configured", { exact: true })).toBeVisible();
  await expect(page.getByTestId("classroom-studio-name-seal")).toHaveAttribute("href", /\/en\/studio\?/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});

test("collects private frozen versions while enforcing teacher and learner boundaries", async ({ browser, page, request }, testInfo) => {
  test.skip(!hasLocalClassroomService, "requires the isolated local Supabase classroom service");
  const nonce = (Date.now() + "-" + testInfo.project.name).replace(/[^a-z0-9-]/gi, "").toLowerCase();
  const password = "Fangcun-Classroom-2026!";
  const teacherEmail = "teacher-" + nonce + "@example.test";
  const learnerEmail = "learner-" + nonce + "@example.test";
  const secondEmail = "learner-two-" + nonce + "@example.test";
  const teacher = await createMember(request, teacherEmail, password);
  const learner = await createMember(request, learnerEmail, password);
  const secondLearner = await createMember(request, secondEmail, password);
  const restUrl = supabaseUrl + "/rest/v1";

  await signInThroughAccount(page, teacherEmail, password);
  await page.goto("/academy/classroom");
  await page.locator("#classroom-title").fill("秋季篆刻课 " + nonce.slice(-5));
  await page.locator("#classroom-exercise").selectOption("name-seal");
  await page.getByRole("button", { name: "创建课堂" }).click();
  await expect(page.getByText("课堂已创建，可以把邀请码发给学生。", { exact: true })).toBeVisible();
  const displayedCode = (await page.getByTestId("classroom-code").first().textContent())?.replace(/\s/g, "") ?? "";
  expect(displayedCode).toMatch(/^[A-F0-9]{8}$/);

  const teacherCollections = await request.get(restUrl + "/classroom_collections?select=id,join_code,status,title&join_code=eq." + displayedCode, {
    headers: memberHeaders(teacher.token),
  });
  expect(teacherCollections.ok()).toBe(true);
  const collectionRows = await teacherCollections.json() as Array<{ id?: string; join_code?: string; status?: string }>;
  expect(collectionRows).toHaveLength(1);
  const collectionId = collectionRows[0]?.id;
  if (!collectionId) throw new Error("CLASSROOM_ID_MISSING");
  await page.getByRole("link", { name: "查看课堂" }).first().click();
  await expect(page.getByText("教师视图 · 私有冻结提交", { exact: true })).toBeVisible();

  const origin = new URL(page.url()).origin;
  const learnerContext = await browser.newContext({ baseURL: origin });
  const learnerPage = await learnerContext.newPage();
  try {
    await learnerPage.goto("/studio?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yin&seed=4441&candidate=0");
    await expect(learnerPage.locator(".studio-preview svg")).toBeVisible();
    await openStudioControls(learnerPage);
    await learnerPage.getByRole("button", { name: "保存项目" }).click();
    await expect(learnerPage).toHaveURL(/projectId=project-/);
    await signInThroughAccount(learnerPage, learnerEmail, password);
    await expect(learnerPage.getByText("已把 1 枚本机印章同步到你的账户。", { exact: true })).toBeVisible();

    const learnerProjects = await request.get(restUrl + "/seal_projects?select=project_id,payload", {
      headers: memberHeaders(learner.token),
    });
    expect(learnerProjects.ok()).toBe(true);
    const projectRows = await learnerProjects.json() as Array<{ project_id?: string; payload?: { versions?: Array<{ id?: string; dsl?: { text?: string } }> } }>;
    const learnerProjectId = projectRows[0]?.project_id;
    const learnerVersionId = projectRows[0]?.payload?.versions?.at(-1)?.id;
    if (!learnerProjectId || !learnerVersionId) throw new Error("CLASSROOM_SYNCED_PROJECT_MISSING");

    await learnerPage.goto("/academy/classroom/" + displayedCode);
    await expect(learnerPage.getByText("学生视图 · 一份可替换最终稿", { exact: true })).toBeVisible();
    await learnerPage.getByLabel("课堂别名（可选）").fill("小方");
    await learnerPage.getByRole("button", { name: "提交最终稿" }).click();
    await expect(learnerPage.getByText("最终稿已提交；再次提交会替换本课堂中的这份快照。", { exact: true })).toBeVisible();

    const firstOwnSubmission = await request.get(restUrl + "/classroom_submissions?collection_id=eq." + collectionId + "&select=id,display_name,dsl", {
      headers: memberHeaders(learner.token),
    });
    expect(firstOwnSubmission.ok()).toBe(true);
    const firstOwnRows = await firstOwnSubmission.json() as Array<{ id?: string; display_name?: string; dsl?: { text?: string } }>;
    expect(firstOwnRows).toHaveLength(1);
    expect(firstOwnRows[0]).toMatchObject({ display_name: "小方" });
    const firstSubmissionId = firstOwnRows[0]?.id;

    await learnerPage.getByLabel("课堂别名（可选）").fill("小方同学");
    await learnerPage.getByRole("button", { name: "替换最终稿" }).click();
    await expect(learnerPage.getByText("最终稿已提交；再次提交会替换本课堂中的这份快照。", { exact: true })).toBeVisible();
    const replacedOwnSubmission = await request.get(restUrl + "/classroom_submissions?collection_id=eq." + collectionId + "&select=id,display_name,dsl", {
      headers: memberHeaders(learner.token),
    });
    const replacedRows = await replacedOwnSubmission.json() as Array<{ id?: string; display_name?: string; dsl?: { text?: string } }>;
    expect(replacedRows).toHaveLength(1);
    expect(replacedRows[0]).toMatchObject({ id: firstSubmissionId, display_name: "小方同学" });
    expect(replacedRows[0]?.dsl?.text).toBe("方寸");

    const secondProjectId = "classroom-project-" + nonce;
    const secondVersionId = "classroom-version-" + nonce;
    const occurredAt = new Date().toISOString();
    const secondPayload = {
      id: secondProjectId,
      name: "山水印",
      createdAt: occurredAt,
      updatedAt: occurredAt,
      archivedAt: null,
      currentVersionId: secondVersionId,
      versions: [{
        id: secondVersionId,
        number: 1,
        name: "最终版本",
        reason: "manual",
        createdAt: occurredAt,
        dsl: { text: "山水", style: "han_private", script: "han_seal", mode: "yin", impression: { seed: 4442 } },
        engineVersion: "classroom-test-engine",
        assetVersion: "classroom-test-glyph",
      }],
    };
    const seedSecondProject = await request.post(restUrl + "/seal_projects", {
      data: { user_id: secondLearner.id, project_id: secondProjectId, payload: secondPayload, updated_at: occurredAt },
      headers: memberHeaders(secondLearner.token),
    });
    expect(seedSecondProject.ok()).toBe(true);
    const secondSubmit = await request.post(restUrl + "/rpc/submit_classroom_work", {
      data: {
        display_name_input: "山水同学",
        join_code_input: displayedCode,
        project_id_input: secondProjectId,
        version_id_input: secondVersionId,
      },
      headers: memberHeaders(secondLearner.token),
    });
    expect(secondSubmit.ok()).toBe(true);

    const learnerCannotReadClass = await request.get(restUrl + "/classroom_collections?id=eq." + collectionId + "&select=id", {
      headers: memberHeaders(learner.token),
    });
    expect(learnerCannotReadClass.ok()).toBe(true);
    await expect(learnerCannotReadClass.json()).resolves.toEqual([]);
    const learnerVisibleSubmissions = await request.get(restUrl + "/classroom_submissions?collection_id=eq." + collectionId + "&select=id,display_name", {
      headers: memberHeaders(learner.token),
    });
    const learnerVisibleRows = await learnerVisibleSubmissions.json() as Array<{ display_name?: string }>;
    expect(learnerVisibleRows).toEqual([{ id: firstSubmissionId, display_name: "小方同学" }]);

    const forgedProject = await request.post(restUrl + "/rpc/submit_classroom_work", {
      data: {
        display_name_input: "伪造项目",
        join_code_input: displayedCode,
        project_id_input: secondProjectId,
        version_id_input: secondVersionId,
      },
      headers: memberHeaders(learner.token),
    });
    expect(forgedProject.ok()).toBe(false);
    await expect(forgedProject.text()).resolves.toContain("CLASSROOM_PROJECT_NOT_SYNCED");
    const forgedVersion = await request.post(restUrl + "/rpc/submit_classroom_work", {
      data: {
        display_name_input: "伪造版本",
        join_code_input: displayedCode,
        project_id_input: learnerProjectId,
        version_id_input: "version-not-owned",
      },
      headers: memberHeaders(learner.token),
    });
    expect(forgedVersion.ok()).toBe(false);
    await expect(forgedVersion.text()).resolves.toContain("CLASSROOM_VERSION_NOT_SYNCED");

    const anonymousCollection = await request.get(restUrl + "/classroom_collections?select=id", {
      headers: { apikey: publishableKey ?? "" },
    });
    const anonymousSubmissions = await request.get(restUrl + "/classroom_submissions?select=id", {
      headers: { apikey: publishableKey ?? "" },
    });
    const anonymousResolve = await request.post(restUrl + "/rpc/resolve_classroom_collection", {
      data: { join_code_input: displayedCode },
      headers: { apikey: publishableKey ?? "", "Content-Type": "application/json" },
    });
    expect(anonymousCollection.ok()).toBe(false);
    expect(anonymousSubmissions.ok()).toBe(false);
    expect(anonymousResolve.ok()).toBe(false);

    const teacherCannotSelectStudentId = await request.get(restUrl + "/classroom_submissions?collection_id=eq." + collectionId + "&select=student_id", {
      headers: memberHeaders(teacher.token),
    });
    expect(teacherCannotSelectStudentId.ok()).toBe(false);
    await expect(teacherCannotSelectStudentId.json()).resolves.toMatchObject({ code: "42501" });

    await page.reload();
    await expect(page.getByTestId("classroom-submission")).toHaveCount(2);
    await expect(page.getByText("小方同学", { exact: true })).toBeVisible();
    await expect(page.getByText("山水同学", { exact: true })).toBeVisible();
    await expect(page.getByText(teacherEmail, { exact: false })).toHaveCount(0);
    await expect(page.getByText(learnerEmail, { exact: false })).toHaveCount(0);
    await expect(page.getByText(secondEmail, { exact: false })).toHaveCount(0);

    await learnerPage.reload();
    await expect(learnerPage.getByText("山水同学", { exact: true })).toHaveCount(0);
    await expect(learnerPage.getByText("小方同学", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "关闭课堂" }).click();
    await expect(page.getByText("课堂已关闭；已有冻结快照仍可查看。", { exact: true })).toBeVisible();
    const closedSubmit = await request.post(restUrl + "/rpc/submit_classroom_work", {
      data: {
        display_name_input: "关闭后提交",
        join_code_input: displayedCode,
        project_id_input: learnerProjectId,
        version_id_input: learnerVersionId,
      },
      headers: memberHeaders(learner.token),
    });
    expect(closedSubmit.ok()).toBe(false);
    await expect(closedSubmit.text()).resolves.toContain("CLASSROOM_CLOSED");
    await learnerPage.reload();
    await expect(learnerPage.getByRole("button", { name: "替换最终稿" })).toBeDisabled();

    const unauthorizedStatus = await request.patch(restUrl + "/classroom_collections?id=eq." + collectionId + "&select=id,status", {
      data: { status: "open" },
      headers: { ...memberHeaders(learner.token), Prefer: "return=representation" },
    });
    expect(unauthorizedStatus.ok()).toBe(true);
    await expect(unauthorizedStatus.json()).resolves.toEqual([]);
    const stillClosed = await request.get(restUrl + "/classroom_collections?id=eq." + collectionId + "&select=status", {
      headers: memberHeaders(teacher.token),
    });
    await expect(stillClosed.json()).resolves.toEqual([{ status: "closed" }]);

    const critical = (await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze()).violations.filter((violation) => violation.impact === "critical");
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
  } finally {
    await learnerContext.close();
  }
});
