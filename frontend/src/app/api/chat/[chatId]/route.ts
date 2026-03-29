import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { messages, stream } = body;

  return NextResponse.json({
    message: "Hello! I'm a roleplay character. Ask me something!",
  });
}
