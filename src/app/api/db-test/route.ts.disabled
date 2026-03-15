import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await sql`
      select
        current_database() as db_name,
        current_schema() as schema_name
    `;

    const columnInfo = await sql`
      select
        table_name,
        column_name,
        data_type
      from information_schema.columns
      where table_name = 'videos'
        and column_name = 'user_id'
    `;

    return NextResponse.json({
      ok: true,
      db: result[0],
      videosUserId: columnInfo[0] ?? null,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "DB test failed",
      },
      { status: 500 }
    );
  }
}