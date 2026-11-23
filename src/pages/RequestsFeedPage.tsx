import { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  LayoutGrid,
  List,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../api/client';
import { LocationSelector } from '../components/LocationSelector';
import { RequestCard, RequestListRow } from '../components/RequestCard';
import { RequestDetailModal } from '../components/RequestDetailModal';
import { getNeighborhoodsForDistrict } from '../data/turkeyLocations';
import type { AgentUser, BuyerRequest, RequestFilters, RequestSortOption } from '../types';
import {
  computeLocationFacetCounts,
  filterBuyerRequests,
  normalizeTurkishSearch,
  PROPERTY_TYPES,
  ROOM_COUNTS,
} from '../utils/domain';

interface RequestsFeedPageProps {
  user: AgentUser;
  onNavigate: (path: string) => void;
}

const INITIAL_FILTERS: RequestFilters = {
  city: '',
  district: '',
  neighborhood: '',
  neighborhoods: [],
  transaction_type: '',
  property_type: '',
  room_count: '',
  min_budget: '',
  max_budget: '',
  credit_only: false,
  sort_by: 'newest',
  q: '',
};

interface SavedRegionPref {
  city: string;
  district: string;
  neighborhoods: string[];
}

export function RequestsFeedPage({ user, onNavigate }: RequestsFeedPageProps) {
  const storageKey = `alicisepeti_region_pref_${user.id}`;
  const viewKey = `alicisepeti_view_mode_${user.id}`;

  const [savedRegion, setSavedRegion] = useState<SavedRegionPref | null>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as SavedRegionPref) : null;
    } catch {
      return null;
    }
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      const v = window.localStorage.getItem(viewKey);
      return v === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });

  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<RequestFilters>(() => {
    if (savedRegion && savedRegion.city) {
      return {
        ...INITIAL_FILTERS,
        city: savedRegion.city,
        district: savedRegion.district || '',
        neighborhoods: savedRegion.neighborhoods || [],
      };
    }
    return INITIAL_FILTERS;
  });
  const [apiNeighborhoods, setApiNeighborhoods] = useState<string[]>([]);
  const [neighborhoodSearch, setNeighborhoodSearch] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getRequests({ status: 'active' });
      setRequests(res.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Alıcı talepleri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    if (!filters.city || !filters.district) {
      setApiNeighborhoods([]);
      return;
    }
    let cancelled = false;
    api
      .getNeighborhoods(filters.city, filters.district)
      .then((res) => {
        if (!cancelled) {
          setApiNeighborhoods(
            res.neighborhoods?.length > 0
              ? res.neighborhoods
              : getNeighborhoodsForDistrict(filters.city, filters.district)
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApiNeighborhoods(getNeighborhoodsForDistrict(filters.city, filters.district));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filters.city, filters.district]);

  const locationFacets = useMemo(
    () => computeLocationFacetCounts(requests, filters.city, filters.district),
    [requests, filters.city, filters.district]
  );

  const districtNeighborhoodOptions = useMemo(() => {
    if (!filters.city || !filters.district) return [];
    const baseList =
      apiNeighborhoods.length > 0
        ? apiNeighborhoods
        : getNeighborhoodsForDistrict(filters.city, filters.district);
    const countsMap = new Map<string, number>();
    for (const n of baseList) {
      countsMap.set(n, 0);
    }
    for (const f of locationFacets.neighborhoods) {
      countsMap.set(f.name, f.count);
    }
    const qNorm = normalizeTurkishSearch(neighborhoodSearch);
    return Array.from(countsMap.entries())
      .map(([name, count]) => ({ name, count }))
      .filter((item) => !qNorm || normalizeTurkishSearch(item.name).includes(qNorm))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'tr-TR'));
  }, [filters.city, filters.district, apiNeighborhoods, locationFacets.neighborhoods, neighborhoodSearch]);

  const filteredRequests = useMemo(
    () => filterBuyerRequests(requests, filters, user.id),
    [requests, filters, user.id]
  );

  const saleCount = useMemo(
    () => requests.filter((r) => r.transaction_type === 'Satılık').length,
    [requests]
  );
  const rentCount = useMemo(
    () => requests.filter((r) => r.transaction_type === 'Kiralık').length,
    [requests]
  );

  const isOwnRegionActive =
    Boolean(user.city) &&
    filters.city === user.city &&
    (user.district ? filters.district === user.district : true) &&
    !filters.neighborhood &&
    (filters.neighborhoods?.length || 0) === 0;

  const isCurrentRegionSaved =
    Boolean(savedRegion) &&
    savedRegion?.city === filters.city &&
    savedRegion?.district === filters.district &&
    JSON.stringify(savedRegion?.neighborhoods || []) ===
      JSON.stringify(filters.neighborhoods || []);

  const secondaryFilterCount =
    (filters.property_type ? 1 : 0) +
    (filters.room_count ? 1 : 0) +
    (filters.min_budget ? 1 : 0) +
    (filters.max_budget ? 1 : 0) +
    (filters.credit_only ? 1 : 0);

  const hasActiveFilters =
    Boolean(filters.city) ||
    Boolean(filters.district) ||
    Boolean(filters.neighborhood) ||
    (filters.neighborhoods?.length || 0) > 0 ||
    Boolean(filters.transaction_type) ||
    secondaryFilterCount > 0 ||
    Boolean(filters.q);

  const handleViewChange = (nextMode: 'grid' | 'list') => {
    setViewMode(nextMode);
    try {
      window.localStorage.setItem(viewKey, nextMode);
    } catch {
      // ignore storage error
    }
  };

  const handleToggleMyRegion = () => {
    if (!user.city) return;
    setNeighborhoodSearch('');
    if (isOwnRegionActive) {
      setFilters((prev) => ({
        ...prev,
        city: '',
        district: '',
        neighborhood: '',
        neighborhoods: [],
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        city: user.city,
        district: user.district || '',
        neighborhood: '',
        neighborhoods: [],
      }));
    }
  };

  const handleSaveRegionPref = () => {
    if (!filters.city) return;
    if (isCurrentRegionSaved) {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // ignore storage error
      }
      setSavedRegion(null);
      return;
    }
    const nextPref: SavedRegionPref = {
      city: filters.city,
      district: filters.district,
      neighborhoods: filters.neighborhoods || [],
    };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextPref));
    } catch {
      // ignore storage error
    }
    setSavedRegion(nextPref);
  };

  const handleCitySelect = (city: string) => {
    setNeighborhoodSearch('');
    setFilters((prev) => ({
      ...prev,
      city,
      district: '',
      neighborhood: '',
      neighborhoods: [],
    }));
  };

  const handleDistrictSelect = (district: string) => {
    setNeighborhoodSearch('');
    setFilters((prev) => ({
      ...prev,
      district,
      neighborhood: '',
      neighborhoods: [],
    }));
  };

  const handleToggleNeighborhood = (name: string) => {
    setFilters((prev) => {
      const current = prev.neighborhoods || [];
      const exists = current.includes(name);
      const next = exists ? current.filter((n) => n !== name) : [...current, name];
      return {
        ...prev,
        neighborhood: next.length === 1 ? next[0] : '',
        neighborhoods: next,
      };
    });
  };

  const handleClearFilters = () => {
    setNeighborhoodSearch('');
    setFilters(INITIAL_FILTERS);
  };

  return (
    <div className="space-y-6">
      {/* Colorful Architectural Summary Header */}
      <section className="bg-gradient-to-r from-slate-900 via-blue-950 to-blue-900 text-white rounded-xl p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <p className="text-xs font-medium text-sky-300 mb-1">
              AlıcıSepeti · Türkiye Geneli MYK Onaylı Ağ
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
              Canlı Alıcı Talepleri Havuzu
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              İl, ilçe ve mahalle filtreleriyle portföyünüze uygun gerçek alıcıları liste veya kart
              olarak inceleyin.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0">
            <div className="bg-white/10 border border-white/15 rounded-lg px-3.5 py-2.5">
              <p className="font-mono text-lg sm:text-xl font-bold tabular-nums text-white">
                {requests.length}
              </p>
              <p className="text-[11px] text-slate-300">Toplam Aktif</p>
            </div>
            <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg px-3.5 py-2.5">
              <p className="font-mono text-lg sm:text-xl font-bold tabular-nums text-sky-200">
                {saleCount}
              </p>
              <p className="text-[11px] text-sky-200/90">Satılık Talep</p>
            </div>
            <div className="bg-teal-500/20 border border-teal-400/30 rounded-lg px-3.5 py-2.5">
              <p className="font-mono text-lg sm:text-xl font-bold tabular-nums text-teal-200">
                {rentCount}
              </p>
              <p className="text-[11px] text-teal-200/90">Kiralık Talep</p>
            </div>
          </div>
        </div>
      </section>

      {/* Simplified Filter & View Bar */}
      <section
        aria-label="Alıcı talebi filtreleri ve görünüm seçimi"
        className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
      >
        {/* Top Row: Transaction Switcher, Region Shortcut, View Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['', 'Satılık', 'Kiralık'] as const).map((tx) => {
                const isActive = filters.transaction_type === tx;
                const activeClass =
                  tx === 'Satılık'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : tx === 'Kiralık'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-slate-900 text-white shadow-xs';
                return (
                  <button
                    key={tx || 'all'}
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, transaction_type: tx }))}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      isActive ? activeClass : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tx || 'Tümü'}
                  </button>
                );
              })}
            </div>

            {user.city && (
              <button
                type="button"
                onClick={handleToggleMyRegion}
                aria-pressed={isOwnRegionActive}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  isOwnRegionActive
                    ? 'bg-blue-700 border-blue-700 text-white'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  Bölgem: {user.city}
                  {user.district ? ` / ${user.district}` : ''}
                </span>
              </button>
            )}

            {filters.city && (
              <button
                type="button"
                onClick={handleSaveRegionPref}
                aria-pressed={isCurrentRegionSaved}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  isCurrentRegionSaved
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isCurrentRegionSaved ? (
                  <BookmarkCheck className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{isCurrentRegionSaved ? 'Bölge Kayıtlı' : 'Bölgeyi Kaydet'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Temizle</span>
              </button>
            )}

            <div
              role="group"
              aria-label="Görünüm şekli"
              className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
            >
              <button
                type="button"
                data-testid="view-toggle-grid"
                onClick={() => handleViewChange('grid')}
                aria-pressed={viewMode === 'grid'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Kart</span>
              </button>
              <button
                type="button"
                data-testid="view-toggle-list"
                onClick={() => handleViewChange('list')}
                aria-pressed={viewMode === 'list'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Liste</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search + Cascading 81-Province / 973-District / Neighborhoods Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-4 relative">
            <label htmlFor="feed-search" className="block text-xs font-medium text-slate-700 mb-1.5">
              Hızlı Arama
            </label>
            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="feed-search"
                type="text"
                value={filters.q}
                onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                placeholder="Mahalle, alıcı notu veya danışman ara..."
                className="w-full h-10 pl-9 pr-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              />
            </div>
          </div>

          <div className="lg:col-span-8">
            <LocationSelector
              mode="filter"
              idPrefix="feed"
              city={filters.city}
              district={filters.district}
              neighborhood={filters.neighborhood}
              onChange={({ city, district, neighborhood }) => {
                setNeighborhoodSearch('');
                setFilters((prev) => ({
                  ...prev,
                  city,
                  district,
                  neighborhood,
                  neighborhoods: neighborhood ? [neighborhood] : [],
                }));
              }}
            />
          </div>
        </div>

        {/* Fast Active Cities & Districts Strip */}
        {locationFacets.cities.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 mr-1">Aktif İller:</span>
              <button
                type="button"
                onClick={() => handleCitySelect('')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                  !filters.city
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                Tümü ({requests.length})
              </button>
              {locationFacets.cities.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleCitySelect(filters.city === c.name ? '' : c.name)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                    filters.city === c.name
                      ? 'bg-blue-700 border-blue-700 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {c.name} ({c.count})
                </button>
              ))}
            </div>

            {filters.city && locationFacets.districts.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-medium text-slate-500 mr-1">
                  {filters.city} İlçeleri:
                </span>
                <button
                  type="button"
                  onClick={() => handleDistrictSelect('')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                    !filters.district
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  Tüm İlçeler
                </button>
                {locationFacets.districts.map((d) => (
                  <button
                    key={d.name}
                    type="button"
                    onClick={() => handleDistrictSelect(filters.district === d.name ? '' : d.name)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                      filters.district === d.name
                        ? 'bg-blue-700 border-blue-700 text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {d.name} ({d.count})
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Multi-Select Neighborhood Territory Panel when District is Selected */}
        {filters.city && filters.district && districtNeighborhoodOptions.length > 0 && (
          <div className="border border-blue-200/80 rounded-lg p-3.5 bg-blue-50/40 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800">
                  {filters.district} Mahalleleri ({districtNeighborhoodOptions.length})
                </span>
                {(filters.neighborhoods?.length || 0) > 0 && (
                  <span className="text-xs text-blue-700 font-medium tabular-nums">
                    {filters.neighborhoods?.length} seçili
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  aria-label="Mahalle listesinde ara"
                  value={neighborhoodSearch}
                  onChange={(e) => setNeighborhoodSearch(e.target.value)}
                  placeholder="Mahalle filtrele..."
                  className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 w-40"
                />
                {(filters.neighborhoods?.length || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, neighborhood: '', neighborhoods: [] }))
                    }
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
                  >
                    Seçimi Temizle
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {districtNeighborhoodOptions.map((item) => {
                const isSelected = (filters.neighborhoods || []).includes(item.name);
                return (
                  <button
                    key={item.name}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleToggleNeighborhood(item.name)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                      isSelected
                        ? 'bg-blue-700 border-blue-700 text-white'
                        : item.count > 0
                          ? 'bg-white border-slate-300 text-slate-900 hover:border-blue-700'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {item.name} {item.count > 0 ? `(${item.count})` : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Secondary Filters Toggle + Sort + Result Count */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
              aria-expanded={showAdvancedFilters}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                showAdvancedFilters || secondaryFilterCount > 0
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                Detaylı Filtreler
                {secondaryFilterCount > 0 ? ` (${secondaryFilterCount})` : ''}
              </span>
            </button>

            <span className="text-xs font-medium text-slate-600 tabular-nums">
              {filteredRequests.length} talep bulundu
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="feed-sort" className="text-xs text-slate-500 whitespace-nowrap">
              Sıralama:
            </label>
            <select
              id="feed-sort"
              value={filters.sort_by || 'newest'}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  sort_by: e.target.value as RequestSortOption,
                }))
              }
              className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
            >
              <option value="newest">En Yeni Talepler</option>
              <option value="budget_desc">Bütçe: Yüksekten Düşüğe</option>
              <option value="budget_asc">Bütçe: Düşükten Yükseğe</option>
            </select>
          </div>
        </div>

        {/* Collapsible Secondary Filters */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label
                htmlFor="feed-property-type"
                className="block text-xs font-medium text-slate-600 mb-1"
              >
                Emlak Tipi
              </label>
              <select
                id="feed-property-type"
                value={filters.property_type}
                onChange={(e) => setFilters((prev) => ({ ...prev, property_type: e.target.value }))}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              >
                <option value="">Tüm Emlak Tipleri</option>
                {PROPERTY_TYPES.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="feed-room-count"
                className="block text-xs font-medium text-slate-600 mb-1"
              >
                Oda Sayısı
              </label>
              <select
                id="feed-room-count"
                value={filters.room_count}
                onChange={(e) => setFilters((prev) => ({ ...prev, room_count: e.target.value }))}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              >
                <option value="">Tüm Oda Sayıları</option>
                {ROOM_COUNTS.map((rc) => (
                  <option key={rc} value={rc}>
                    {rc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="feed-min-budget"
                className="block text-xs font-medium text-slate-600 mb-1"
              >
                Min Bütçe (₺)
              </label>
              <input
                id="feed-min-budget"
                type="number"
                min={0}
                value={filters.min_budget}
                onChange={(e) => setFilters((prev) => ({ ...prev, min_budget: e.target.value }))}
                placeholder="Örn: 5000000"
                className="w-full h-10 px-3 font-mono text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor="feed-max-budget-limit"
                className="block text-xs font-medium text-slate-600 mb-1"
              >
                Max Bütçe (₺)
              </label>
              <input
                id="feed-max-budget-limit"
                type="number"
                min={0}
                value={filters.max_budget}
                onChange={(e) => setFilters((prev) => ({ ...prev, max_budget: e.target.value }))}
                placeholder="Örn: 15000000"
                className="w-full h-10 px-3 font-mono text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 tabular-nums"
              />
            </div>

            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(filters.credit_only)}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, credit_only: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
                />
                <span>Yalnızca krediye uygun</span>
              </label>
            </div>
          </div>
        )}
      </section>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-xl p-5 h-56 animate-pulse space-y-3"
            >
              <div className="h-4 bg-slate-100 rounded w-1/3" />
              <div className="h-6 bg-slate-100 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-16 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <h2 className="font-display text-lg font-semibold text-slate-900 mb-1">
            Seçili filtrelere uygun alıcı talebi bulunamadı
          </h2>
          <p className="text-sm text-slate-600 mb-5">
            Farklı bir ilçe/mahalle seçebilir veya kendi müşteriniz için yeni bir alıcı talebi
            oluşturabilirsiniz.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Tüm Talepleri Göster
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('/panel/yeni-talep')}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
            >
              Yeni Alıcı Talebi Oluştur
            </button>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <div
          data-testid="requests-list"
          className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden"
        >
          {filteredRequests.map((req) => (
            <RequestListRow
              key={req.id}
              request={req}
              isOwn={req.agent_id === user.id}
              onSelect={(r) => setSelectedRequestId(r.id)}
            />
          ))}
        </div>
      ) : (
        <div data-testid="requests-grid" className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredRequests.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              isOwn={req.agent_id === user.id}
              onSelect={(r) => setSelectedRequestId(r.id)}
            />
          ))}
        </div>
      )}

      <RequestDetailModal
        requestId={selectedRequestId}
        currentUser={user}
        onClose={() => setSelectedRequestId(null)}
        onUpdated={loadRequests}
      />
    </div>
  );
}
