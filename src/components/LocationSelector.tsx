import { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  getDistrictsForCity,
  getNeighborhoodsForDistrict,
  TURKEY_PROVINCES,
} from '../data/turkeyLocations';

interface LocationSelectorProps {
  city: string;
  district: string;
  neighborhood: string;
  onChange: (next: { city: string; district: string; neighborhood: string }) => void;
  mode: 'filter' | 'form';
  errors?: Record<string, string>;
  idPrefix?: string;
}

export function LocationSelector({
  city,
  district,
  neighborhood,
  onChange,
  mode,
  errors = {},
  idPrefix = 'loc',
}: LocationSelectorProps) {
  const [provinces, setProvinces] = useState<string[]>(TURKEY_PROVINCES);
  const [districts, setDistricts] = useState<string[]>(() =>
    city ? getDistrictsForCity(city) : []
  );
  const [neighborhoods, setNeighborhoods] = useState<string[]>(() =>
    city && district ? getNeighborhoodsForDistrict(city, district) : []
  );
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);

  const [customDistrict, setCustomDistrict] = useState(false);
  const [customNeighborhood, setCustomNeighborhood] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getProvinces()
      .then((res) => {
        if (!cancelled && Array.isArray(res.provinces) && res.provinces.length > 0) {
          setProvinces(res.provinces);
        }
      })
      .catch(() => {
        // Fallback to TURKEY_PROVINCES already initialized
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!city) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    setLoadingDistricts(true);
    api
      .getDistricts(city)
      .then((res) => {
        if (!cancelled) {
          setDistricts(
            Array.isArray(res.districts) && res.districts.length > 0
              ? res.districts
              : getDistrictsForCity(city)
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDistricts(getDistrictsForCity(city));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDistricts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [city]);

  useEffect(() => {
    if (!city || !district) {
      setNeighborhoods([]);
      return;
    }
    let cancelled = false;
    setLoadingNeighborhoods(true);
    api
      .getNeighborhoods(city, district)
      .then((res) => {
        if (!cancelled) {
          setNeighborhoods(
            Array.isArray(res.neighborhoods) && res.neighborhoods.length > 0
              ? res.neighborhoods
              : getNeighborhoodsForDistrict(city, district)
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNeighborhoods(getNeighborhoodsForDistrict(city, district));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingNeighborhoods(false);
      });
    return () => {
      cancelled = true;
    };
  }, [city, district]);

  const handleCityChange = (nextCity: string) => {
    setCustomDistrict(false);
    setCustomNeighborhood(false);
    onChange({ city: nextCity, district: '', neighborhood: '' });
  };

  const handleDistrictChange = (nextDistrict: string) => {
    if (nextDistrict === '__custom__') {
      setCustomDistrict(true);
      onChange({ city, district: '', neighborhood: '' });
      return;
    }
    setCustomDistrict(false);
    setCustomNeighborhood(false);
    onChange({ city, district: nextDistrict, neighborhood: '' });
  };

  const handleNeighborhoodChange = (nextNeighborhood: string) => {
    if (nextNeighborhood === '__custom__') {
      setCustomNeighborhood(true);
      onChange({ city, district, neighborhood: '' });
      return;
    }
    setCustomNeighborhood(false);
    onChange({ city, district, neighborhood: nextNeighborhood });
  };

  const isForm = mode === 'form';
  const showDistrictInput =
    isForm && !loadingDistricts && (customDistrict || (Boolean(city) && districts.length === 0));
  const showNeighborhoodInput =
    isForm &&
    !loadingNeighborhoods &&
    (customNeighborhood || (Boolean(district) && neighborhoods.length === 0));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label
          htmlFor={`${idPrefix}-city`}
          className="block text-xs font-medium text-slate-700 mb-1.5"
        >
          İl {isForm && <span className="text-red-600">*</span>}
        </label>
        <select
          id={`${idPrefix}-city`}
          value={city}
          onChange={(e) => handleCityChange(e.target.value)}
          className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
        >
          <option value="">{isForm ? 'İl seçin' : 'Tüm İller (81 İl)'}</option>
          {provinces.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-district`}
          className="block text-xs font-medium text-slate-700 mb-1.5"
        >
          İlçe {isForm && <span className="text-red-600">*</span>}
        </label>
        {showDistrictInput ? (
          <div className="flex gap-1.5">
            <input
              id={`${idPrefix}-district`}
              type="text"
              value={district}
              onChange={(e) => onChange({ city, district: e.target.value, neighborhood: '' })}
              placeholder="İlçe adını yazın"
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
            />
            {districts.length > 0 && (
              <button
                type="button"
                onClick={() => setCustomDistrict(false)}
                className="px-2.5 h-10 text-xs text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                Liste
              </button>
            )}
          </div>
        ) : (
          <select
            id={`${idPrefix}-district`}
            value={district}
            disabled={!city || loadingDistricts}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
          >
            <option value="">
              {loadingDistricts
                ? 'İlçeler yükleniyor...'
                : isForm
                  ? 'İlçe seçin'
                  : 'Tüm İlçeler'}
            </option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
            {isForm && city && <option value="__custom__">+ Diğer İlçe Gir</option>}
          </select>
        )}
        {errors.district && <p className="mt-1 text-xs text-red-600">{errors.district}</p>}
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-neighborhood`}
          className="block text-xs font-medium text-slate-700 mb-1.5"
        >
          Mahalle {isForm && <span className="text-red-600">*</span>}
        </label>
        {showNeighborhoodInput ||
        (!isForm && district && !loadingNeighborhoods && neighborhoods.length === 0) ? (
          <div className="flex gap-1.5">
            <input
              id={`${idPrefix}-neighborhood`}
              type="text"
              value={neighborhood}
              disabled={!district && !isForm}
              onChange={(e) => onChange({ city, district, neighborhood: e.target.value })}
              placeholder={isForm ? 'Mahalle adını yazın' : 'Mahalle ara'}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
            />
            {isForm && neighborhoods.length > 0 && (
              <button
                type="button"
                onClick={() => setCustomNeighborhood(false)}
                className="px-2.5 h-10 text-xs text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                Liste
              </button>
            )}
          </div>
        ) : (
          <select
            id={`${idPrefix}-neighborhood`}
            value={neighborhood}
            disabled={!district || loadingNeighborhoods}
            onChange={(e) => handleNeighborhoodChange(e.target.value)}
            className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
          >
            <option value="">
              {loadingNeighborhoods
                ? 'Mahalleler yükleniyor...'
                : isForm
                  ? 'Mahalle seçin'
                  : 'Tüm Mahalleler'}
            </option>
            {neighborhoods.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
            {isForm && district && <option value="__custom__">+ Diğer Mahalle Gir</option>}
          </select>
        )}
        {errors.neighborhood && <p className="mt-1 text-xs text-red-600">{errors.neighborhood}</p>}
      </div>
    </div>
  );
}
