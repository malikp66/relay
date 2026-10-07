import { PGlite } from "@electric-sql/pglite";
const db = new PGlite("/private/tmp/claude-501/-Users-starvodev-Documents-relay/c4b6a349-411c-44f6-9a00-e7916e22b239/scratchpad/pgcopy");
const from = new Date(Date.now() - 29*864e5).toISOString(), to = new Date().toISOString();
const r = await db.query(`with days as (
      select generate_series(date_trunc('day', $1::timestamptz at time zone 'Asia/Jakarta'), date_trunc('day', $2::timestamptz at time zone 'Asia/Jakarta'), interval '1 day') as d
    )
    select to_char(d, 'YYYY-MM-DD') as day,
      (select count(*) from tasks where date_trunc('day', created_at at time zone 'Asia/Jakarta') = d)::int as created,
      (select count(*) from tasks where date_trunc('day', finished_at at time zone 'Asia/Jakarta') = d)::int as finished
    from days order by d`, [from, to]);
console.log(r.rows.slice(-8), r.rows.length);
