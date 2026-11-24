import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeLocationFacetCounts,
  computeTrustSummary,
  filterAdminRequests,
  filterAdminUsers,
  filterBuyerRequests,
  formatBudgetRange,
  formatCurrencyTRY,
  formatTurkishPhone,
  isValidMykNumber,
  isValidTurkishPhone,
  toTelHref,
  validateBuyerRequestInput,
  validatePreRequestInput,
  validateReviewInput,
} from './domain';
import type { AdminUserRow, BuyerRequest } from '../types';

test('formatCurrencyTRY formats Turkish Lira with thousands separators', () => {
  assert.equal(formatCurrencyTRY(12500000), '12.500.000 ₺');
  assert.equal(formatCurrencyTRY(0), '0 ₺');
  assert.equal(formatBudgetRange(8500000, 11000000), '8.500.000 ₺ – 11.000.000 ₺');
});

test('Turkish phone validation and formatting handles 05XX, +90, and raw digits', () => {
  assert.equal(isValidTurkishPhone('0532 111 22 33'), true);
  assert.equal(isValidTurkishPhone('+90 532 111 22 33'), true);
  assert.equal(isValidTurkishPhone('5321112233'), true);
  assert.equal(isValidTurkishPhone('0212 111 22 33'), false);
  assert.equal(isValidTurkishPhone('12345'), false);
  assert.equal(formatTurkishPhone('+905321112233'), '0532 111 22 33');
  assert.equal(toTelHref('0532 111 22 33'), 'tel:+905321112233');
});

test('MYK Seviye 5 document number validation checks format', () => {
  assert.equal(isValidMykNumber('YB0044/17UY0333-5/00/12345'), true);
  assert.equal(isValidMykNumber('MYK-2025-88412'), true);
  assert.equal(isValidMykNumber('abc'), false);
  assert.equal(isValidMykNumber('ABCDEFGH'), false);
});

test('validateBuyerRequestInput rejects missing location, invalid budget range, and short note', () => {
  const errors = validateBuyerRequestInput({
    title: '',
    transaction_type: 'Satılık',
    property_type: 'Daire',
    city: '',
    district: 'Kadıköy',
    neighborhood: '',
    budget_min: 15000000,
    budget_max: 10000000,
    room_count: '3+1',
    min_sqm: 120,
    buyer_note: 'Kısa not',
    contact_phone: '1234',
  });

  assert.ok(errors.city);
  assert.ok(errors.neighborhood);
  assert.ok(errors.budget_max);
  assert.ok(errors.buyer_note);
  assert.ok(errors.contact_phone);

  const validErrors = validateBuyerRequestInput({
    title: 'Suadiye 3+1 Daire Talebi',
    transaction_type: 'Satılık',
    property_type: 'Daire',
    city: 'İstanbul',
    district: 'Kadıköy',
    neighborhood: 'Suadiye',
    budget_min: 12000000,
    budget_max: 16500000,
    room_count: '3+1',
    min_sqm: 135,
    buyer_note: 'Nakit hazır alıcı, sahil şeridine yürüme mesafesinde asansörlü bina arıyor.',
    contact_phone: '0532 555 44 33',
  });
  assert.deepEqual(validErrors, {});
});

