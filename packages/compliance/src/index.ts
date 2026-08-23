import type { SealDsl } from "@fangcun/dsl-schema";

export type ComplianceSeverity = "error" | "warning";

export type ComplianceFinding = {
  code: "GOV_ORG_NAME" | "OFFICIAL_SEAL_TERM" | "OFFICIAL_SEAL_FORM" | "PERSONAL_SEAL_WARNING";
  layer: "L1" | "L2" | "L3" | "L4";
  severity: ComplianceSeverity;
  message: string;
  suggestion: string;
  appealable: boolean;
};

export type ComplianceResult = {
  ok: boolean;
  decision: "allow" | "warning" | "block";
  findings: ComplianceFinding[];
};

export type ComplianceInput = {
  text: string;
  dsl?: Partial<SealDsl> & { decoration?: { star?: boolean } };
};

const governmentNamePattern = /(人民政府|公安局|人民法院|人民检察院|管理委员会)$/;
const officialTermPattern = /(公章|专用章|财务章|发票章|合同章)/;

export function checkCompliance(input: ComplianceInput): ComplianceResult {
  const findings: ComplianceFinding[] = [];

  if (governmentNamePattern.test(input.text)) {
    findings.push({
      code: "GOV_ORG_NAME",
      layer: "L1",
      severity: "error",
      message: "印文包含国家机关名称。方寸不提供此类生成。",
      suggestion: "请改用个人姓名、斋号或闲章文字。",
      appealable: true,
    });
  }

  if (officialTermPattern.test(input.text)) {
    findings.push({
      code: "OFFICIAL_SEAL_TERM",
      layer: "L1",
      severity: "error",
      message: "印文包含法定印鉴用途词语，无法生成。",
      suggestion: "艺术印章不具备公章效力，请改用个人创作文字。",
      appealable: true,
    });
  }

  const shape = input.dsl?.shape;
  const layout = input.dsl?.layout;
  if (shape?.type === "circle" && input.dsl?.decoration?.star === true && layout?.strategy === "ring") {
    findings.push({
      code: "OFFICIAL_SEAL_FORM",
      layer: "L2",
      severity: "error",
      message: "该参数组合接近公章形制，无法生成。",
      suggestion: "请移除五角星或环形排字，改用艺术印章章法。",
      appealable: true,
    });
  }

  if (/之印$/.test(input.text)) {
    findings.push({
      code: "PERSONAL_SEAL_WARNING",
      layer: "L3",
      severity: "warning",
      message: "“之印”通常用于个人名章语境，请确认仅作艺术创作。",
      suggestion: "发布或导出时请勿将艺术印章用于身份或机构证明。",
      appealable: false,
    });
  }

  const hasError = findings.some((finding) => finding.severity === "error");
  return {
    ok: !hasError,
    decision: hasError ? "block" : findings.length > 0 ? "warning" : "allow",
    findings,
  };
}
