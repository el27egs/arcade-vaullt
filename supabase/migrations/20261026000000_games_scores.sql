-- SPEC 06 — Leaderboard y tabla de juegos.
-- games: catálogo de juegos reales (solo lectura desde la app).
-- scores: puntuaciones; user_id opcional mientras no haya auth real.

create table public.games (
  id          text primary key,
  title       text not null,
  category    text not null check (category in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  created_at  timestamptz not null default now()
);

create table public.scores (
  id           bigint generated always as identity primary key,
  game_id      text not null references public.games (id),
  player_name  text not null check (char_length(btrim(player_name)) between 1 and 20),
  score        int  not null check (score between 0 and 10000000),
  user_id      uuid null references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index scores_game_ranking_idx on public.scores (game_id, score desc, created_at asc);
create index scores_global_ranking_idx on public.scores (score desc, created_at asc);
create index scores_recent_idx on public.scores (created_at desc);
create index scores_user_id_idx on public.scores (user_id);

-- best y plays se calculan, nunca se guardan.
create view public.games_with_stats with (security_invoker = true) as
  select g.id,
         g.title,
         g.category,
         coalesce(max(s.score), 0)::int as best,
         count(s.id)::int               as plays
  from public.games g
  left join public.scores s on s.game_id = g.id
  group by g.id;

-- RLS
alter table public.games enable row level security;
alter table public.scores enable row level security;

-- games: solo lectura.
create policy "games: lectura pública"
  on public.games for select
  to anon, authenticated
  using (true);

-- scores: lectura pública e inserción acotada. Sin update/delete.
create policy "scores: lectura pública"
  on public.scores for select
  to anon, authenticated
  using (true);

create policy "scores: inserción acotada"
  on public.scores for insert
  to anon, authenticated
  with check (
    char_length(btrim(player_name)) between 1 and 20
    and score between 0 and 10000000
    and (user_id is null or user_id = (select auth.uid()))
  );