test('filterBuyerRequests filters by city, district, neighborhood, budget overlap, and Turkish search', () => {
  const sample: BuyerRequest[] = [
    {
      id: 1,
      agent_id: 2,
      title: 'Suadiye Sahil 3+1',
      transaction_type: 'Satılık',
      property_type: 'Daire',
      city: 'İstanbul',
      district: 'Kadıköy',
      neighborhood: 'Suadiye',
      budget_min: 12000000,
      budget_max: 16000000,
      room_count: '3+1',
      min_sqm: 130,
      building_age: '1-5 Yıl',
      floor_pref: 'Ara Kat',
      credit_suitable: true,
      features: ['Asansör'],
      buyer_note: 'Nakit müşteri, hızlı tapu istiyor.',
      contact_phone: '0532 111 22 33',
      status: 'active',
      created_at: '2026-11-20T08:00:00Z',
      updated_at: '2026-11-20T08:00:00Z',
    },
    {
      id: 2,
      agent_id: 3,
      title: 'İncek Müstakil Villa',
      transaction_type: 'Satılık',
      property_type: 'Villa',
      city: 'Ankara',
      district: 'Gölbaşı',
      neighborhood: 'İncek',
      budget_min: 22000000,
      budget_max: 28000000,
      room_count: '5+1 ve üzeri',
      min_sqm: 300,
      building_age: 'Sıfır (0)',
      floor_pref: 'Müstakil',
      credit_suitable: false,
      features: ['Kapalı Otopark'],
      buyer_note: 'Büyük bahçeli villa talep ediliyor.',
      contact_phone: '0533 222 33 44',
      status: 'active',
      created_at: '2026-11-20T09:00:00Z',
      updated_at: '2026-11-20T09:00:00Z',
    },
    {
      id: 3,
      agent_id: 4,
      title: 'Caddebostan 3+1 Aile Dairesi',
      transaction_type: 'Satılık',
      property_type: 'Daire',
      city: 'İstanbul',
      district: 'Kadıköy',
      neighborhood: 'Caddebostan',
      budget_min: 17000000,
      budget_max: 21000000,
      room_count: '3+1',
      min_sqm: 145,
      building_age: '1-5 Yıl',
      floor_pref: 'Ara Kat',
      credit_suitable: true,
      features: ['Asansör'],
      buyer_note: 'Caddebostan parkına yakın daire arıyor.',
      contact_phone: '0534 333 44 55',
      status: 'active',
      created_at: '2026-11-20T07:00:00Z',
      updated_at: '2026-11-20T07:00:00Z',
    },
  ];

  const filteredKadikoy = filterBuyerRequests(sample, {
    city: 'İstanbul',
    district: 'Kadıköy',
    neighborhood: 'Suadiye',
    transaction_type: '',
    property_type: '',
    room_count: '',
    min_budget: '',
    max_budget: '',
    q: 'hizli tapu',
  });
  assert.equal(filteredKadikoy.length, 1);
  assert.equal(filteredKadikoy[0].id, 1);

  const multiNeighborhood = filterBuyerRequests(sample, {
    city: 'İstanbul',
    district: 'Kadıköy',
    neighborhood: '',
    neighborhoods: ['Suadiye', 'Caddebostan'],
    transaction_type: '',
    property_type: '',
    room_count: '',
    min_budget: '',
    max_budget: '',
    sort_by: 'budget_desc',
    q: '',
  });
  assert.equal(multiNeighborhood.length, 2);
  assert.equal(multiNeighborhood[0].id, 3);
  assert.equal(multiNeighborhood[1].id, 1);

  const creditOnly = filterBuyerRequests(sample, {
    city: '',
    district: '',
    neighborhood: '',
    transaction_type: '',
    property_type: '',
    room_count: '',
    min_budget: '',
    max_budget: '',
    credit_only: true,
    q: '',
  });
  assert.equal(creditOnly.length, 2);

  const facets = computeLocationFacetCounts(sample, 'İstanbul', 'Kadıköy');
  assert.deepEqual(facets.cities, [
    { name: 'İstanbul', count: 2 },
    { name: 'Ankara', count: 1 },
  ]);
  assert.deepEqual(facets.districts, [{ name: 'Kadıköy', count: 2 }]);
  assert.deepEqual(facets.neighborhoods, [
    { name: 'Caddebostan', count: 1 },
    { name: 'Suadiye', count: 1 },
  ]);
});

test('filterAdminUsers filters by role, status, and Turkish-normalized search query', () => {
  const users: AdminUserRow[] = [
    {
      id: 1,
      full_name: 'Merve Demirtaş',
      email: 'admin@talepagi.com',
      phone: '0530 100 00 01',
      office_name: 'AlıcıSepeti Genel Merkez',
      city: 'İstanbul',
      district: 'Beşiktaş',
      myk_number: 'YONETIM-001',
      ttbs_number: '3400001',
      myk_doc_path: '',
      myk_doc_name: '',
      myk_doc_mime: '',
      avatar_path: '',
      role: 'admin',
      status: 'approved',
      rejection_reason: '',
      bio: '',
      created_at: '2026-11-20T08:00:00Z',
      approved_at: '2026-11-20T08:00:00Z',
      request_count: 0,
      match_count: 0,
    },
    {
      id: 2,
      full_name: 'Zeynep Karahan',
      email: 'zeynep@kadikoykonut.com',
      phone: '0535 777 88 99',
      office_name: 'Kadıköy Konut',
      city: 'İstanbul',
      district: 'Kadıköy',
      myk_number: 'YB0044/17UY0333',
      ttbs_number: '',
      myk_doc_path: '',
      myk_doc_name: '',
      myk_doc_mime: '',
      avatar_path: '',
      role: 'agent',
      status: 'pending',
      rejection_reason: '',
      bio: '',
      created_at: '2026-11-20T09:00:00Z',
      approved_at: null,
      request_count: 2,
      match_count: 1,
    },
  ];

  assert.equal(filterAdminUsers(users, { q: '', status: 'all', role: 'admin' }).length, 1);
  assert.equal(filterAdminUsers(users, { q: 'kadikoy', status: 'pending', role: 'agent' }).length, 1);
  assert.equal(filterAdminUsers(users, { q: 'demirtas', status: 'pending', role: 'all' }).length, 0);
});

