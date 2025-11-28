create table prices (
  user_id uuid references auth.users on delete cascade not null,
  instrument_symbol text not null,
  price numeric not null,
  currency text not null check (currency in ('USD', 'ARS')),
  updated_at timestamp with time zone default now(),
  primary key (user_id, instrument_symbol)
);

alter table prices enable row level security;

create policy "Users can view own prices." on prices
  for select using (auth.uid() = user_id);

create policy "Users can insert/update own prices." on prices
  for insert with check (auth.uid() = user_id)
  on conflict (user_id, instrument_symbol) do update
  set price = excluded.price,
      currency = excluded.currency,
      updated_at = now();

create policy "Users can delete own prices." on prices
  for delete using (auth.uid() = user_id);
