import { getSql } from "./db";

export async function getDashboardStats(userId: string) {
  const sql = getSql();
  const totalVideosRows = await sql`
    select count(*)::int as count
    from videos
    where user_id = ${userId}::text
  `;

  const thisMonthRows = await sql`
    select count(*)::int as count
    from videos
    where user_id = ${userId}::text
      and date_trunc('month', created_at) = date_trunc('month', now())
  `;

  const recentVideos = await sql`
    select
      id,
      title,
      mode,
      ratio,
      duration_sec,
      status,
      video_url,
      created_at
    from videos
    where user_id = ${userId}::text
    order by created_at desc
    limit 6
  `;

  return {
    totalVideos: totalVideosRows[0]?.count ?? 0,
    thisMonthVideos: thisMonthRows[0]?.count ?? 0,
    recentVideos,
  };
}