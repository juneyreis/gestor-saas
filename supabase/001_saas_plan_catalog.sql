create table if not exists public.saas_plan_catalog (
  id text primary key,
  name text not null,
  unit_price numeric(12,2) not null check (unit_price > 0),
  currency text not null default 'BRL',
  active boolean not null default true,
  button_text text not null default 'Assinar',
  updated_at timestamptz not null default now()
);

create index if not exists idx_saas_plan_catalog_active
  on public.saas_plan_catalog (active);

insert into public.saas_plan_catalog (id, name, unit_price, currency, active, button_text)
values
  ('b2c-hunter', 'Hunter Pro', 49, 'BRL', true, 'Assinar Pro'),
  ('b2c-elite', 'Elite', 99, 'BRL', true, 'Assinar Elite'),
  ('b2b-squad', 'Trial', 490, 'BRL', true, 'Teste Grátis'),
  ('b2b-field', 'Field Ops', 1200, 'BRL', true, 'Falar com Vendas')
on conflict (id) do update
set
  name = excluded.name,
  unit_price = excluded.unit_price,
  currency = excluded.currency,
  active = excluded.active,
  button_text = excluded.button_text,
  updated_at = now();
