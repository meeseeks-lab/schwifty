import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://strudel.cc/samples.json");
    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({}, { status: 502 });
  }
}
