import { NextResponse } from "next/server";
import { THEME_PRESETS } from "@/lib/theme/presets";

export async function GET() {
  return NextResponse.json({
    presets: THEME_PRESETS.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
    })),
  });
}
