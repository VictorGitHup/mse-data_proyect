'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [data, setData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // We'll try to fetch from a 'tasks' table as an example.
      const { data, error } = await supabase.from('tasks').select('*');

      if (error) {
        setError(
          `Error: ${error.message}. It seems the 'tasks' table doesn't exist yet. Please go to the Supabase SQL Editor and create it. You can use the SQL snippet provided below.`
        );
        console.error('Error fetching from Supabase:', error);
      } else {
        setData(data);
      }
    };

    fetchData();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="space-y-4">
        <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
          Next.js Starter with Supabase
        </h1>
        <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed">
          This page demonstrates a client-side fetch from a Supabase table.
        </p>

        <div className="w-full max-w-3xl rounded-lg border bg-card p-6 text-left shadow-sm">
          <h2 className="text-lg font-semibold">Data from 'tasks' table:</h2>
          
          {error && (
            <div className="mt-4 rounded-md bg-destructive/10 p-4 text-sm text-destructive-foreground">
              <p className="font-semibold">Action Required</p>
              <p className="mb-4">{error}</p>
              <p className="mb-2 font-medium">1. Create the table:</p>
              <p className="mb-4">Go to your Supabase project's <a href="https://supabase.com/dashboard/project/_/sql" target="_blank" rel="noopener noreferrer" className="font-semibold underline">SQL Editor</a> and run this snippet to create a sample 'tasks' table:</p>
              <pre className="mt-2 rounded-md bg-muted p-4 text-xs text-muted-foreground overflow-auto">
                {`create table tasks (
  id bigint primary key generated always as identity,
  title text,
  is_completed boolean default false,
  inserted_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert some sample data
insert into tasks (title)
values 
  ('Install Supabase client'),
  ('Create a sample table'),
  ('Enable Row Level Security');`}
              </pre>
              <p className="mt-4 mb-2 font-medium">2. Enable Read Access:</p>
              <p className="mb-4">Then, run this snippet to create a policy that allows everyone to read from the table:</p>
               <pre className="mt-2 rounded-md bg-muted p-4 text-xs text-muted-foreground overflow-auto">
                {`-- Enable RLS
alter table tasks enable row level security;

-- Create a policy to allow public read access
create policy "Public tasks are viewable by everyone"
  on tasks for select
  using ( true );`}
              </pre>
            </div>
          )}

          {data === null && !error && <p className="mt-4 text-muted-foreground">Loading...</p>}
          
          {data && data.length === 0 && (
            <p className="mt-4 text-muted-foreground">No data found in the 'tasks' table. You can add some via the Supabase dashboard.</p>
          )}

          {data && data.length > 0 && (
            <pre className="mt-4 max-h-96 overflow-auto rounded-md bg-muted p-4 text-sm text-muted-foreground">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </main>
  );
}
