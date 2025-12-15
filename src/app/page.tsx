'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [data, setData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // We'll try to fetch from the 'ads' table to check if the schema exists.
      const { data, error } = await supabase.from('ads').select('*').limit(1);

      if (error) {
        setError(
          `Error: ${error.message}. It seems the tables don't exist yet. Please go to the Supabase SQL Editor and run the schema setup script below.`
        );
        console.error('Error fetching from Supabase:', error);
      } else {
        setData(data);
      }
    };

    fetchData();
  }, []);

  const schemaSQL = `
-- 1. Create custom types (ENUMs)
create type user_role as enum ('USER', 'ADVERTISER');
create type payment_status as enum ('PENDING', 'COMPLETED', 'FAILED');

-- 2. Create Tables
create table "users" (
  "id" bigint primary key generated always as identity,
  "email" text unique not null,
  "password_hash" text,
  "role" user_role not null default 'USER',
  "username" text unique,
  "avatar_url" text,
  "age_verified" boolean not null default false,
  "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);

create table "categories" (
  "id" bigint primary key generated always as identity,
  "name" text not null unique
);

create table "tags" (
  "id" bigint primary key generated always as identity,
  "name" text not null unique
);

create table "ads" (
  "id" bigint primary key generated always as identity,
  "author_id" bigint not null references "users"(id),
  "category_id" bigint not null references "categories"(id),
  "title" text not null,
  "description" text,
  "location_country" text,
  "location_department" text,
  "location_city" text,
  "active" boolean not null default false,
  "premium_until" timestamp with time zone,
  "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);

create table "ad_tags" (
  "ad_id" bigint not null references "ads"(id) on delete cascade,
  "tag_id" bigint not null references "tags"(id) on delete cascade,
  primary key ("ad_id", "tag_id")
);

create table "ratings" (
  "id" bigint primary key generated always as identity,
  "ad_id" bigint not null references "ads"(id) on delete cascade,
  "rater_user_id" bigint not null references "users"(id),
  "stars" smallint not null check (stars >= 1 and stars <= 5),
  "comment" text,
  "approved" boolean not null default false,
  "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);

create table "payments" (
  "id" bigint primary key generated always as identity,
  "ad_id" bigint not null references "ads"(id),
  "user_id" bigint not null references "users"(id),
  "stripe_session_id" text,
  "status" payment_status not null default 'PENDING',
  "amount" numeric(10, 2),
  "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);

-- 3. Enable RLS for all tables
alter table "users" enable row level security;
alter table "categories" enable row level security;
alter table "tags" enable row level security;
alter table "ads" enable row level security;
alter table "ad_tags" enable row level security;
alter table "ratings" enable row level security;
alter table "payments" enable row level security;

-- 4. Create public read access policies
create policy "Public users are viewable by everyone" on users for select using (true);
create policy "Public categories are viewable by everyone" on categories for select using (true);
create policy "Public tags are viewable by everyone" on tags for select using (true);
create policy "Public ads are viewable by everyone" on ads for select using (true);
create policy "Public ad_tags are viewable by everyone" on ad_tags for select using (true);
create policy "Public ratings are viewable by everyone" on ratings for select using (true);
create policy "Public payments are viewable by everyone" on payments for select using (true);

-- 5. Seed initial data
insert into "categories" (name)
values 
  ('escort'),
  ('servicios_virtuales'),
  ('escort_gay');

insert into "tags" (name)
values
  ('morena'),
  ('alta'),
  ('baja'),
  ('rubia');
`.trim();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="space-y-4 w-full max-w-4xl">
        <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
          Next.js + Supabase
        </h1>
        <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed">
          The app is connected to Supabase. Now, let's set up the database schema.
        </p>

        <div className="w-full rounded-lg border bg-card p-6 text-left shadow-sm">
          <h2 className="text-lg font-semibold">Database Status:</h2>
          
          {error && (
            <div className="mt-4 rounded-md bg-destructive/10 p-4 text-sm text-destructive-foreground">
              <p className="font-semibold">Action Required</p>
              <p className="mb-4">The required tables were not found in your database.</p>
              <p className="mb-2 font-medium">Please set up your database schema:</p>
              <p className="mb-4">Go to your Supabase project's <a href="https://supabase.com/dashboard/project/_/sql" target="_blank" rel="noopener noreferrer" className="font-semibold underline">SQL Editor</a>, paste the entire script below, and click "Run".</p>
              <pre className="mt-2 rounded-md bg-muted p-4 text-xs text-muted-foreground overflow-auto max-h-[400px]">
                {schemaSQL}
              </pre>
            </div>
          )}

          {data && (
             <div className="mt-4 rounded-md bg-green-500/10 p-4 text-sm text-green-700">
               <p className="font-semibold">Success!</p>
               <p>The 'ads' table was found. Your database schema appears to be set up correctly.</p>
            </div>
          )}

          {data === null && !error && <p className="mt-4 text-muted-foreground">Checking database status...</p>}
        </div>
      </div>
    </main>
  );
}
