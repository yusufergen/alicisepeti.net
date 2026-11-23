import { useState } from 'react';
import { api } from '../api/client';
import { LocationSelector } from '../components/LocationSelector';
import type { AgentUser, BuyerRequest } from '../types';
import {
  BUILDING_AGE_OPTIONS,
  FEATURE_OPTIONS,
  FLOOR_PREF_OPTIONS,
  formatCurrencyTRY,
  PROPERTY_TYPES,
  ROOM_COUNTS,
  TRANSACTION_TYPES,
  validateBuyerRequestInput,
} from '../utils/domain';

interface CreateRequestPageProps {
  user: AgentUser;
  onCreated: (created: BuyerRequest) => void;
  onCancel: () => void;
}

export function CreateRequestPage({ user, onCreated, onCancel }: CreateRequestPageProps) {
  const [title, setTitle] = useState('');
  const [transactionType, setTransactionType] = useState<string>('Satılık');
  const [propertyType, setPropertyType] = useState<string>('Daire');
  const [city, setCity] = useState(user.city || 'İstanbul');
  const [district, setDistrict] = useState(user.district || '');
  const [neighborhood, setNeighborhood] = useState('');
  const [budgetMin, setBudgetMin] = useState('10000000');
  const [budgetMax, setBudgetMax] = useState('14000000');
  const [roomCount, setRoomCount] = useState('3+1');
  const [minSqm, setMinSqm] = useState('120');
  const [buildingAge, setBuildingAge] = useState('Fark Etmez');
  const [floorPref, setFloorPref] = useState('Fark Etmez');
  const [creditSuitable, setCreditSuitable] = useState(true);
  const [features, setFeatures] = useState<string[]>(['Asansör', 'Kapalı Otopark']);
  const [buyerNote, setBuyerNote] = useState('');
  const [contactPhone, setContactPhone] = useState(user.phone);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleFeature = (feat: string) => {
    setFeatures((prev) =>
      prev.includes(feat) ? prev.filter((item) => item !== feat) : [...prev, feat]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    const payload = {
      title:
        title.trim() ||
        `${district} ${neighborhood} ${transactionType} ${roomCount} ${propertyType}`.trim(),
      transaction_type: transactionType,
      property_type: propertyType,
      city,
      district,
      neighborhood,
      budget_min: Number(budgetMin) || 0,
      budget_max: Number(budgetMax) || 0,
      room_count: roomCount,
      min_sqm: Number(minSqm) || 0,
      building_age: buildingAge,
      floor_pref: floorPref,
      credit_suitable: creditSuitable,
      features,
      buyer_note: buyerNote,
      contact_phone: contactPhone,
    };

    const errors = validateBuyerRequestInput(payload);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await api.createRequest(payload);
      onCreated(res.request);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Talep kaydedilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6"
      >
        <div className="pb-5 border-b border-slate-200">
          <h2 className="font-display text-xl font-bold text-slate-900">
            Yeni Alıcı Talebi Oluştur
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Müşterinizin lokasyon, bütçe ve mülk beklentilerini girin. Talebiniz yalnızca MYK
            onaylı meslektaşlarınıza açılır.
          </p>
        </div>

        {serverError && (
          <div
            role="alert"
            className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm"
          >
            {serverError}
          </div>
        )}

        {/* Konum */}
        <div className="space-y-3">
          <h3 className="font-display text-sm font-semibold text-slate-900">
            1. Lokasyon Bilgileri (Türkiye İl / İlçe / Mahalle)
          </h3>
          <LocationSelector
            mode="form"
            idPrefix="create"
            city={city}
            district={district}
            neighborhood={neighborhood}
            errors={fieldErrors}
            onChange={({ city: c, district: d, neighborhood: n }) => {
              setCity(c);
              setDistrict(d);
              setNeighborhood(n);
            }}
          />
        </div>

        {/* İşlem ve Emlak Tipi */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h3 className="font-display text-sm font-semibold text-slate-900">
            2. İşlem Türü, Emlak Tipi ve Bütçe
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="req-tx-type"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                İşlem Tipi
              </label>
              <select
                id="req-tx-type"
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              >
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="req-prop-type"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Emlak Tipi
              </label>
              <select
                id="req-prop-type"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              >
                {PROPERTY_TYPES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="req-room-count"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Oda Sayısı
              </label>
              <select
                id="req-room-count"
                value={roomCount}
                onChange={(e) => setRoomCount(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              >
                {ROOM_COUNTS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="req-budget-min"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Minimum Bütçe (₺)
              </label>
              <input
                id="req-budget-min"
                type="number"
                min={0}
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                className="w-full h-10 px-3 font-mono text-sm bg-white border border-slate-300 rounded-lg tabular-nums focus:outline-none focus:border-blue-700"
              />
              <p className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums">
                {formatCurrencyTRY(Number(budgetMin) || 0)}
              </p>
              {fieldErrors.budget_min && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.budget_min}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="req-budget-max"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Maksimum Bütçe (₺) <span className="text-red-600">*</span>
              </label>
              <input
                id="req-budget-max"
                type="number"
                min={0}
                required
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                className="w-full h-10 px-3 font-mono text-sm bg-white border border-slate-300 rounded-lg tabular-nums focus:outline-none focus:border-blue-700"
              />
              <p className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums">
                {formatCurrencyTRY(Number(budgetMax) || 0)}
              </p>
              {fieldErrors.budget_max && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.budget_max}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="req-min-sqm"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Minimum Net m²
              </label>
              <input
                id="req-min-sqm"
                type="number"
                min={0}
                value={minSqm}
                onChange={(e) => setMinSqm(e.target.value)}
                className="w-full h-10 px-3 font-mono text-sm bg-white border border-slate-300 rounded-lg tabular-nums focus:outline-none focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="req-building-age"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Bina Yaşı Tercihi
              </label>
              <select
                id="req-building-age"
                value={buildingAge}
                onChange={(e) => setBuildingAge(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              >
                {BUILDING_AGE_OPTIONS.map((age) => (
                  <option key={age} value={age}>
                    {age}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="req-floor-pref"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Kat Tercihi
              </label>
              <select
                id="req-floor-pref"
                value={floorPref}
                onChange={(e) => setFloorPref(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              >
                {FLOOR_PREF_OPTIONS.map((fl) => (
                  <option key={fl} value={fl}>
                    {fl}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Özellikler ve Alıcı Notu */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h3 className="font-display text-sm font-semibold text-slate-900">
            3. Alıcı Notu ve İletişim
          </h3>

          <div>
            <label
              htmlFor="req-title"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Talep Başlığı (Boş bırakılırsa otomatik oluşturulur)
            </label>
            <input
              id="req-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Suadiye Sahile Yakın Krediye Uygun 3+1"
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-700 mb-2">
              Öncelikli Kriterler
            </span>
            <div className="flex flex-wrap gap-2">
              {FEATURE_OPTIONS.map((feat) => {
                const selected = features.includes(feat);
                return (
                  <button
                    key={feat}
                    type="button"
                    onClick={() => toggleFeature(feat)}
                    aria-pressed={selected}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      selected
                        ? 'bg-blue-700 border-blue-700 text-white'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {feat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <input
              id="req-credit"
              type="checkbox"
              checked={creditSuitable}
              onChange={(e) => setCreditSuitable(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
            />
            <label htmlFor="req-credit" className="text-sm text-slate-700">
              Müşteri konut kredisi kullanabilir (tapu krediye uygun olmalı)
            </label>
          </div>

          <div>
            <label
              htmlFor="req-buyer-note"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Alıcı Notu (Müşteri profili, ödeme şekli, aciliyet vb.) <span className="text-red-600">*</span>
            </label>
            <textarea
              id="req-buyer-note"
              rows={4}
              required
              value={buyerNote}
              onChange={(e) => setBuyerNote(e.target.value)}
              placeholder="Örn: Müşterimin nakit bütçesi hazır, %30 kredi kullanabilir. Okul servis güzergahına yakın, aydınlık ve masrafsız bir daire arıyoruz. Aynı gün yer görme yapabiliriz."
              className="w-full p-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
            />
            {fieldErrors.buyer_note && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.buyer_note}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="req-phone"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Danışman İletişim Telefonu <span className="text-red-600">*</span>
            </label>
            <input
              id="req-phone"
              type="tel"
              required
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full sm:w-72 h-10 px-3 font-mono text-sm bg-white border border-slate-300 rounded-lg tabular-nums focus:outline-none focus:border-blue-700"
            />
            {fieldErrors.contact_phone && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.contact_phone}</p>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors"
          >
            {submitting ? 'Kaydediliyor...' : 'Alıcı Talebini Yayınla'}
          </button>
        </div>
      </form>
    </div>
  );
}
