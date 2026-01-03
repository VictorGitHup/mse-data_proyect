
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function DashboardToolbar() {
  const searchParams = useSearchParams();
  const { replace } = useRouter();
  const pathname = usePathname();

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set('q', term);
    } else {
      params.delete('q');
    }
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams);
    if (status && status !== 'all') {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
      <Input
        placeholder="Buscar por título..."
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get('q')?.toString()}
        className="flex-grow"
      />
      <Select
        onValueChange={handleStatusChange}
        defaultValue={searchParams.get('status')?.toString() || 'all'}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filtrar por estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          <SelectItem value="active">Activo</SelectItem>
          <SelectItem value="inactive">Inactivo</SelectItem>
          <SelectItem value="draft">Borrador</SelectItem>
          <SelectItem value="expired">Expirado</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
