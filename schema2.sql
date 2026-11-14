create table if not exists players(
  id serial primary key, name text not null,
  team_id int references teams(id) on delete cascade);
create table if not exists cards(
  id serial primary key, player_id int references players(id) on delete cascade,
  team_id int references teams(id) on delete cascade,
  week int default 0, type text check (type in ('yellow','red')), susp int default 0);
create table if not exists goals(
  id serial primary key, player_id int references players(id) on delete cascade,
  team_id int references teams(id) on delete cascade,
  week int default 0, goals int default 1);

alter table players enable row level security;
alter table cards enable row level security;
alter table goals enable row level security;

do $$ declare t text; begin
 foreach t in array array['players','cards','goals'] loop
  execute format('drop policy if exists "read_%1$s" on %1$s', t);
  execute format('drop policy if exists "write_%1$s" on %1$s', t);
  execute format('create policy "read_%1$s" on %1$s for select using (true)', t);
  execute format('create policy "write_%1$s" on %1$s for all to authenticated using (true) with check (true)', t);
 end loop; end $$;

grant select on players, cards, goals to anon;
grant all on players, cards, goals to authenticated;
grant usage, select on all sequences in schema public to authenticated;
