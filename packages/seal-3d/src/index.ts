import { getInscriptionFaces, type SealDsl } from "@fangcun/dsl-schema";

export type Seal3dMaterial = {
  code: SealDsl["physical"]["material"];
  label: string;
  color: `#${string}`;
  secondaryColor: `#${string}`;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  pattern: "cloud" | "grain" | "mottle" | "patina" | "speckle";
};

export type Seal3dModel = {
  impressionMode: SealDsl["mode"];
  profile: "box" | "cylinder";
  dimensionsMm: {
    width: number;
    depth: number;
    height: number;
  };
  sceneScale: {
    width: number;
    depth: number;
    height: number;
  };
  material: Seal3dMaterial;
  knobVariant: "plain" | "rounded" | "arched";
  inscription: {
    enabled: boolean;
    side: SealDsl["inscription"]["side"];
    characterCount: number;
    faces: Array<{
      side: SealDsl["inscription"]["side"];
      text: string;
    }>;
    knife: SealDsl["inscription"]["knife"];
    script: SealDsl["inscription"]["script"];
    rendering: {
      surface: "planar" | "cylindrical";
      relief: "bump";
      depthScale: number;
    };
  };
  glyphRelief: {
    source: "seal-engine-svg";
    mode: "raised" | "recessed";
    depthScale: number;
    signedDepthScale: number;
    maxDepthScale: number;
  };
  warnings: string[];
};

export type Seal3dModelOverrides = {
  dimensionsMm?: Seal3dModel["dimensionsMm"];
  fitToView?: boolean;
  knobVariant?: Seal3dModel["knobVariant"];
  warnings?: readonly string[];
};

export const seal3dMaterialCatalog: Record<SealDsl["physical"]["material"], Seal3dMaterial> = {
  qingtian: {
    code: "qingtian",
    label: "青田石",
    color: "#A8B5A0",
    secondaryColor: "#6F8174",
    roughness: 0.74,
    metalness: 0,
    clearcoat: 0.12,
    clearcoatRoughness: 0.72,
    pattern: "cloud",
  },
  shoushan: {
    code: "shoushan",
    label: "寿山石",
    color: "#C7A37B",
    secondaryColor: "#9A654F",
    roughness: 0.7,
    metalness: 0,
    clearcoat: 0.18,
    clearcoatRoughness: 0.65,
    pattern: "mottle",
  },
  changhua: {
    code: "changhua",
    label: "昌化石",
    color: "#A86958",
    secondaryColor: "#763E36",
    roughness: 0.76,
    metalness: 0,
    clearcoat: 0.1,
    clearcoatRoughness: 0.78,
    pattern: "mottle",
  },
  bahrain: {
    code: "bahrain",
    label: "巴林石",
    color: "#B58B72",
    secondaryColor: "#815F55",
    roughness: 0.72,
    metalness: 0,
    clearcoat: 0.14,
    clearcoatRoughness: 0.7,
    pattern: "cloud",
  },
  copper: {
    code: "copper",
    label: "铜",
    color: "#8D563B",
    secondaryColor: "#3D756C",
    roughness: 0.42,
    metalness: 0.78,
    clearcoat: 0.1,
    clearcoatRoughness: 0.5,
    pattern: "patina",
  },
  jade: {
    code: "jade",
    label: "玉",
    color: "#D8D8C6",
    secondaryColor: "#8FA99A",
    roughness: 0.32,
    metalness: 0,
    clearcoat: 0.76,
    clearcoatRoughness: 0.2,
    pattern: "cloud",
  },
  wood: {
    code: "wood",
    label: "木",
    color: "#76503A",
    secondaryColor: "#3E281F",
    roughness: 0.86,
    metalness: 0,
    clearcoat: 0.04,
    clearcoatRoughness: 0.9,
    pattern: "grain",
  },
  ceramic: {
    code: "ceramic",
    label: "陶",
    color: "#A66E51",
    secondaryColor: "#69483B",
    roughness: 0.82,
    metalness: 0,
    clearcoat: 0.08,
    clearcoatRoughness: 0.74,
    pattern: "speckle",
  },
  other: {
    code: "other",
    label: "素石",
    color: "#B6AA98",
    secondaryColor: "#81786B",
    roughness: 0.78,
    metalness: 0,
    clearcoat: 0.08,
    clearcoatRoughness: 0.82,
    pattern: "speckle",
  },
};

