import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth";

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  return NextResponse.json({
    ok: true,
    session,
  });
}