test('filterAdminRequests filters across status, transaction type, city, and search', () => {
  const requests: BuyerRequest[] = [
    {
      id: 1,
      agent_id: 2,
      title: 'Suadiye 3+1',
      transaction_type: 'Satılık',
      property_type: 'Daire',
      city: 'İstanbul',
      district: 'Kadıköy',
      neighborhood: 'Suadiye',
      budget_min: 10000000,
      budget_max: 15000000,
      room_count: '3+1',
      min_sqm: 130,
      building_age: '1-5 Yıl',
      floor_pref: 'Ara Kat',
      credit_suitable: true,
      features: [],
      buyer_note: 'Nakit müşteri.',
      contact_phone: '0532 111 22 33',
      status: 'active',
      created_at: '2026-11-20T08:00:00Z',
      updated_at: '2026-11-20T08:00:00Z',
      agent_name: 'Ahmet Yılmaz',
    },
    {
      id: 2,
      agent_id: 3,
      title: 'Çankaya Kiralık Ofis',
      transaction_type: 'Kiralık',
      property_type: 'İşyeri / Ofis',
      city: 'Ankara',
      district: 'Çankaya',
      neighborhood: 'Kavaklıdere',
      budget_min: 60000,
      budget_max: 85000,
      room_count: '4+1',
      min_sqm: 180,
      building_age: '6-10 Yıl',
      floor_pref: 'Ara Kat',
      credit_suitable: false,
      features: [],
      buyer_note: 'Hukuk bürosu için.',
      contact_phone: '0533 444 55 66',
      status: 'matched',
      created_at: '2026-11-20T09:00:00Z',
      updated_at: '2026-11-20T09:00:00Z',
      agent_name: 'Selin Kaya',
    },
  ];

  assert.equal(
    filterAdminRequests(requests, { q: 'hukuk', status: 'matched', transaction_type: 'Kiralık', city: 'Ankara' }).length,
    1
  );
  assert.equal(
    filterAdminRequests(requests, { q: '', status: 'active', transaction_type: 'all', city: 'all' }).length,
    1
  );
});

test('computeTrustSummary assigns Güvenilir Danışman and Elit tiers strictly by rating, review count, and completed deals', () => {
  const empty = computeTrustSummary(0, 0, 0);
  assert.equal(empty.tier, 'none');
  assert.equal(empty.badge_label, '');

  const single = computeTrustSummary(4.6, 1, 1);
  assert.equal(single.tier, 'rated');
  assert.equal(single.badge_label, 'Onaylı İşlem Puanlı');

  const trusted = computeTrustSummary(4.75, 2, 2);
  assert.equal(trusted.tier, 'trusted');
  assert.equal(trusted.badge_label, 'Güvenilir Danışman');
  assert.equal(trusted.rating_avg, 4.8);

  const lowScore = computeTrustSummary(3.9, 4, 4);
  assert.equal(lowScore.tier, 'none');

  const elite = computeTrustSummary(4.92, 5, 5);
  assert.equal(elite.tier, 'elite');
  assert.equal(elite.badge_label, 'Elit Güvenilir Danışman');
});

test('validateReviewInput validates integer star rating and comment length bounds', () => {
  assert.ok(validateReviewInput({ rating: 0, comment: 'Harika iş' }));
  assert.ok(validateReviewInput({ rating: 6, comment: 'Harika iş' }));
  assert.ok(validateReviewInput({ rating: 4.5, comment: 'Harika iş' }));
  assert.ok(validateReviewInput({ rating: 5, comment: 'kısa' }));
  assert.equal(validateReviewInput({ rating: 5, comment: '' }), null);
  assert.equal(validateReviewInput({ rating: 5, comment: 'Çok şeffaf ve hızlı çalıştık.' }), null);
});

test('validatePreRequestInput validates full_name, email, and address', () => {
  assert.ok(
    validatePreRequestInput({ full_name: 'Al', email: 'ali@emlak.com', address: 'Kadıköy İstanbul' })
  );
  assert.ok(
    validatePreRequestInput({ full_name: 'Ali Kaya', email: 'gecersiz-mail', address: 'Kadıköy İstanbul' })
  );
  assert.ok(
    validatePreRequestInput({ full_name: 'Ali Kaya', email: 'ali@emlak.com', address: 'Abc' })
  );
  assert.equal(
    validatePreRequestInput({
      full_name: 'Ali Kaya',
      email: 'ali@emlak.com',
      address: 'Bağdat Caddesi No:12 Kadıköy, İstanbul',
    }),
    null
  );
});
