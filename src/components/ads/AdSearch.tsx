
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useEffect } from 'react';

export default function AdSearch({ initialQuery }: { initialQuery?: string }) {
  const searchParams = new URLSearchParams(useSearchParams());
  const router = useRouter();
  const pathname = usePathname();

  const handleSearch = useDebouncedCallback((term: string) => {
    if (term) {
      searchParams.set('q', term);
    } else {
      searchParams.delete('q');
    }
    router.replace(`${pathname}?${searchParams.toString()}`, { scroll: false });
  }, 300);

  // When initialQuery is provided by the server, use it as the default value.
  // Otherwise, use the value from URL search params.
  const defaultValue = initialQuery ?? searchParams.get('q')?.toString() ?? '';

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        key={defaultValue} // Use key to force re-render when defaultValue changes
        type="search"
        placeholder="¿Qué estás buscando? (ej: prepagos cali)"
        className="pl-10"
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={defaultValue}
      />
    </div>
  );
}
