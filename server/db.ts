import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'));
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads', 'myk');
export const AVATARS_DIR = path.join(DATA_DIR, 'uploads', 'avatars');
export const DB_PATH = path.join(DATA_DIR, 'talepagi.db');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(AVATARS_DIR, { recursive: true });

function migrateLegacyUploads(legacyDir: string, targetDir: string) {
  if (!fs.existsSync(legacyDir)) return;
  for (const entry of fs.readdirSync(legacyDir)) {
    const src = path.join(legacyDir, entry);
    const dest = path.join(targetDir, entry);
    try {
      if (fs.statSync(src).isFile() && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
      }
    } catch {
      // Ignore transient file read issues during legacy migration
    }
  }
}

migrateLegacyUploads(path.resolve(process.cwd(), 'uploads', 'myk'), UPLOADS_DIR);
migrateLegacyUploads(path.resolve(process.cwd(), 'uploads', 'avatars'), AVATARS_DIR);

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const keyBuf = Buffer.from(key, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

function createSampleMykSvg(
  filename: string,
  fullName: string,
  officeName: string,
  mykNo: string,
  city: string
): string {
  const safePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(safePath)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="580" viewBox="0 0 840 580">
  <rect width="840" height="580" fill="#f8fafc"/>
  <rect x="24" y="24" width="792" height="532" fill="#ffffff" stroke="#1e3a8a" stroke-width="3"/>
  <rect x="36" y="36" width="768" height="508" fill="none" stroke="#cbd5e1" stroke-width="1"/>
  <rect x="36" y="36" width="768" height="84" fill="#0f172a"/>
  <text x="64" y="84" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#ffffff">MESLEKİ YETERLİLİK KURUMU — SEVİYE 5</text>
  <text x="64" y="106" font-family="Arial, sans-serif" font-size="13" fill="#94a3b8">Sorumlu Emlak Danışmanı Ulusal Yeterlilik Belgesi (17UY0333-5)</text>
  <text x="64" y="182" font-family="Arial, sans-serif" font-size="14" fill="#475569">BELGE SAHİBİ AD SOYAD</text>
  <text x="64" y="212" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="#0f172a">${fullName}</text>
  <text x="64" y="264" font-family="Arial, sans-serif" font-size="14" fill="#475569">EMLAK İŞLETMESİ / OFİS</text>
  <text x="64" y="292" font-family="Arial, sans-serif" font-size="20" font-weight="600" fill="#1e293b">${officeName} (${city})</text>
  <text x="64" y="346" font-family="Arial, sans-serif" font-size="14" fill="#475569">MYK BELGE NUMARASI</text>
  <text x="64" y="376" font-family="monospace" font-size="22" font-weight="bold" fill="#1d4ed8">${mykNo}</text>
  <line x1="64" y1="425" x2="776" y2="425" stroke="#e2e8f0" stroke-width="1"/>
  <text x="64" y="462" font-family="Arial, sans-serif" font-size="13" fill="#334155">Yeterlilik Birimleri: A1 (İSG, Çevre ve Kalite), A2 (Pazarlama ve Satış/Kiralama Süreçleri)</text>
  <text x="64" y="490" font-family="Arial, sans-serif" font-size="13" fill="#334155">Geçerlilik Durumu: Aktif · Emlak Danışmanlığı Seviye 5 Belge Örneği</text>
  <rect x="630" y="160" width="146" height="146" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/>
  <text x="703" y="232" text-anchor="middle" font-family="monospace" font-size="12" fill="#475569">MYK DOĞRULAMA</text>
  <text x="703" y="252" text-anchor="middle" font-family="monospace" font-size="11" fill="#1d4ed8">QR-ONAYLI</text>
</svg>`;
    fs.writeFileSync(safePath, svg, 'utf8');
  }
  return `/api/uploads/${filename}`;
}

export function initDb(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      office_name TEXT NOT NULL,
      city TEXT NOT NULL,
      district TEXT NOT NULL DEFAULT '',
      myk_number TEXT NOT NULL DEFAULT '',
      ttbs_number TEXT NOT NULL DEFAULT '',
      myk_doc_path TEXT NOT NULL,
      myk_doc_name TEXT NOT NULL,
      myk_doc_mime TEXT NOT NULL,
      avatar_path TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'agent' CHECK(role IN ('agent', 'admin')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      rejection_reason TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      approved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS buyer_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      transaction_type TEXT NOT NULL CHECK(transaction_type IN ('Satılık', 'Kiralık')),
      property_type TEXT NOT NULL,
      city TEXT NOT NULL,
      district TEXT NOT NULL,
      neighborhood TEXT NOT NULL,
      budget_min INTEGER NOT NULL,
      budget_max INTEGER NOT NULL,
      room_count TEXT NOT NULL,
      min_sqm INTEGER NOT NULL DEFAULT 0,
      building_age TEXT NOT NULL DEFAULT 'Fark Etmez',
      floor_pref TEXT NOT NULL DEFAULT 'Fark Etmez',
      credit_suitable INTEGER NOT NULL DEFAULT 1,
      features_json TEXT NOT NULL DEFAULT '[]',
      buyer_note TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'matched', 'closed')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contact_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      sender_agent_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      portfolio_ref TEXT NOT NULL DEFAULT '',
      sender_phone TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (request_id) REFERENCES buyer_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_agent_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS location_neighborhoods_cache (
      city TEXT NOT NULL,
      district TEXT NOT NULL,
      neighborhoods_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (city, district)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      admin_name TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL DEFAULT '',
      details TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      reviewer_agent_id INTEGER NOT NULL,
      target_agent_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL DEFAULT '',
      deal_closed INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      UNIQUE(request_id, reviewer_agent_id, target_agent_id),
      FOREIGN KEY (request_id) REFERENCES buyer_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_agent_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (target_agent_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pre_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_requests_city_district ON buyer_requests(city, district, status);
    CREATE INDEX IF NOT EXISTS idx_requests_agent ON buyer_requests(agent_id);
    CREATE INDEX IF NOT EXISTS idx_matches_request ON contact_matches(request_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reviews_target ON agent_reviews(target_agent_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reviews_request ON agent_reviews(request_id);
    CREATE INDEX IF NOT EXISTS idx_pre_requests_created ON pre_requests(created_at DESC);
  `);

  // Safe migration for existing SQLite databases created before avatar_path was added
  const cols = db.prepare("PRAGMA table_info('users')").all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === 'avatar_path')) {
    db.exec("ALTER TABLE users ADD COLUMN avatar_path TEXT NOT NULL DEFAULT ''");
  }

  // Ensure default platform settings exist
  const now = new Date().toISOString();
  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)'
  );
  insertSetting.run('platform_announcement', '', now);
  insertSetting.run('auto_approve_myk', 'false', now);
  insertSetting.run('allow_registrations', 'true', now);
  insertSetting.run('support_phone', '0850 300 00 00', now);

  const userCountRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCountRow.count === 0) {
    seedDatabase();
  }

  ensureDemoApprovedAgent();

  const reviewCountRow = db
    .prepare('SELECT COUNT(*) as count FROM agent_reviews')
    .get() as { count: number };
  if (reviewCountRow.count === 0) {
    seedInitialReviews();
  }
}

