'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [data, setData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // NOTE: Replace 'your_table_name' with the actual name of your table in Supabase.
      // You also need to make sure you have enabled Row Level Security (RLS)
      // and created a policy that allows read access.
      const { data, error } = await supabase.from('your_table_name').select('*');

      if (error) {
        setError(
          `Error fetching data: ${error.message}. Make sure the table exists and RLS policies are set.`
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
          Next Starter with Supabase
        </h1>
        <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed">
          This page demonstrates a client-side fetch from a Supabase table.
        </p>

        <div className="w-full max-w-2xl rounded-lg border bg-card p-6 text-left shadow-sm">
          <h2 className="text-lg font-semibold">Data from Supabase:</h2>
          {error && <pre className="mt-4 rounded-md bg-destructive/20 p-4 text-sm text-destructive-foreground">{error}</pre>}
          {data === null && !error && <p className="mt-4 text-muted-foreground">Loading...</p>}
          {data && data.length === 0 && (
            <p className="mt-4 text-muted-foreground">No data found in the table.</p>
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
