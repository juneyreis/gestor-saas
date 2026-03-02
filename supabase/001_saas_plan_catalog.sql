create table if not exists public.saas_plan_catalog (
  id text primary key,
  name text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  currency text not null default 'BRL',
  billing_cycle_months integer not null default 1 check (billing_cycle_months > 0),
  segment text not null default 'b2c' check (segment in ('b2c', 'b2b')),
  display_order integer not null default 99 check (display_order > 0),
  active boolean not null default true,
  button_text text not null default 'Assinar',
  updated_at timestamptz not null default now()
);

create index if not exists idx_saas_plan_catalog_active
  on public.saas_plan_catalog (active);

create index if not exists idx_saas_plan_catalog_segment_order
  on public.saas_plan_catalog (segment, display_order);

insert into public.saas_plan_catalog (id, name, unit_price, currency, billing_cycle_months, segment, display_order, active, button_text)
values
  ('b2c-card1', 'Trial', 0, 'BRL', 1, 'b2c', 1, true, 'Começar Agora'),
  ('b2c-card2', 'Mensal', 98, 'BRL', 1, 'b2c', 2, true, 'Assinar Pro'),
  ('b2c-card3', 'Trimestral', 270, 'BRL', 3, 'b2c', 3, true, 'Assinar Elite'),
  ('b2b-card1', 'Trial', 0, 'BRL', 1, 'b2b', 1, true, 'Teste Grátis'),
  ('b2b-card2', 'Mensal', 490, 'BRL', 1, 'b2b', 2, true, 'Assinar Mensal'),
  ('b2b-card3', 'Trimestral', 790, 'BRL', 3, 'b2b', 3, true, 'Assinar Trimestral')
on conflict (id) do update
set
  name = excluded.name,
  unit_price = excluded.unit_price,
  currency = excluded.currency,
  billing_cycle_months = excluded.billing_cycle_months,
  segment = excluded.segment,
  display_order = excluded.display_order,
  active = excluded.active,
  button_text = excluded.button_text,
  updated_at = now();
