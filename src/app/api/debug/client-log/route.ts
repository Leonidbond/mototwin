import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log("[debug-client-log]", JSON.stringify(payload));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[debug-client-log] failed", error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

