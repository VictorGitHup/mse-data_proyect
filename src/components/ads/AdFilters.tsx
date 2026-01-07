
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Category, Location } from '@/lib/types';
import AdSearch from './AdSearch';
import { Button } from '../ui/button';

interface AdFiltersProps {
  initialCategories: Category[];
  initialCountries: Location[];
}

export default function AdFilters({ initialCategories, initialCountries }: AdFiltersProps) {
  const supabase = createSupabaseBrowserClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [regions, setRegions] = useState<Location[]>([]);
  const [subregions, setSubregions] = useState<Location[]>([]);

  const selectedCategory = searchParams.get('category') || '';
  const selectedCountry = searchParams.get('country') || '';
  const selectedRegion = searchParams.get('region') || '';
  const selectedSubregion = searchParams.get('subregion') || '';

  const updateSearchParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    // Reset dependent filters
    if (key === 'country') {
      params.delete('region');
      params.delete('subregion');
    } else if (key === 'region') {
      params.delete('subregion');
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  
  const resetFilters = () => {
    router.replace(pathname, { scroll: false });
  }

  useEffect(() => {
    const fetchRegions = async () => {
      if (selectedCountry) {
        const { data } = await supabase
          .from('locations')
          .select('id, name')
          .eq('type', 'region')
          .eq('parent_id', selectedCountry)
          .order('name');
        setRegions(data || []);
      } else {
        setRegions([]);
      }
    };
    fetchRegions();
  }, [selectedCountry, supabase]);

  useEffect(() => {
    const fetchSubregions = async () => {
      if (selectedRegion) {
        const { data } = await supabase
          .from('locations')
          .select('id, name')
          .eq('type', 'subregion')
          .eq('parent_id', selectedRegion)
          .order('name');
        setSubregions(data || []);
      } else {
        setSubregions([]);
      }
    };
    fetchSubregions();
  }, [selectedRegion, supabase]);

  const hasActiveFilters = !!(searchParams.get('q') || selectedCategory || selectedCountry || selectedRegion || selectedSubregion);

  return (
    <div className="p-4 border rounded-lg bg-card space-y-4">
      <AdSearch />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Category Filter */}
        <Select value={selectedCategory} onValueChange={(value) => updateSearchParam('category', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas las categorías</SelectItem>
            {initialCategories?.map(cat => (
              <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Country Filter */}
        <Select value={selectedCountry} onValueChange={(value) => updateSearchParam('country', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Todos los países" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos los países</SelectItem>
            {initialCountries?.map(country => (
              <SelectItem key={country.id} value={String(country.id)}>{country.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Region Filter */}
        <Select
          value={selectedRegion}
          onValueChange={(value) => updateSearchParam('region', value)}
          disabled={!selectedCountry || regions.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todas las regiones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas las regiones</SelectItem>
            {regions.map(region => (
              <SelectItem key={region.id} value={String(region.id)}>{region.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Subregion Filter */}
        <Select
          value={selectedSubregion}
          onValueChange={(value) => updateSearchParam('subregion', value)}
          disabled={!selectedRegion || subregions.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todas las ciudades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas las ciudades</SelectItem>
            {subregions.map(subregion => (
              <SelectItem key={subregion.id} value={String(subregion.id)}>{subregion.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hasActiveFilters && (
         <Button variant="ghost" onClick={resetFilters} className="text-sm text-muted-foreground">
            Limpiar filtros
         </Button>
      )}
    </div>
  );
}