function ensureDemoApprovedAgent(): void {
  const existing = db
    .prepare("SELECT id, status, role FROM users WHERE LOWER(email) = 'ahmet@kuzeyemlak.com'")
    .get() as { id: number; status: string; role: string } | undefined;

  const now = new Date().toISOString();
  if (!existing) {
    const ahmetDoc = createSampleMykSvg(
      'seed-ahmet-myk.svg',
      'Ahmet Yılmaz',
      'Kuzey Sahil Gayrimenkul',
      'YB0044/17UY0333-5/00/41892',
      'İstanbul'
    );
    const phoneInUse = db
      .prepare("SELECT id FROM users WHERE phone = '0532 412 88 10'")
      .get() as { id: number } | undefined;
    const demoPhone = phoneInUse ? '0532 412 88 99' : '0532 412 88 10';

    db.prepare(`
      INSERT INTO users (
        full_name, email, phone, password_hash, office_name, city, district,
        myk_number, ttbs_number, myk_doc_path, myk_doc_name, myk_doc_mime, avatar_path,
        role, status, rejection_reason, bio, created_at, approved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 'agent', 'approved', '', ?, ?, ?)
    `).run(
      'Ahmet Yılmaz',
      'ahmet@kuzeyemlak.com',
      demoPhone,
      hashPassword('Emlak123!'),
      'Kuzey Sahil Gayrimenkul',
      'İstanbul',
      'Kadıköy',
      'YB0044/17UY0333-5/00/41892',
      '3408412',
      ahmetDoc,
      'myk-ahmet-yilmaz.svg',
      'image/svg+xml',
      'Kadıköy ve Bağdat Caddesi aksında lüks konut ve yatırım danışmanlığı.',
      now,
      now
    );
    return;
  }

  if (existing.status !== 'approved' || existing.role !== 'agent') {
    db.prepare(
      "UPDATE users SET status = 'approved', role = 'agent', rejection_reason = '', approved_at = COALESCE(approved_at, ?) WHERE id = ?"
    ).run(now, existing.id);
  }
}

