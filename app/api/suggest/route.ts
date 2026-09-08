import { NextResponse } from "next/server";
import {
  DESIGN_TYPES,
  generateSuggestions,
  type DesignType,
} from "@/lib/suggestions";

interface SuggestRequestBody {
  prompt?: unknown;
  designType?: unknown;
  tone?: unknown;
  count?: unknown;
}

export async function POST(request: Request) {
  let body: SuggestRequestBody;
  try {
    body = (await request.json()) as SuggestRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  if (!prompt.trim()) {
    return NextResponse.json(
      { error: "A non-empty 'prompt' is required" },
      { status: 400 },
    );
  }

  const designType = body.designType as DesignType;
  if (!DESIGN_TYPES.includes(designType)) {
    return NextResponse.json(
      {
        error: `'designType' must be one of: ${DESIGN_TYPES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  const tone = typeof body.tone === "string" ? body.tone : undefined;
  const count =
    typeof body.count === "number" && Number.isFinite(body.count)
      ? Math.min(6, Math.max(1, Math.trunc(body.count)))
      : 3;

  try {
    const suggestions = generateSuggestions({ prompt, designType, tone }, count);
    return NextResponse.json({ brief: { prompt, designType, tone }, suggestions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
