-- Create a table for public profiles
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  full_name text,
  avatar_url text,
  website text,
  default_fx_source text default 'MEP'
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Create a table for trades
create table trades (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  instrument_symbol text not null, -- e.g. AAPL, BTC, AL30
  instrument_type text not null, -- e.g. STOCK, CRYPTO, BOND, CEDEAR
  side text not null check (side in ('BUY', 'SELL')),
  quantity numeric not null,
  amount_ars numeric not null,
  fx_source text not null, -- MEP, CCL, BLUE, OFFICIAL, MANUAL
  fx_rate numeric not null,
  amount_usd numeric not null, -- Calculated field stored for immutability
  trade_date timestamp with time zone not null default now(),
  created_at timestamp with time zone default now()
);

-- Set up RLS for trades
alter table trades enable row level security;

create policy "Users can view own trades." on trades
  for select using (auth.uid() = user_id);

create policy "Users can insert own trades." on trades
  for insert with check (auth.uid() = user_id);

create policy "Users can update own trades." on trades
  for update using (auth.uid() = user_id);

create policy "Users can delete own trades." on trades
  for delete using (auth.uid() = user_id);

-- Create a function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