function footprint(sizeMm: number, ratio: number, round: boolean) {
  if (round) return { width: sizeMm, depth: sizeMm };
  if (ratio >= 1) return { width: sizeMm, depth: sizeMm / ratio };
  return { width: sizeMm * ratio, depth: sizeMm };
}

export function deriveSeal3dModel(dsl: SealDsl, overrides: Seal3dModelOverrides = {}): Seal3dModel {
  const round = dsl.shape.type === "circle" || dsl.shape.type === "ellipse";
  const base = footprint(dsl.physical.sizeMm, dsl.shape.ratio, round);
  const height = Math.max(28, dsl.physical.sizeMm * 2.4);
  const dimensionsMm = overrides.dimensionsMm ?? {
    width: Number(base.width.toFixed(2)),
    depth: Number(base.depth.toFixed(2)),
    height: Number(height.toFixed(2)),
  };
  const sceneUnitMm = overrides.fitToView
    ? Math.max(dimensionsMm.width, dimensionsMm.depth, dimensionsMm.height) / 3
    : 20;
  const inscriptionFaces = dsl.inscription.enabled ? getInscriptionFaces(dsl.inscription) : [];
  const warnings = dsl.shape.type === "freeform"
    ? ["FREEFORM_PROFILE_APPROXIMATED"]
    : dsl.shape.type === "ellipse"
      ? ["ELLIPSE_PROFILE_APPROXIMATED"]
      : [];
  if (dsl.shape.type === "ellipse" && inscriptionFaces.length > 0) {
    warnings.push("ELLIPSE_INSCRIPTION_UV_APPROXIMATED");
  }
  warnings.push(...(overrides.warnings ?? []));

  return {
    impressionMode: dsl.mode,
    profile: round ? "cylinder" : "box",
    dimensionsMm,
    sceneScale: {
      width: Number((dimensionsMm.width / sceneUnitMm).toFixed(4)),
      depth: Number((dimensionsMm.depth / sceneUnitMm).toFixed(4)),
      height: Number((dimensionsMm.height / sceneUnitMm).toFixed(4)),
    },
    material: seal3dMaterialCatalog[dsl.physical.material],
    knobVariant: overrides.knobVariant ?? (["plain", "rounded", "arched"] as const)[dsl.impression.seed % 3],
    inscription: {
      enabled: dsl.inscription.enabled && inscriptionFaces.some((face) => face.text.length > 0),
      side: inscriptionFaces[0]?.side ?? dsl.inscription.side,
      characterCount: inscriptionFaces.reduce((sum, face) => sum + Array.from(face.text).length, 0),
      faces: inscriptionFaces,
      knife: dsl.inscription.knife,
      script: dsl.inscription.script,
      rendering: {
        surface: round ? "cylindrical" : "planar",
        relief: "bump",
        depthScale: dsl.inscription.knife === "double" ? 0.026 : 0.012,
      },
    },
    glyphRelief: {
      source: "seal-engine-svg",
      mode: dsl.mode === "yin" ? "recessed" : "raised",
      depthScale: 0.032,
      signedDepthScale: dsl.mode === "yin" ? -0.032 : 0.032,
      maxDepthScale: 0.04,
    },
    warnings,
  };
}

export function formatSealDimensions(model: Seal3dModel): string {
  const { width, depth, height } = model.dimensionsMm;
  return `${width} × ${depth} × ${height} mm`;
}
