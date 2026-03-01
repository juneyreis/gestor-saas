alter table public.saas_plan_catalog
  drop constraint if exists saas_plan_catalog_unit_price_check;

alter table public.saas_plan_catalog
  add constraint saas_plan_catalog_unit_price_check
  check (unit_price >= 0);

alter table public.saas_plan_catalog
  add column if not exists segment text;

alter table public.saas_plan_catalog
  add column if not exists display_order integer;

update public.saas_plan_catalog
set
  segment = case
    when id like 'b2b-%' then 'b2b'
    else 'b2c'
  end,
  display_order = case
    when id = 'b2c-card1' then 1
    when id = 'b2c-card2' then 2
    when id = 'b2c-card3' then 3
    when id = 'b2b-card1' then 1
    when id = 'b2b-card2' then 2
    else coalesce(display_order, 99)
  end
where segment is null or display_order is null;

alter table public.saas_plan_catalog
  alter column segment set default 'b2c';

alter table public.saas_plan_catalog
  alter column display_order set default 99;

update public.saas_plan_catalog set segment = 'b2c' where segment is null;
update public.saas_plan_catalog set display_order = 99 where display_order is null;

alter table public.saas_plan_catalog
  alter column segment set not null;

alter table public.saas_plan_catalog
  alter column display_order set not null;

alter table public.saas_plan_catalog
  drop constraint if exists saas_plan_catalog_segment_check;

alter table public.saas_plan_catalog
  add constraint saas_plan_catalog_segment_check
  check (segment in ('b2c', 'b2b'));

alter table public.saas_plan_catalog
  drop constraint if exists saas_plan_catalog_display_order_check;

alter table public.saas_plan_catalog
  add constraint saas_plan_catalog_display_order_check
  check (display_order > 0);

create index if not exists idx_saas_plan_catalog_segment_order
  on public.saas_plan_catalog (segment, display_order);

insert into public.saas_plan_catalog (id, name, unit_price, currency, segment, display_order, active, button_text)
values
  ('b2c-card1', 'Trial', 0, 'BRL', 'b2c', 1, true, 'Começar Agora'),
  ('b2c-card2', 'Hunter Pro', 49, 'BRL', 'b2c', 2, true, 'Assinar Pro'),
  ('b2c-card3', 'Elite', 99, 'BRL', 'b2c', 3, true, 'Assinar Elite'),
  ('b2b-card1', 'Trial', 490, 'BRL', 'b2b', 1, true, 'Teste Grátis'),
  ('b2b-card2', 'Field Ops', 1200, 'BRL', 'b2b', 2, true, 'Falar com Vendas')
on conflict (id) do update
set
  name = excluded.name,
  unit_price = excluded.unit_price,
  currency = excluded.currency,
  segment = excluded.segment,
  display_order = excluded.display_order,
  active = excluded.active,
  button_text = excluded.button_text,
  updated_at = now();