function seedDatabase(): void {
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000).toISOString();

  const insertUser = db.prepare(`
    INSERT INTO users (
      full_name, email, phone, password_hash, office_name, city, district,
      myk_number, ttbs_number, myk_doc_path, myk_doc_name, myk_doc_mime, avatar_path,
      role, status, rejection_reason, bio, created_at, approved_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?)
  `);

  const adminDoc = createSampleMykSvg(
    'seed-admin-myk.svg',
    'Merve Demirtaş',
    'AlıcıSepeti Doğrulama Kurulu',
    'YB0044/17UY0333-5/00/00001',
    'İstanbul'
  );
  const ahmetDoc = createSampleMykSvg(
    'seed-ahmet-myk.svg',
    'Ahmet Yılmaz',
    'Kuzey Sahil Gayrimenkul',
    'YB0044/17UY0333-5/00/41892',
    'İstanbul'
  );
  const elifDoc = createSampleMykSvg(
    'seed-elif-myk.svg',
    'Elif Kayaalp',
    'Başkent Konut Danışmanlık',
    'YB0088/17UY0333-5/00/72914',
    'Ankara'
  );
  const muratDoc = createSampleMykSvg(
    'seed-murat-myk.svg',
    'Murat Soydan',
    'Ege Yarımada Portföy',
    'YB0051/17UY0333-5/00/19305',
    'İzmir'
  );
  const selinDoc = createSampleMykSvg(
    'seed-selin-myk.svg',
    'Selin Aksoy',
    'Akdeniz Prestij Emlak',
    'YB0062/17UY0333-5/00/55410',
    'Antalya'
  );
  const zeynepDoc = createSampleMykSvg(
    'seed-zeynep-myk.svg',
    'Zeynep Karahan',
    'Bağdat Caddesi Eksper Gayrimenkul',
    'YB0044/17UY0333-5/00/98120',
    'İstanbul'
  );

  const adminId = insertUser.run(
    'Merve Demirtaş',
    'admin@talepagi.com',
    '0530 100 00 01',
    hashPassword('Admin123!'),
    'AlıcıSepeti Doğrulama Kurulu',
    'İstanbul',
    'Beşiktaş',
    'YB0044/17UY0333-5/00/00001',
    '3400001',
    adminDoc,
    'myk-seviye5-merve-demirtas.svg',
    'image/svg+xml',
    'admin',
    'approved',
    '',
    'MYK Seviye 5 ve Taşınmaz Ticareti Yetki Belgesi ön onay sorumlusu.',
    hoursAgo(240),
    hoursAgo(240)
  ).lastInsertRowid as number;

  const ahmetId = insertUser.run(
    'Ahmet Yılmaz',
    'ahmet@kuzeyemlak.com',
    '0532 412 88 10',
    hashPassword('Emlak123!'),
    'Kuzey Sahil Gayrimenkul',
    'İstanbul',
    'Kadıköy',
    'YB0044/17UY0333-5/00/41892',
    '3408412',
    ahmetDoc,
    'myk-ahmet-yilmaz.svg',
    'image/svg+xml',
    'agent',
    'approved',
    '',
    'Kadıköy ve Bağdat Caddesi aksında lüks konut ve yatırım danışmanlığı.',
    hoursAgo(180),
    hoursAgo(178)
  ).lastInsertRowid as number;

  const elifId = insertUser.run(
    'Elif Kayaalp',
    'elif@baskentgayrimenkul.com',
    '0533 619 45 22',
    hashPassword('Emlak123!'),
    'Başkent Konut Danışmanlık',
    'Ankara',
    'Çankaya',
    'YB0088/17UY0333-5/00/72914',
    '0604521',
    elifDoc,
    'myk-elif-kayaalp.svg',
    'image/svg+xml',
    'agent',
    'approved',
    '',
    'Çayyolu, Ümitköy ve İncek bölgelerinde nitelikli konut ve villa alıcı temsilciliği.',
    hoursAgo(150),
    hoursAgo(148)
  ).lastInsertRowid as number;

  const muratId = insertUser.run(
    'Murat Soydan',
    'murat@egeportfoy.com',
    '0542 780 31 09',
    hashPassword('Emlak123!'),
    'Ege Yarımada Portföy',
    'İzmir',
    'Urla',
    'YB0051/17UY0333-5/00/19305',
    '3501930',
    muratDoc,
    'myk-murat-soydan.svg',
    'image/svg+xml',
    'agent',
    'approved',
    '',
    'Urla, Çeşme ve Karşıyaka aksında müstakil villa ve arsa portföyleri.',
    hoursAgo(120),
    hoursAgo(118)
  ).lastInsertRowid as number;

  const selinId = insertUser.run(
    'Selin Aksoy',
    'selin@akdenizyatirim.com',
    '0535 904 17 63',
    hashPassword('Emlak123!'),
    'Akdeniz Prestij Emlak',
    'Antalya',
    'Muratpaşa',
    'YB0062/17UY0333-5/00/55410',
    '0705541',
    selinDoc,
    'myk-selin-aksoy.svg',
    'image/svg+xml',
    'agent',
    'approved',
    '',
    'Lara ve Konyaaltı bölgesinde oturumluk ve yüksek kira getirili konutlar.',
    hoursAgo(90),
    hoursAgo(88)
  ).lastInsertRowid as number;

  // Pending agent waiting for MYK pre-approval
  insertUser.run(
    'Zeynep Karahan',
    'zeynep@kadikoykonut.com',
    '0536 334 90 12',
    hashPassword('Emlak123!'),
    'Bağdat Caddesi Eksper Gayrimenkul',
    'İstanbul',
    'Kadıköy',
    'YB0044/17UY0333-5/00/98120',
    '3409812',
    zeynepDoc,
    'myk-zeynep-karahan.svg',
    'image/svg+xml',
    'agent',
    'pending',
    '',
    'Suadiye ve Caddebostan bölgesinde 7 yıllık saha deneyimi.',
    hoursAgo(4),
    null
  );

  const insertRequest = db.prepare(`
    INSERT INTO buyer_requests (
      agent_id, title, transaction_type, property_type,
      city, district, neighborhood, budget_min, budget_max,
      room_count, min_sqm, building_age, floor_pref, credit_suitable,
      features_json, buyer_note, contact_phone, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const req1Id = insertRequest.run(
    ahmetId,
    'Suadiye Sahil Aksında Krediye Uygun 3+1 Daire',
    'Satılık',
    'Daire',
    'İstanbul',
    'Kadıköy',
    'Suadiye',
    14500000,
    18500000,
    '3+1',
    130,
    '1-5 Yıl',
    'Ara Kat',
    1,
    JSON.stringify(['Asansör', 'Kapalı Otopark', 'Ebeveyn Banyosu', 'Kat Mülkiyetli']),
    'Müşterim doktor aile; %60 nakit + %40 konut kredisi ile alım yapacak. Bağdat Caddesi ile sahil yolu arasında, kapalı otoparklı ve en az 2. katta ferah bir daire arıyorlar. Hafta içi 17:00 sonrası yer görme yapabiliriz.',
    '0532 412 88 10',
    'active',
    hoursAgo(3),
    hoursAgo(3)
  ).lastInsertRowid as number;

  const req2Id = insertRequest.run(
    elifId,
    'İncek Bulvarı Yakını Müstakil Bahçeli 5+1 Villa',
    'Satılık',
    'Villa',
    'Ankara',
    'Gölbaşı',
    'İncek',
    26000000,
    34000000,
    '5+1 ve üzeri',
    320,
    'Sıfır (0)',
    'Müstakil',
    0,
    JSON.stringify(['Kapalı Otopark', 'Site İçi / Güvenlik', 'Yerden Isıtma']),
    'Tamamı nakit hazır yatırımcı alıcı. En az 450 m² arsa payı olan, tercihen tek katlı ya da asansör altyapılı sıfır villa talep ediyor. İskanlı ve tapusu hazır portföy sahipleri doğrudan arayabilir.',
    '0533 619 45 22',
    'active',
    hoursAgo(6),
    hoursAgo(6)
  ).lastInsertRowid as number;

  const req3Id = insertRequest.run(
    muratId,
    'Urla İskele Bölgesinde Taş veya Modern Müstakil Ev',
    'Satılık',
    'Müstakil Ev',
    'İzmir',
    'Urla',
    'İskele',
    18000000,
    24000000,
    '4+1',
    200,
    '6-10 Yıl',
    'Müstakil',
    1,
    JSON.stringify(['Balkon / Teras', 'Deniz / Doğa Manzarası', 'Kat Mülkiyetli']),
    'İstanbul’dan taşınacak kurumsal yönetici aile için 12 ay oturuma uygun, ısıtma sistemi kurulmuş (ısı pompası veya doğalgaz), yürüme mesafesinde market/restoran olan bölgede müstakil ev aranmaktadır.',
    '0542 780 31 09',
    'active',
    hoursAgo(11),
    hoursAgo(11)
  ).lastInsertRowid as number;

  insertRequest.run(
    ahmetId,
    'Etiler / Nisbetiye Metro Yakını Kiralık 2+1 Residence',
    'Kiralık',
    'Residence',
    'İstanbul',
    'Beşiktaş',
    'Etiler',
    75000,
    105000,
    '2+1',
    105,
    '1-5 Yıl',
    'Yüksek Kat',
    0,
    JSON.stringify(['Asansör', 'Kapalı Otopark', 'Site İçi / Güvenlik', 'Metro / Ulaşıma Yakın']),
    'Yabancı bankada üst düzey yönetici olarak başlayan müşterim için eşyalı veya boş, 1 yıllık peşin ödeme imkanı olan, güvenlikli ve kapalı otoparklı residence daire aranıyor. Kurumsal kefil mevcut.',
    '0532 412 88 10',
    'active',
    hoursAgo(16),
    hoursAgo(16)
  );

  insertRequest.run(
    selinId,
    'Lara Fener Mahallesinde Deniz Manzaralı 4+1',
    'Satılık',
    'Daire',
    'Antalya',
    'Muratpaşa',
    'Lara',
    13000000,
    17000000,
    '4+1',
    185,
    '6-10 Yıl',
    'Yüksek Kat',
    1,
    JSON.stringify(['Asansör', 'Deniz / Doğa Manzarası', 'Balkon / Teras', 'Kapalı Otopark']),
    'Falezler bandında veya Eski Lara Caddesi üzerinde önü kapanmaz deniz manzaralı daire talebi. Alıcım Antalya’da ikamet ediyor, aynı gün yer görme yapabiliyoruz.',
    '0535 904 17 63',
    'active',
    hoursAgo(22),
    hoursAgo(22)
  );

  insertRequest.run(
    elifId,
    'Çayyolu Merkezde Site İçi Aile Dairesi 4+1',
    'Satılık',
    'Daire',
    'Ankara',
    'Çankaya',
    'Çayyolu',
    11500000,
    14500000,
    '4+1',
    170,
    '1-5 Yıl',
    'Ara Kat',
    1,
    JSON.stringify(['Site İçi / Güvenlik', 'Kapalı Otopark', 'Asansör', 'Krediye Uygun']),
    'Okullara yakın, çocuk oyun alanı ve açık/kapalı otoparkı bulunan site içinde güney-batı cepheli 4+1 daire. Müşterimin kendi dairesi satıldı, nakdi banka hesabında hazır.',
    '0533 619 45 22',
    'active',
    hoursAgo(29),
    hoursAgo(29)
  );

  insertRequest.run(
    muratId,
    'Bostanlı Sahile Yakın Kiralık 3+1 Geniş Daire',
    'Kiralık',
    'Daire',
    'İzmir',
    'Karşıyaka',
    'Bostanlı',
    45000,
    60000,
    '3+1',
    135,
    '11-20 Yıl',
    'Ara Kat',
    0,
    JSON.stringify(['Asansör', 'Balkon / Teras', 'Metro / Ulaşıma Yakın']),
    'Uzun dönem oturum planlayan memur ve avukat çift için Bostanlı tramvay hattına yakın, balkonlu, mümkünse doğalgaz kombili 3+1 daire. Tahliye taahhütnamesi konusunda sorunsuz.',
    '0542 780 31 09',
    'active',
    hoursAgo(36),
    hoursAgo(36)
  );

  insertRequest.run(
    adminId,
    'Zekeriyaköy Orman Manzaralı Müstakil İkiz Villa',
    'Satılık',
    'Villa',
    'İstanbul',
    'Sarıyer',
    'Zekeriyaköy',
    29000000,
    38000000,
    '4+2',
    260,
    '1-5 Yıl',
    'Müstakil',
    1,
    JSON.stringify(['Site İçi / Güvenlik', 'Kapalı Otopark', 'Deniz / Doğa Manzarası']),
    'Yatırım ve oturum amaçlı temiz tapulu, bahçe kullanım alanı geniş ve ortak havuzlu/güvenlikli sitede villa arayışı. %50-50 komisyon paylaşımına açık meslektaşlarımız arayabilir.',
    '0530 100 00 01',
    'matched',
    hoursAgo(52),
    hoursAgo(20)
  );

  const insertMatch = db.prepare(`
    INSERT INTO contact_matches (
      request_id, sender_agent_id, message, portfolio_ref, sender_phone, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertMatch.run(
    req1Id,
    muratId,
    'Suadiye Kazım Özalp Sokak’ta yetkili portföyümde 3 yaşındayken teslim edilmiş 3+1 net 128 m² kapalı otoparklı daire mevcut. Ortak çalışma şartlarını görüşmek için arayabilirsiniz.',
    'SUA-314',
    '0542 780 31 09',
    hoursAgo(1)
  );

  insertMatch.run(
    req2Id,
    ahmetId,
    'Ankara çözüm ortağımız üzerinden İncek Bulvarı’na 400m mesafede 520 m² arsada sıfır iskanlı villa portföyümüz var.',
    'INC-501',
    '0532 412 88 10',
    hoursAgo(2)
  );

  insertMatch.run(
    req3Id,
    selinId,
    'Urla İskele’ye 6 dk yürüme mesafesinde ısı pompalı 4+1 taş ev portföyümüzle eşleşebilir.',
    'URL-208',
    '0535 904 17 63',
    hoursAgo(4)
  );
}

function seedInitialReviews(): void {
  const byEmail = db.prepare('SELECT id FROM users WHERE email = ?');
  const admin = byEmail.get('admin@talepagi.com') as { id: number } | undefined;
  const ahmet = byEmail.get('ahmet@kuzeyemlak.com') as { id: number } | undefined;
  const elif = byEmail.get('elif@baskentgayrimenkul.com') as { id: number } | undefined;
  const murat = byEmail.get('murat@egeportfoy.com') as { id: number } | undefined;
  const selin = byEmail.get('selin@akdenizyatirim.com') as { id: number } | undefined;

  if (!ahmet || !elif || !murat || !selin || !admin) return;

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 3600 * 1000).toISOString();

  // Ensure a couple of completed historical requests exist for realistic verified peer reviews
  const existingClosed = db
    .prepare("SELECT id, agent_id FROM buyer_requests WHERE status IN ('matched', 'closed') LIMIT 1")
    .get() as { id: number; agent_id: number } | undefined;

  let reqAId: number;
  let reqBId: number;

  if (existingClosed && existingClosed.agent_id === admin.id) {
    reqAId = existingClosed.id;
  } else {
    reqAId = db
      .prepare(
        `INSERT INTO buyer_requests (
          agent_id, title, transaction_type, property_type,
          city, district, neighborhood, budget_min, budget_max,
          room_count, min_sqm, building_age, floor_pref, credit_suitable,
          features_json, buyer_note, contact_phone, status, created_at, updated_at
        ) VALUES (?, ?, 'Satılık', 'Daire', 'İstanbul', 'Kadıköy', 'Caddebostan', 16000000, 19500000, '3+1', 140, '1-5 Yıl', 'Ara Kat', 1, '["Asansör","Kapalı Otopark"]', ?, '0532 412 88 10', 'closed', ?, ?)`
      )
      .run(
        ahmet.id,
        'Caddebostan Plaj Yolu 3+1 Aile Dairesi (Tamamlandı)',
        'Ortak çalışma ile tapu devri başarıyla tamamlanan alıcı talebi.',
        daysAgo(14),
        daysAgo(10)
      ).lastInsertRowid as number;
  }

  reqBId = db
    .prepare(
      `INSERT INTO buyer_requests (
        agent_id, title, transaction_type, property_type,
        city, district, neighborhood, budget_min, budget_max,
        room_count, min_sqm, building_age, floor_pref, credit_suitable,
        features_json, buyer_note, contact_phone, status, created_at, updated_at
      ) VALUES (?, ?, 'Satılık', 'Villa', 'Ankara', 'Çankaya', 'Oran', 21000000, 26000000, '5+1 ve üzeri', 280, '1-5 Yıl', 'Müstakil', 1, '["Site İçi / Güvenlik","Kapalı Otopark"]', ?, '0533 619 45 22', 'closed', ?, ?)`
    )
    .run(
      elif.id,
      'Oran Diplomat Sitesi Yakını Müstakil Villa (Tamamlandı)',
      'Müşteri yer gösterimi sonrası %50-%50 paylaşımlı satış tamamlandı.',
      daysAgo(18),
      daysAgo(12)
    ).lastInsertRowid as number;

  const reqCId = db
    .prepare(
      `INSERT INTO buyer_requests (
        agent_id, title, transaction_type, property_type,
        city, district, neighborhood, budget_min, budget_max,
        room_count, min_sqm, building_age, floor_pref, credit_suitable,
        features_json, buyer_note, contact_phone, status, created_at, updated_at
      ) VALUES (?, ?, 'Satılık', 'Daire', 'İstanbul', 'Beşiktaş', 'Akatlar', 13500000, 16500000, '3+1', 125, '6-10 Yıl', 'Ara Kat', 1, '["Asansör","Metro / Ulaşıma Yakın"]', ?, '0532 412 88 10', 'matched', ?, ?)`
    )
    .run(
      ahmet.id,
      'Akatlar Spor Kulübü Çevresi 3+1 Daire (Eşleşti)',
      'Portföy sahibi meslektaş ile ortak sözleşme imzalandı.',
      daysAgo(8),
      daysAgo(5)
    ).lastInsertRowid as number;

  const insertMatch = db.prepare(`
    INSERT INTO contact_matches (
      request_id, sender_agent_id, message, portfolio_ref, sender_phone, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertMatch.run(reqAId, ahmet.id, 'Yetkili portföy sunumu yapıldı, alıcı yer gösterimi tamamlandı.', 'KAD-104', '0532 412 88 10', daysAgo(12));
  insertMatch.run(reqBId, ahmet.id, 'Ankara çözüm ortağımızdaki villa portföyü ile eşleşti.', 'ANK-221', '0532 412 88 10', daysAgo(15));
  insertMatch.run(reqCId, elif.id, 'İstanbul ofisimiz üzerinden Akatlar portföyümüzü yönlendirdik.', 'BES-089', '0533 619 45 22', daysAgo(7));
  insertMatch.run(reqCId, murat.id, 'Yatırımcı müşterimizdeki Akatlar dairesiyle ortak kapama yaptık.', 'IST-310', '0542 780 31 09', daysAgo(6));
  insertMatch.run(reqBId, selin.id, 'Ortak müşteri yönlendirmesi başarıyla sonuçlandı.', 'ANT-112', '0535 904 17 63', daysAgo(14));

  const insertReview = db.prepare(`
    INSERT OR IGNORE INTO agent_reviews (
      request_id, reviewer_agent_id, target_agent_id, rating, comment, deal_closed, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Ahmet receives 3 strong reviews -> Güvenilir Danışman (5.0 / 3 işlem)
  insertReview.run(
    reqBId,
    elif.id,
    ahmet.id,
    5,
    'Ahmet Bey yer gösteriminden tapu sürecine kadar son derece şeffaf ve profesyonel ilerledi. Komisyon paylaşımı sözleşmeye uygun tamamlandı.',
    1,
    daysAgo(11)
  );
  insertReview.run(
    reqCId,
    murat.id,
    ahmet.id,
    5,
    'Alıcı beklentisini çok net aktardığı için ilk gösterimde sonuca ulaştık. Güvenle ortak iş yapılabilecek bir meslektaş.',
    1,
    daysAgo(5)
  );
  insertReview.run(
    reqAId,
    admin.id,
    ahmet.id,
    5,
    'Süreç boyunca belgeler eksiksiz ve randevular tam saatindeydi.',
    1,
    daysAgo(9)
  );

  // Elif receives 2 strong reviews -> Güvenilir Danışman (5.0 / 2 işlem)
  insertReview.run(
    reqBId,
    ahmet.id,
    elif.id,
    5,
    'Elif Hanım Ankara bölgesindeki tüm teknik detayları önceden paylaştı, alıcı müşterimiz çok memnun kaldı.',
    1,
    daysAgo(11)
  );
  insertReview.run(
    reqCId,
    ahmet.id,
    elif.id,
    5,
    'Hızlı geri dönüş ve dürüst iletişim için teşekkürler.',
    1,
    daysAgo(5)
  );

  // Murat receives 1 strong review -> Onaylı İşlem Puanlı (1 işlem; next review unlocks Güvenilir Danışman)
  insertReview.run(
    reqCId,
    ahmet.id,
    murat.id,
    5,
    'Murat Bey yetkili portföyünü tüm şeffaflığıyla paylaştı, çok verimli bir ortak çalışmaydı.',
    1,
    daysAgo(4)
  );

  // Selin receives 1 review
  insertReview.run(
    reqBId,
    elif.id,
    selin.id,
    4,
    'İletişimi güçlü ve çözüm odaklı yaklaşımıyla süreci hızlandırdı.',
    1,
    daysAgo(10)
  );
}

