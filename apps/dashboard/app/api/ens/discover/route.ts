import { NextRequest, NextResponse } from "next/server";
import { discoverAgent } from "@/lib/ens/client";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "Missing name parameter" }, { status: 400 });
  }

  try {
    const result = await discoverAgent(name);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "ENS resolution failed" },
      { status: 500 }
    );
  }
}
