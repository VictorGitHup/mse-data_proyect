
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Category, Location } from '@/lib/types';
import AdSearch from './AdSearch';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Filter } from 'lucide-react';

interface AdFiltersProps {
  initialCategories: Category[];
  initialCountries: Location[];
  initialFilterState?: {
    q?: string;
    category?: string;
    country?: string;
    region?: string;
    subregion?: string;
  }
  showSearch?: boolean; // New prop
}

export default function AdFilters({ initialCategories, initialCountries, initialFilterState, showSearch = true }: AdFiltersProps) {
  const supabase = createSupabaseBrowserClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [regions, setRegions] = useState<Location[]>([]);
  const [subregions, setSubregions] = useState<Location[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Use initialFilterState from server or fallback to searchParams
  const selectedCategory = initialFilterState?.category || searchParams.get('category') || '';
  const selectedCountry = initialFilterState?.country || searchParams.get('country') || '';
  const selectedRegion = initialFilterState?.region || searchParams.get('region') || '';
  const selectedSubregion = initialFilterState?.subregion || searchParams.get('subregion') || '';

  const updateSearchParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
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
    // Close sheet on mobile after applying filter
    if (window.innerWidth < 768) {
        setIsSheetOpen(false);
    }
  };
  
  const resetFilters = () => {
    // Preserve other search params that are not part of the filters
    const params = new URLSearchParams(searchParams);
    params.delete('q');
    params.delete('category');
    params.delete('country');
    params.delete('region');
    params.delete('subregion');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
     if (window.innerWidth < 768) {
        setIsSheetOpen(false);
    }
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

  const filterContent = (
    <div className="space-y-4">
        {showSearch && <AdSearch initialQuery={initialFilterState?.q} />}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={(value) => updateSearchParam('category', value)}>
            <SelectTrigger>
                <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
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
                <SelectItem value="all">Todos los países</SelectItem>
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
                <SelectItem value="all">Todas las regiones</SelectItem>
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
                <SelectItem value="all">Todas las ciudades</SelectItem>
                {subregions.map(subregion => (
                <SelectItem key={subregion.id} value={String(subregion.id)}>{subregion.name}</SelectItem>
                ))}
            </SelectContent>
            </Select>
        </div>
        {hasActiveFilters && (
            <Button variant="ghost" onClick={resetFilters} className="text-sm text-muted-foreground w-full sm:w-auto">
                Limpiar filtros
            </Button>
        )}
    </div>
  );

  return (
    <div className="mb-8">
        {/* Mobile: Button triggers Sheet */}
        <div className="md:hidden sticky top-[65px] bg-background/95 z-10 py-2 backdrop-blur-sm">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                    <Button variant="outline" className="w-full justify-center">
                        <Filter className="mr-2 h-4 w-4" />
                        Filtros
                    </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-lg">
                    <SheetHeader className="mb-4">
                        <SheetTitle className="text-center">Filtros</SheetTitle>
                    </SheetHeader>
                    {filterContent}
                </SheetContent>
            </Sheet>
        </div>

        {/* Desktop: Filters visible */}
        <div className="hidden md:block p-4 border rounded-lg bg-card">
            {filterContent}
        </div>
    </div>
  );
}
