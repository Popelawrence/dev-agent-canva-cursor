export type DesignType =
  | "instagram-post"
  | "presentation"
  | "poster"
  | "logo"
  | "story";

export interface DesignBrief {
  prompt: string;
  designType: DesignType;
  tone?: string;
}

export interface DesignSuggestion {
  id: string;
  title: string;
  dimensions: { width: number; height: number };
  palette: string[];
  fontPairing: { heading: string; body: string };
  layout: string;
  headline: string;
  notes: string;
}

const DIMENSIONS: Record<DesignType, { width: number; height: number }> = {
  "instagram-post": { width: 1080, height: 1080 },
  presentation: { width: 1920, height: 1080 },
  poster: { width: 2480, height: 3508 },
  logo: { width: 500, height: 500 },
  story: { width: 1080, height: 1920 },
};

const PALETTES: string[][] = [
  ["#0F172A", "#38BDF8", "#F8FAFC", "#FACC15"],
  ["#1E1B4B", "#8B5CF6", "#F5F3FF", "#F472B6"],
  ["#052E16", "#22C55E", "#F0FDF4", "#FB923C"],
  ["#450A0A", "#EF4444", "#FEF2F2", "#FBBF24"],
];

const FONT_PAIRINGS: { heading: string; body: string }[] = [
  { heading: "Poppins", body: "Inter" },
  { heading: "Playfair Display", body: "Source Sans Pro" },
  { heading: "Montserrat", body: "Lato" },
  { heading: "Archivo", body: "Roboto" },
];

const LAYOUTS: Record<DesignType, string[]> = {
  "instagram-post": [
    "Centered headline over a full-bleed gradient with a bottom caption bar",
    "Split layout: bold headline left, product image right",
  ],
  presentation: [
    "Title slide with left-aligned heading and a thin accent rule",
    "Two-column agenda with numbered highlights",
  ],
  poster: [
    "Large top headline, hero image mid-frame, event details footer",
    "Vertical stripe accent with stacked type block",
  ],
  logo: [
    "Wordmark with a geometric monogram lockup",
    "Icon-above-text stacked lockup with generous spacing",
  ],
  story: [
    "Full-height gradient with a swipe-up call to action",
    "Top headline, centered sticker, bottom action button",
  ],
};

/**
 * Deterministic hash so identical briefs yield identical suggestions.
 * Runs fully offline — no external design API required for the demo.
 */
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(items: T[], seed: number, offset: number): T {
  return items[(seed + offset) % items.length];
}

export function generateSuggestions(
  brief: DesignBrief,
  count = 3,
): DesignSuggestion[] {
  const prompt = brief.prompt.trim();
  if (!prompt) {
    throw new Error("Brief prompt must not be empty");
  }

  const tone = brief.tone?.trim() || "modern";
  const seed = hash(`${prompt}|${brief.designType}|${tone}`);
  const dimensions = DIMENSIONS[brief.designType];
  const layouts = LAYOUTS[brief.designType];

  return Array.from({ length: Math.max(1, count) }, (_, i) => {
    const palette = pick(PALETTES, seed, i);
    const fontPairing = pick(FONT_PAIRINGS, seed, i + 1);
    const layout = pick(layouts, seed, i);
    const headline = buildHeadline(prompt, tone, i);

    return {
      id: `${brief.designType}-${seed}-${i}`,
      title: `${capitalize(tone)} ${labelForType(brief.designType)} concept ${i + 1}`,
      dimensions,
      palette,
      fontPairing,
      layout,
      headline,
      notes: `Optimized for a ${tone} tone. Pair ${fontPairing.heading} headings with ${fontPairing.body} body copy and lead with the ${palette[1]} accent.`,
    };
  });
}

function buildHeadline(prompt: string, tone: string, index: number): string {
  const cleaned = capitalize(prompt.replace(/[.!?]+$/, ""));
  const templates = [
    cleaned,
    `${cleaned} — ${capitalize(tone)} & bold`,
    `Introducing: ${cleaned}`,
  ];
  return templates[index % templates.length];
}

function labelForType(type: DesignType): string {
  return type
    .split("-")
    .map(capitalize)
    .join(" ");
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const DESIGN_TYPES: DesignType[] = [
  "instagram-post",
  "presentation",
  "poster",
  "logo",
  "story",
];
