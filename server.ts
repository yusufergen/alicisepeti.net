import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import {
  AVATARS_DIR,
  db,
  hashPassword,
  initDb,
  UPLOADS_DIR,
  verifyPassword,
} from './server/db.ts';
import { TURKEY_LOCATION_TREE } from './src/data/turkeyLocations.ts';
import {
  computeTrustSummary,
  formatTurkishPhone,
  isValidTurkishPhone,
  validateBuyerRequestInput,
  validateReviewInput,
} from './src/utils/domain.ts';

initDb();

interface ProvinceEntry {
  id: number;
  name: string;
  districts: { id: number; name: string }[];
}

const provincesFilePath = path.resolve(process.cwd(), 'server', 'data', 'turkeyProvinces.json');
const ALL_TURKEY_PROVINCES: ProvinceEntry[] = fs.existsSync(provincesFilePath)
  ? (JSON.parse(fs.readFileSync(provincesFilePath, 'utf8')) as ProvinceEntry[])
  : [];

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '4mb' }));

interface DbUser {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  password_hash: string;
  office_name: string;
  city: string;
  district: string;
  myk_number: string;
  ttbs_number: string;
  myk_doc_path: string;
  myk_doc_name: string;
  myk_doc_mime: string;
  avatar_path: string;
  role: 'agent' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string;
  bio: string;
  created_at: string;
  approved_at: string | null;
}

interface AuthedRequest extends Request {
  user?: DbUser;
  sessionToken?: string;
}

function getUserTrustStats(userId: number): {
  rating_avg: number;
  review_count: number;
  completed_deals: number;
} {
  const row = db
    .prepare(
      `SELECT
        COALESCE(ROUND(AVG(rating), 1), 0) AS rating_avg,
        COUNT(*) AS review_count,
        COALESCE(SUM(CASE WHEN deal_closed = 1 THEN 1 ELSE 0 END), 0) AS completed_deals
       FROM agent_reviews
       WHERE target_agent_id = ?`
    )
    .get(userId) as
    | { rating_avg: number; review_count: number; completed_deals: number }
    | undefined;
  return {
    rating_avg: Number(row?.rating_avg || 0),
    review_count: Number(row?.review_count || 0),
    completed_deals: Number(row?.completed_deals || 0),
  };
}

function sanitizeUser(user: DbUser) {
  const { password_hash: _ignored, ...safe } = user;
  const stats = getUserTrustStats(user.id);
  return {
    ...safe,
    ...stats,
  };
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const k = part.slice(0, idx).trim();
      const v = decodeURIComponent(part.slice(idx + 1).trim());
      result[k] = v;
    }
  }
  return result;
}

function createSession(userId: number): string {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + 14 * 24 * 3600 * 1000);
  db.prepare(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).run(token, userId, now.toISOString(), expires.toISOString());
  return token;
}

function getTokenFromRequest(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.talepagi_session) {
    return cookies.talepagi_session;
  }
  if (typeof req.query.token === 'string' && req.query.token) {
    return req.query.token;
  }
  return null;
}

function attachUser(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const token = getTokenFromRequest(req);
  if (!token) {
    next();
    return;
  }
  const session = db
    .prepare('SELECT token, user_id, expires_at FROM sessions WHERE token = ?')
    .get(token) as { token: string; user_id: number; expires_at: string } | undefined;

  if (!session || new Date(session.expires_at).getTime() < Date.now()) {
    if (session) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }
    next();
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) as
    | DbUser
    | undefined;
  if (user) {
    req.user = user;
    req.sessionToken = token;
  }
  next();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
    return;
  }
  next();
}

function requireApproved(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
    return;
  }
  if (req.user.status !== 'approved' && req.user.role !== 'admin') {
    res.status(403).json({
      error: 'MYK belgeniz henüz ön onaydan geçmediği için alıcı taleplerine erişemezsiniz.',
      status: req.user.status,
    });
    return;
  }
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Bu işlem için Süper Yönetici yetkisi gerekir.' });
    return;
  }
  next();
}

function getAppSettings(): {
  platform_announcement: string;
  auto_approve_myk: boolean;
  allow_registrations: boolean;
  support_phone: string;
} {
  const rows = db.prepare('SELECT key, value FROM app_settings').all() as Array<{
    key: string;
    value: string;
  }>;
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    platform_announcement: map.get('platform_announcement') || '',
    auto_approve_myk: map.get('auto_approve_myk') === 'true',
    allow_registrations: map.get('allow_registrations') !== 'false',
    support_phone: map.get('support_phone') || '0850 300 00 00',
  };
}

function logAdminAction(
  admin: DbUser,
  action: string,
  targetType: string,
  targetId: string | number,
  details: string
): void {
  db.prepare(
    `INSERT INTO admin_audit_logs (admin_id, admin_name, action, target_type, target_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    admin.id,
    admin.full_name,
    action,
    targetType,
    String(targetId),
    details,
    new Date().toISOString()
  );
}

app.use(attachUser);

const mykAndAvatarStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    cb(null, file.fieldname === 'avatar' ? AVATARS_DIR : UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const prefix = file.fieldname === 'avatar' ? 'avatar' : 'myk';
    const unique = `${prefix}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, unique);
  },
});

const uploadRegFiles = multer({
  storage: mykAndAvatarStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'avatar') {
      const allowedImg = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (allowedImg.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Profil fotoğrafı yalnızca PNG, JPG veya WEBP olabilir.'));
      }
      return;
    }
    const allowedDoc = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/svg+xml',
    ];
    if (allowedDoc.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Yalnızca PDF, PNG, JPG veya WEBP formatında MYK belgesi yükleyebilirsiniz.'));
    }
  },
});

// Health endpoint
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, database: 'sqlite', brand: 'alicisepeti' });
});

// Turkey All 81 Provinces, All 973 Districts & All Neighborhoods API (Backed by local dataset + turkiyeapi.dev + SQLite cache)
app.get('/api/locations/provinces', (_req, res) => {
  const provinces = ALL_TURKEY_PROVINCES.map((p) => p.name);
  res.json({ provinces });
});

app.get('/api/locations/districts', (req, res) => {
  const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
  if (!city) {
    res.json({ districts: [] });
    return;
  }
  const found = ALL_TURKEY_PROVINCES.find(
    (p) => p.name.toLocaleLowerCase('tr-TR') === city.toLocaleLowerCase('tr-TR')
  );
  if (found) {
    res.json({ districts: found.districts.map((d) => d.name) });
    return;
  }
  const fallback = TURKEY_LOCATION_TREE[city] ? Object.keys(TURKEY_LOCATION_TREE[city]) : ['Merkez'];
  res.json({ districts: fallback });
});

app.get('/api/locations/neighborhoods', async (req, res) => {
  const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
  const district = typeof req.query.district === 'string' ? req.query.district.trim() : '';
  if (!city || !district) {
    res.json({ neighborhoods: [] });
    return;
  }

  // 1. Check SQLite cache first
  const cached = db
    .prepare('SELECT neighborhoods_json FROM location_neighborhoods_cache WHERE city = ? AND district = ?')
    .get(city, district) as { neighborhoods_json: string } | undefined;

  if (cached) {
    try {
      const parsed = JSON.parse(cached.neighborhoods_json) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        res.json({ neighborhoods: parsed, source: 'cache' });
        return;
      }
    } catch {
      // ignore corrupted cache
    }
  }

  // 2. Lookup district ID from ALL_TURKEY_PROVINCES and fetch from turkiyeapi.dev
  const province = ALL_TURKEY_PROVINCES.find(
    (p) => p.name.toLocaleLowerCase('tr-TR') === city.toLocaleLowerCase('tr-TR')
  );
  const distEntry = province?.districts.find(
    (d) => d.name.toLocaleLowerCase('tr-TR') === district.toLocaleLowerCase('tr-TR')
  );

  if (distEntry) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const apiRes = await fetch(`https://turkiyeapi.dev/api/v1/districts/${distEntry.id}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (apiRes.ok) {
        const json = (await apiRes.json()) as {
          data?: { neighborhoods?: Array<{ name: string }> };
        };
        const list = (json.data?.neighborhoods || [])
          .map((n) => n.name.trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, 'tr-TR'));
        if (list.length > 0) {
          db.prepare(
            `INSERT OR REPLACE INTO location_neighborhoods_cache (city, district, neighborhoods_json, updated_at)
             VALUES (?, ?, ?, ?)`
          ).run(city, district, JSON.stringify(list), new Date().toISOString());
          res.json({ neighborhoods: list, source: 'turkiyeapi' });
          return;
        }
      }
    } catch {
      // Fallback gracefully below
    }
  }

  const fallback = TURKEY_LOCATION_TREE[city]?.[district] || [];
  res.json({ neighborhoods: fallback, source: 'fallback' });
});

// Safe anonymized summary for landing page
app.get('/api/public/summary', (_req, res) => {
  const approvedAgents = (
    db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'approved' AND role = 'agent'").get() as {
      c: number;
    }
  ).c;
  const activeRequests = (
    db.prepare("SELECT COUNT(*) as c FROM buyer_requests WHERE status = 'active'").get() as {
      c: number;
    }
  ).c;
  const totalMatches = (
    db.prepare('SELECT COUNT(*) as c FROM contact_matches').get() as { c: number }
  ).c;

  const topCities = db
    .prepare(
      "SELECT city, COUNT(*) as count FROM buyer_requests WHERE status = 'active' GROUP BY city ORDER BY count DESC LIMIT 5"
    )
    .all() as { city: string; count: number }[];

  const recentPreview = db
    .prepare(
      `SELECT id, title, transaction_type, property_type, city, district, neighborhood,
              budget_min, budget_max, room_count, min_sqm, created_at
       FROM buyer_requests
       WHERE status = 'active'
       ORDER BY created_at DESC
       LIMIT 4`
    )
    .all();

  res.json({
    totalApprovedAgents: approvedAgents,
    totalActiveRequests: activeRequests,
    totalMatches,
    topCities,
    recentPreview,
  });
});

// Live platform config (announcement banner & registration toggle)
app.get('/api/public/config', (_req, res) => {
  const settings = getAppSettings();
  res.json({
    platform_announcement: settings.platform_announcement,
    allow_registrations: settings.allow_registrations,
    support_phone: settings.support_phone,
  });
});

// Register new agent with MYK document upload (MYK number optional!) and optional avatar photo
app.post('/api/auth/register', (req: AuthedRequest, res: Response) => {
  const settings = getAppSettings();
  if (!settings.allow_registrations) {
    res.status(403).json({
      error: 'Yeni emlakçı kayıtları geçici olarak yönetici tarafından durdurulmuştur.',
    });
    return;
  }

  uploadRegFiles.fields([
    { name: 'myk_document', maxCount: 1 },
    { name: 'avatar', maxCount: 1 },
  ])(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message || 'Dosya yüklenirken hata oluştu.' });
      return;
    }

    const files = (req.files || {}) as Record<string, Express.Multer.File[]>;
    const mykFile = files.myk_document?.[0];
    const avatarFile = files.avatar?.[0];

    const {
      full_name = '',
      email = '',
      phone = '',
      password = '',
      office_name = '',
      city = '',
      district = '',
      myk_number = '',
      ttbs_number = '',
      bio = '',
    } = req.body as Record<string, string>;

    if (!full_name.trim() || full_name.trim().length < 3) {
      res.status(400).json({ error: 'Ad Soyad en az 3 karakter olmalıdır.' });
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      res.status(400).json({ error: 'Geçerli bir e-posta adresi girin.' });
      return;
    }
    if (!isValidTurkishPhone(phone)) {
      res.status(400).json({ error: 'Geçerli bir cep telefonu numarası girin (05XX XXX XX XX).' });
      return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır.' });
      return;
    }
    if (!office_name.trim()) {
      res.status(400).json({ error: 'Emlak ofisi / işletme adı zorunludur.' });
      return;
    }
    if (!city.trim()) {
      res.status(400).json({ error: 'Faaliyet gösterdiğiniz ili seçin.' });
      return;
    }
    if (!mykFile) {
      if (avatarFile) fs.unlink(avatarFile.path, () => {});
      res.status(400).json({
        error: 'MYK belgenizi (PDF, JPG veya PNG) yüklemeniz zorunludur.',
      });
      return;
    }

    const formattedPhone = formatTurkishPhone(phone);
    const normalizedEmail = email.trim().toLowerCase();

    const existing = db
      .prepare('SELECT id FROM users WHERE LOWER(email) = ? OR phone = ?')
      .get(normalizedEmail, formattedPhone);
    if (existing) {
      fs.unlink(mykFile.path, () => {});
      if (avatarFile) fs.unlink(avatarFile.path, () => {});
      res.status(409).json({
        error: 'Bu e-posta adresi veya telefon numarası ile kayıtlı bir emlak danışmanı zaten mevcut.',
      });
      return;
    }

    const now = new Date().toISOString();
    const docUrl = `/api/uploads/${mykFile.filename}`;
    const avatarUrl = avatarFile ? `/api/avatars/${avatarFile.filename}` : '';
    const cleanedMykNo = myk_number.trim() ? myk_number.trim().toUpperCase() : 'Belge Yüklendi';
    const initialStatus = settings.auto_approve_myk ? 'approved' : 'pending';
    const initialApprovedAt = settings.auto_approve_myk ? now : null;

    const result = db
      .prepare(
        `INSERT INTO users (
          full_name, email, phone, password_hash, office_name, city, district,
          myk_number, ttbs_number, myk_doc_path, myk_doc_name, myk_doc_mime, avatar_path,
          role, status, rejection_reason, bio, created_at, approved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'agent', ?, '', ?, ?, ?)`
      )
      .run(
        full_name.trim(),
        normalizedEmail,
        formattedPhone,
        hashPassword(password),
        office_name.trim(),
        city.trim(),
        district.trim(),
        cleanedMykNo,
        ttbs_number.trim(),
        docUrl,
        mykFile.originalname,
        mykFile.mimetype,
        avatarUrl,
        initialStatus,
        bio.trim(),
        now,
        initialApprovedAt
      );

    const newUser = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(result.lastInsertRowid) as DbUser;

    const token = createSession(newUser.id);
    res.cookie('talepagi_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 14 * 24 * 3600 * 1000,
    });
    res.status(201).json({
      token,
      user: sanitizeUser(newUser),
    });
  });
});

// Login via email or phone
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { identifier = '', password = '' } = req.body as {
    identifier?: string;
    password?: string;
  };
  const trimmed = identifier.trim();
  if (!trimmed || !password) {
    res.status(400).json({ error: 'E-posta/telefon ve şifre zorunludur.' });
    return;
  }

  const formattedPhone = isValidTurkishPhone(trimmed) ? formatTurkishPhone(trimmed) : '';
  const user = db
    .prepare('SELECT * FROM users WHERE LOWER(email) = ? OR phone = ?')
    .get(trimmed.toLowerCase(), formattedPhone || trimmed) as DbUser | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'E-posta/telefon veya şifre hatalı.' });
    return;
  }

  const token = createSession(user.id);
  res.cookie('talepagi_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 14 * 24 * 3600 * 1000,
  });
  res.json({
    token,
    user: sanitizeUser(user),
  });
});

app.post('/api/auth/logout', (req: AuthedRequest, res: Response) => {
  if (req.sessionToken) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(req.sessionToken);
  }
  res.clearCookie('talepagi_session');
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res: Response) => {
  res.json({ user: sanitizeUser(req.user!) });
});

app.patch('/api/auth/profile', requireAuth, (req: AuthedRequest, res: Response) => {
  const { phone, office_name, city, district, bio, ttbs_number } = req.body as Record<
    string,
    string
  >;

  if (phone && !isValidTurkishPhone(phone)) {
    res.status(400).json({ error: 'Geçerli bir cep telefonu numarası girin (05XX XXX XX XX).' });
    return;
  }

  const nextPhone = phone ? formatTurkishPhone(phone) : req.user!.phone;
  const conflict = db
    .prepare('SELECT id FROM users WHERE phone = ? AND id != ?')
    .get(nextPhone, req.user!.id);
  if (conflict) {
    res.status(409).json({ error: 'Bu telefon numarası başka bir kullanıcı tarafından kullanılıyor.' });
    return;
  }

  db.prepare(
    `UPDATE users
     SET phone = ?, office_name = ?, city = ?, district = ?, bio = ?, ttbs_number = ?
     WHERE id = ?`
  ).run(
    nextPhone,
    office_name?.trim() || req.user!.office_name,
    city?.trim() || req.user!.city,
    district !== undefined ? district.trim() : req.user!.district,
    bio !== undefined ? bio.trim() : req.user!.bio,
    ttbs_number !== undefined ? ttbs_number.trim() : req.user!.ttbs_number,
    req.user!.id
  );

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as DbUser;
  res.json({ user: sanitizeUser(updated) });
});

// Upload / update agent profile photo
app.post('/api/auth/avatar', requireAuth, (req: AuthedRequest, res: Response) => {
  uploadRegFiles.single('avatar')(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message || 'Fotoğraf yüklenemedi.' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'Lütfen bir profil fotoğrafı seçin.' });
      return;
    }
    const avatarUrl = `/api/avatars/${req.file.filename}`;
    db.prepare('UPDATE users SET avatar_path = ? WHERE id = ?').run(avatarUrl, req.user!.id);
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as DbUser;
    res.json({ user: sanitizeUser(updated) });
  });
});

// Serve agent profile photos
app.get('/api/avatars/:filename', (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename);
  const fullPath = path.join(AVATARS_DIR, filename);
  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: 'Fotoğraf bulunamadı.' });
    return;
  }
  res.sendFile(fullPath);
});

// Re-upload MYK document when rejected or pending (file alone is sufficient)
app.post('/api/auth/reupload-myk', requireAuth, (req: AuthedRequest, res: Response) => {
  uploadRegFiles.single('myk_document')(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message || 'Belge yüklenemedi.' });
      return;
    }
    const { myk_number = '' } = req.body as { myk_number?: string };
    if (!req.file) {
      res.status(400).json({ error: 'Lütfen yeni MYK belgenizi seçin.' });
      return;
    }

    const docUrl = `/api/uploads/${req.file.filename}`;
    const cleanedMykNo = myk_number.trim()
      ? myk_number.trim().toUpperCase()
      : req.user!.myk_number || 'Belge Yüklendi';

    db.prepare(
      `UPDATE users
       SET myk_number = ?, myk_doc_path = ?, myk_doc_name = ?, myk_doc_mime = ?,
           status = 'pending', rejection_reason = ''
       WHERE id = ?`
    ).run(
      cleanedMykNo,
      docUrl,
      req.file.originalname,
      req.file.mimetype,
      req.user!.id
    );

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as DbUser;
    res.json({ user: sanitizeUser(updated) });
  });
});

// Serve uploaded MYK document securely (owner or admin)
app.get('/api/uploads/:filename', requireAuth, (req: AuthedRequest, res: Response) => {
  const filename = path.basename(req.params.filename);
  const fullPath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: 'Belge bulunamadı.' });
    return;
  }

  const expectedDocPath = `/api/uploads/${filename}`;
  if (req.user!.role !== 'admin' && req.user!.myk_doc_path !== expectedDocPath) {
    res.status(403).json({ error: 'Bu belgeyi görüntüleme yetkiniz yok.' });
    return;
  }

  res.sendFile(fullPath);
});

// Buyer Requests listing (approved agents & admins only)
app.get('/api/requests', requireApproved, (req: AuthedRequest, res: Response) => {
  const onlyMine = req.query.only_mine === '1' || req.query.only_mine === 'true';
  const statusFilter = typeof req.query.status === 'string' ? req.query.status : 'active';

  let sql = `
    SELECT
      br.*,
      u.full_name AS agent_name,
      u.office_name AS agent_office,
      u.city AS agent_city,
      u.myk_number AS agent_myk_number,
      u.avatar_path AS agent_avatar,
      COALESCE((SELECT ROUND(AVG(ar.rating), 1) FROM agent_reviews ar WHERE ar.target_agent_id = u.id), 0) AS agent_rating_avg,
      (SELECT COUNT(*) FROM agent_reviews ar WHERE ar.target_agent_id = u.id) AS agent_review_count,
      (SELECT COALESCE(SUM(CASE WHEN ar.deal_closed = 1 THEN 1 ELSE 0 END), 0) FROM agent_reviews ar WHERE ar.target_agent_id = u.id) AS agent_completed_deals,
      (SELECT COUNT(*) FROM contact_matches cm WHERE cm.request_id = br.id) AS match_count,
      (SELECT COUNT(*) FROM contact_matches cm WHERE cm.request_id = br.id AND cm.sender_agent_id = ?) AS already_contacted
    FROM buyer_requests br
    JOIN users u ON u.id = br.agent_id
    WHERE 1=1
  `;
  const params: (string | number)[] = [req.user!.id];

  if (onlyMine) {
    sql += ' AND br.agent_id = ?';
    params.push(req.user!.id);
  } else if (statusFilter && statusFilter !== 'all') {
    sql += ' AND br.status = ?';
    params.push(statusFilter);
  }

  sql += ' ORDER BY br.created_at DESC';

  const rows = db.prepare(sql).all(...params) as Array<
    Record<string, unknown> & {
      features_json: string;
      credit_suitable: number;
      already_contacted: number;
    }
  >;

  const formatted = rows.map((row) => ({
    ...row,
    credit_suitable: Boolean(row.credit_suitable),
    already_contacted: Boolean(row.already_contacted),
    features: (() => {
      try {
        return JSON.parse(row.features_json || '[]');
      } catch {
        return [];
      }
    })(),
  }));

  res.json({ requests: formatted });
});

// Single buyer request detail + matches
app.get('/api/requests/:id', requireApproved, (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const row = db
    .prepare(
      `SELECT
        br.*,
        u.full_name AS agent_name,
        u.office_name AS agent_office,
        u.city AS agent_city,
        u.myk_number AS agent_myk_number,
        u.avatar_path AS agent_avatar,
        COALESCE((SELECT ROUND(AVG(ar.rating), 1) FROM agent_reviews ar WHERE ar.target_agent_id = u.id), 0) AS agent_rating_avg,
        (SELECT COUNT(*) FROM agent_reviews ar WHERE ar.target_agent_id = u.id) AS agent_review_count,
        (SELECT COALESCE(SUM(CASE WHEN ar.deal_closed = 1 THEN 1 ELSE 0 END), 0) FROM agent_reviews ar WHERE ar.target_agent_id = u.id) AS agent_completed_deals,
        (SELECT rating FROM agent_reviews ar WHERE ar.request_id = br.id AND ar.reviewer_agent_id = ? AND ar.target_agent_id = br.agent_id LIMIT 1) AS my_review_for_owner,
        (SELECT COUNT(*) FROM contact_matches cm WHERE cm.request_id = br.id) AS match_count,
        (SELECT COUNT(*) FROM contact_matches cm WHERE cm.request_id = br.id AND cm.sender_agent_id = ?) AS already_contacted
      FROM buyer_requests br
      JOIN users u ON u.id = br.agent_id
      WHERE br.id = ?`
    )
    .get(req.user!.id, req.user!.id, id) as
    | (Record<string, unknown> & {
        agent_id: number;
        features_json: string;
        credit_suitable: number;
        already_contacted: number;
        my_review_for_owner: number | null;
      })
    | undefined;

  if (!row) {
    res.status(404).json({ error: 'Alıcı talebi bulunamadı.' });
    return;
  }

  const isOwnerOrAdmin = row.agent_id === req.user!.id || req.user!.role === 'admin';
  const matches = isOwnerOrAdmin
    ? db
        .prepare(
          `SELECT cm.*, u.full_name AS sender_name, u.office_name AS sender_office,
                  u.city AS sender_city, u.myk_number AS sender_myk_number,
                  u.avatar_path AS sender_avatar,
                  COALESCE((SELECT ROUND(AVG(ar.rating), 1) FROM agent_reviews ar WHERE ar.target_agent_id = u.id), 0) AS sender_rating_avg,
                  (SELECT COUNT(*) FROM agent_reviews ar WHERE ar.target_agent_id = u.id) AS sender_review_count,
                  (SELECT COALESCE(SUM(CASE WHEN ar.deal_closed = 1 THEN 1 ELSE 0 END), 0) FROM agent_reviews ar WHERE ar.target_agent_id = u.id) AS sender_completed_deals,
                  (SELECT ar.rating FROM agent_reviews ar WHERE ar.request_id = cm.request_id AND ar.reviewer_agent_id = ? AND ar.target_agent_id = cm.sender_agent_id LIMIT 1) AS my_given_rating
           FROM contact_matches cm
           JOIN users u ON u.id = cm.sender_agent_id
           WHERE cm.request_id = ?
           ORDER BY cm.created_at DESC`
        )
        .all(req.user!.id, id)
    : db
        .prepare(
          `SELECT cm.*, u.full_name AS sender_name, u.office_name AS sender_office,
                  u.city AS sender_city, u.myk_number AS sender_myk_number,
                  u.avatar_path AS sender_avatar,
                  COALESCE((SELECT ROUND(AVG(ar.rating), 1) FROM agent_reviews ar WHERE ar.target_agent_id = u.id), 0) AS sender_rating_avg,
                  (SELECT COUNT(*) FROM agent_reviews ar WHERE ar.target_agent_id = u.id) AS sender_review_count,
                  (SELECT COALESCE(SUM(CASE WHEN ar.deal_closed = 1 THEN 1 ELSE 0 END), 0) FROM agent_reviews ar WHERE ar.target_agent_id = u.id) AS sender_completed_deals,
                  NULL AS my_given_rating
           FROM contact_matches cm
           JOIN users u ON u.id = cm.sender_agent_id
           WHERE cm.request_id = ? AND cm.sender_agent_id = ?
           ORDER BY cm.created_at DESC`
        )
        .all(id, req.user!.id);

  res.json({
    request: {
      ...row,
      credit_suitable: Boolean(row.credit_suitable),
      already_contacted: Boolean(row.already_contacted),
      owner_reviewed_by_me: row.my_review_for_owner !== null && row.my_review_for_owner !== undefined,
      features: JSON.parse(row.features_json || '[]'),
    },
    matches,
  });
});

// Create a new buyer request
app.post('/api/requests', requireApproved, (req: AuthedRequest, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const transaction_type = String(body.transaction_type || 'Satılık');
  const property_type = String(body.property_type || 'Daire');
  const city = String(body.city || '').trim();
  const district = String(body.district || '').trim();
  const neighborhood = String(body.neighborhood || '').trim();
  const budget_min = Number(body.budget_min || 0);
  const budget_max = Number(body.budget_max || 0);
  const room_count = String(body.room_count || '3+1').trim();
  const min_sqm = Number(body.min_sqm || 0);
  const building_age = String(body.building_age || 'Fark Etmez').trim();
  const floor_pref = String(body.floor_pref || 'Fark Etmez').trim();
  const credit_suitable = body.credit_suitable !== false;
  const features = Array.isArray(body.features)
    ? body.features.map((f) => String(f))
    : [];
  const buyer_note = String(body.buyer_note || '').trim();
  const contact_phone = String(body.contact_phone || req.user!.phone).trim();
  const rawTitle = String(body.title || '').trim();
  const title =
    rawTitle ||
    `${district} ${neighborhood} ${transaction_type} ${room_count} ${property_type}`;

  const errors = validateBuyerRequestInput({
    title,
    transaction_type,
    property_type,
    city,
    district,
    neighborhood,
    budget_min,
    budget_max,
    room_count,
    min_sqm,
    buyer_note,
    contact_phone,
  });

  if (Object.keys(errors).length > 0) {
    const firstMsg = Object.values(errors)[0];
    res.status(400).json({ error: firstMsg, errors });
    return;
  }

  const now = new Date().toISOString();
  const formattedPhone = formatTurkishPhone(contact_phone);

  const insertRes = db
    .prepare(
      `INSERT INTO buyer_requests (
        agent_id, title, transaction_type, property_type,
        city, district, neighborhood, budget_min, budget_max,
        room_count, min_sqm, building_age, floor_pref, credit_suitable,
        features_json, buyer_note, contact_phone, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
    )
    .run(
      req.user!.id,
      title,
      transaction_type,
      property_type,
      city,
      district,
      neighborhood,
      budget_min,
      budget_max,
      room_count,
      min_sqm,
      building_age,
      floor_pref,
      credit_suitable ? 1 : 0,
      JSON.stringify(features),
      buyer_note,
      formattedPhone,
      now,
      now
    );

  const created = db
    .prepare(
      `SELECT br.*, u.full_name AS agent_name, u.office_name AS agent_office,
              u.city AS agent_city, u.myk_number AS agent_myk_number,
              u.avatar_path AS agent_avatar
       FROM buyer_requests br
       JOIN users u ON u.id = br.agent_id
       WHERE br.id = ?`
    )
    .get(insertRes.lastInsertRowid) as Record<string, unknown> & {
    features_json: string;
    credit_suitable: number;
  };

  res.status(201).json({
    request: {
      ...created,
      credit_suitable: Boolean(created.credit_suitable),
      features: JSON.parse(created.features_json || '[]'),
      match_count: 0,
      already_contacted: false,
    },
  });
});

// Update buyer request status or details
app.patch('/api/requests/:id', requireApproved, (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM buyer_requests WHERE id = ?').get(id) as
    | (Record<string, unknown> & { agent_id: number; status: string })
    | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Alıcı talebi bulunamadı.' });
    return;
  }
  if (existing.agent_id !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Yalnızca kendi alıcı talebinizi güncelleyebilirsiniz.' });
    return;
  }

  const { status, buyer_note, budget_min, budget_max } = req.body as {
    status?: string;
    buyer_note?: string;
    budget_min?: number;
    budget_max?: number;
  };

  const allowedStatuses = ['active', 'matched', 'closed'];
  const nextStatus =
    status && allowedStatuses.includes(status) ? status : existing.status;

  db.prepare(
    `UPDATE buyer_requests
     SET status = ?,
         buyer_note = COALESCE(?, buyer_note),
         budget_min = COALESCE(?, budget_min),
         budget_max = COALESCE(?, budget_max),
         updated_at = ?
     WHERE id = ?`
  ).run(
    nextStatus,
    buyer_note !== undefined ? buyer_note.trim() : null,
    budget_min !== undefined ? Number(budget_min) : null,
    budget_max !== undefined ? Number(budget_max) : null,
    new Date().toISOString(),
    id
  );

  const updated = db.prepare('SELECT * FROM buyer_requests WHERE id = ?').get(id);
  res.json({ request: updated });
});

app.delete('/api/requests/:id', requireApproved, (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id, agent_id FROM buyer_requests WHERE id = ?').get(id) as
    | { id: number; agent_id: number }
    | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Alıcı talebi bulunamadı.' });
    return;
  }
  if (existing.agent_id !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Yalnızca kendi alıcı talebinizi silebilirsiniz.' });
    return;
  }

  db.prepare('DELETE FROM buyer_requests WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Log a portfolio match & phone contact intent
app.post('/api/requests/:id/matches', requireApproved, (req: AuthedRequest, res: Response) => {
  const requestId = Number(req.params.id);
  const target = db
    .prepare('SELECT id, agent_id, contact_phone FROM buyer_requests WHERE id = ?')
    .get(requestId) as { id: number; agent_id: number; contact_phone: string } | undefined;

  if (!target) {
    res.status(404).json({ error: 'Alıcı talebi bulunamadı.' });
    return;
  }

  const { message = '', portfolio_ref = '' } = req.body as {
    message?: string;
    portfolio_ref?: string;
  };
  if (!message.trim() || message.trim().length < 8) {
    res.status(400).json({
      error: 'Meslektaşınıza portföyünüzle ilgili kısa bir bilgi notu yazın (en az 8 karakter).',
    });
    return;
  }

  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO contact_matches (
        request_id, sender_agent_id, message, portfolio_ref, sender_phone, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      requestId,
      req.user!.id,
      message.trim(),
      portfolio_ref.trim(),
      req.user!.phone,
      now
    );

  const match = db
    .prepare(
      `SELECT cm.*, u.full_name AS sender_name, u.office_name AS sender_office,
              u.city AS sender_city, u.myk_number AS sender_myk_number,
              u.avatar_path AS sender_avatar
       FROM contact_matches cm
       JOIN users u ON u.id = cm.sender_agent_id
       WHERE cm.id = ?`
    )
    .get(result.lastInsertRowid);

  res.status(201).json({
    match,
    target_phone: target.contact_phone,
  });
});

// Get incoming and outgoing matches for the current agent
app.get('/api/my-matches', requireApproved, (req: AuthedRequest, res: Response) => {
  const incoming = db
    .prepare(
      `SELECT cm.*,
              u.full_name AS sender_name, u.office_name AS sender_office,
              u.city AS sender_city, u.myk_number AS sender_myk_number,
              u.avatar_path AS sender_avatar,
              COALESCE((SELECT ROUND(AVG(ar.rating), 1) FROM agent_reviews ar WHERE ar.target_agent_id = u.id), 0) AS sender_rating_avg,
              (SELECT COUNT(*) FROM agent_reviews ar WHERE ar.target_agent_id = u.id) AS sender_review_count,
              (SELECT COALESCE(SUM(CASE WHEN ar.deal_closed = 1 THEN 1 ELSE 0 END), 0) FROM agent_reviews ar WHERE ar.target_agent_id = u.id) AS sender_completed_deals,
              br.title AS request_title, br.city AS request_city,
              br.district AS request_district, br.neighborhood AS request_neighborhood,
              br.budget_max AS request_budget_max, br.status AS request_status, br.agent_id AS request_agent_id,
              (SELECT ar.rating FROM agent_reviews ar WHERE ar.request_id = cm.request_id AND ar.reviewer_agent_id = ? AND ar.target_agent_id = cm.sender_agent_id LIMIT 1) AS my_given_rating
       FROM contact_matches cm
       JOIN buyer_requests br ON br.id = cm.request_id
       JOIN users u ON u.id = cm.sender_agent_id
       WHERE br.agent_id = ?
       ORDER BY cm.created_at DESC`
    )
    .all(req.user!.id, req.user!.id);

  const outgoing = db
    .prepare(
      `SELECT cm.*,
              br.title AS request_title, br.city AS request_city,
              br.district AS request_district, br.neighborhood AS request_neighborhood,
              br.budget_max AS request_budget_max, br.status AS request_status,
              br.agent_id AS request_agent_id, br.contact_phone AS request_agent_phone,
              owner.full_name AS request_agent_name, owner.office_name AS sender_office,
              owner.avatar_path AS sender_avatar,
              COALESCE((SELECT ROUND(AVG(ar.rating), 1) FROM agent_reviews ar WHERE ar.target_agent_id = owner.id), 0) AS request_agent_rating_avg,
              (SELECT COUNT(*) FROM agent_reviews ar WHERE ar.target_agent_id = owner.id) AS request_agent_review_count,
              (SELECT COALESCE(SUM(CASE WHEN ar.deal_closed = 1 THEN 1 ELSE 0 END), 0) FROM agent_reviews ar WHERE ar.target_agent_id = owner.id) AS request_agent_completed_deals,
              (SELECT ar.rating FROM agent_reviews ar WHERE ar.request_id = cm.request_id AND ar.reviewer_agent_id = ? AND ar.target_agent_id = br.agent_id LIMIT 1) AS my_given_rating
       FROM contact_matches cm
       JOIN buyer_requests br ON br.id = cm.request_id
       JOIN users owner ON owner.id = br.agent_id
       WHERE cm.sender_agent_id = ?
       ORDER BY cm.created_at DESC`
    )
    .all(req.user!.id, req.user!.id);

  res.json({ incoming, outgoing });
});

// Trust Score & Reviews Endpoints
app.post('/api/reviews', requireApproved, (req: AuthedRequest, res: Response) => {
  const b = req.body as {
    request_id?: number;
    target_agent_id?: number;
    rating?: number;
    comment?: string;
    deal_closed?: boolean;
  };
  const requestId = Number(b.request_id);
  const targetAgentId = Number(b.target_agent_id);
  const rating = Number(b.rating);
  const comment = String(b.comment || '').trim();
  const dealClosed = b.deal_closed !== false;

  if (!Number.isInteger(requestId) || requestId <= 0 || !Number.isInteger(targetAgentId) || targetAgentId <= 0) {
    res.status(400).json({ error: 'Geçersiz talep veya danışman seçimi.' });
    return;
  }
  if (targetAgentId === req.user!.id) {
    res.status(400).json({ error: 'Kendinize güven puanı veremezsiniz.' });
    return;
  }

  const validationErr = validateReviewInput({ rating, comment });
  if (validationErr) {
    res.status(400).json({ error: validationErr });
    return;
  }

  const targetReq = db
    .prepare('SELECT id, agent_id, status FROM buyer_requests WHERE id = ?')
    .get(requestId) as { id: number; agent_id: number; status: string } | undefined;

  if (!targetReq) {
    res.status(404).json({ error: 'İlgili alıcı talebi bulunamadı.' });
    return;
  }
  if (targetReq.status !== 'matched' && targetReq.status !== 'closed') {
    res.status(400).json({
      error: "Yalnızca 'Eşleşti' veya 'Kapatıldı' durumundaki tamamlanan işlemler değerlendirilebilir.",
    });
    return;
  }

  // Verify legitimate collaboration link between reviewer and target agent on this request
  let validCollab = false;
  if (targetReq.agent_id === req.user!.id) {
    const match = db
      .prepare('SELECT id FROM contact_matches WHERE request_id = ? AND sender_agent_id = ?')
      .get(requestId, targetAgentId);
    validCollab = Boolean(match);
  } else if (targetReq.agent_id === targetAgentId) {
    const match = db
      .prepare('SELECT id FROM contact_matches WHERE request_id = ? AND sender_agent_id = ?')
      .get(requestId, req.user!.id);
    validCollab = Boolean(match);
  }

  if (!validCollab && req.user!.role !== 'admin') {
    res.status(403).json({
      error: 'Yalnızca bu talep üzerinde eşleşme kurduğunuz danışmanı puanlayabilirsiniz.',
    });
    return;
  }

  const existing = db
    .prepare(
      'SELECT id FROM agent_reviews WHERE request_id = ? AND reviewer_agent_id = ? AND target_agent_id = ?'
    )
    .get(requestId, req.user!.id, targetAgentId);
  if (existing) {
    res.status(409).json({ error: 'Bu işlem için bu danışmana zaten değerlendirme bıraktınız.' });
    return;
  }

  const now = new Date().toISOString();
  const insertRes = db
    .prepare(
      `INSERT INTO agent_reviews (
        request_id, reviewer_agent_id, target_agent_id, rating, comment, deal_closed, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(requestId, req.user!.id, targetAgentId, rating, comment, dealClosed ? 1 : 0, now);

  const created = db
    .prepare(
      `SELECT ar.*,
              rev.full_name AS reviewer_name, rev.office_name AS reviewer_office, rev.avatar_path AS reviewer_avatar,
              tgt.full_name AS target_name, tgt.office_name AS target_office, tgt.avatar_path AS target_avatar,
              br.title AS request_title, br.city AS request_city, br.district AS request_district
       FROM agent_reviews ar
       JOIN users rev ON rev.id = ar.reviewer_agent_id
       JOIN users tgt ON tgt.id = ar.target_agent_id
       JOIN buyer_requests br ON br.id = ar.request_id
       WHERE ar.id = ?`
    )
    .get(insertRes.lastInsertRowid) as Record<string, unknown> & { deal_closed: number };

  const stats = getUserTrustStats(targetAgentId);
  const summary = computeTrustSummary(stats.rating_avg, stats.review_count, stats.completed_deals);

  res.status(201).json({
    review: {
      ...created,
      deal_closed: Boolean(created.deal_closed),
    },
    target_summary: summary,
  });
});

app.get('/api/agents/:id/reviews', requireApproved, (req: AuthedRequest, res: Response) => {
  const agentId = Number(req.params.id);
  const agent = db
    .prepare(
      'SELECT id, full_name, office_name, city, district, avatar_path, myk_number FROM users WHERE id = ?'
    )
    .get(agentId) as Record<string, unknown> | undefined;

  if (!agent) {
    res.status(404).json({ error: 'Danışman bulunamadı.' });
    return;
  }

  const stats = getUserTrustStats(agentId);
  const summary = computeTrustSummary(stats.rating_avg, stats.review_count, stats.completed_deals);

  const rows = db
    .prepare(
      `SELECT ar.*,
              rev.full_name AS reviewer_name, rev.office_name AS reviewer_office, rev.avatar_path AS reviewer_avatar,
              br.title AS request_title, br.city AS request_city, br.district AS request_district
       FROM agent_reviews ar
       JOIN users rev ON rev.id = ar.reviewer_agent_id
       JOIN buyer_requests br ON br.id = ar.request_id
       WHERE ar.target_agent_id = ?
       ORDER BY ar.created_at DESC`
    )
    .all(agentId) as Array<Record<string, unknown> & { deal_closed: number }>;

  res.json({
    agent,
    summary,
    reviews: rows.map((r) => ({ ...r, deal_closed: Boolean(r.deal_closed) })),
  });
});

app.get('/api/my-reviews', requireApproved, (req: AuthedRequest, res: Response) => {
  const stats = getUserTrustStats(req.user!.id);
  const summary = computeTrustSummary(stats.rating_avg, stats.review_count, stats.completed_deals);

  const received = (
    db
      .prepare(
        `SELECT ar.*,
                rev.full_name AS reviewer_name, rev.office_name AS reviewer_office, rev.avatar_path AS reviewer_avatar,
                br.title AS request_title, br.city AS request_city, br.district AS request_district
         FROM agent_reviews ar
         JOIN users rev ON rev.id = ar.reviewer_agent_id
         JOIN buyer_requests br ON br.id = ar.request_id
         WHERE ar.target_agent_id = ?
         ORDER BY ar.created_at DESC`
      )
      .all(req.user!.id) as Array<Record<string, unknown> & { deal_closed: number }>
  ).map((r) => ({ ...r, deal_closed: Boolean(r.deal_closed) }));

  const given = (
    db
      .prepare(
        `SELECT ar.*,
                tgt.full_name AS target_name, tgt.office_name AS target_office, tgt.avatar_path AS target_avatar,
                br.title AS request_title, br.city AS request_city, br.district AS request_district
         FROM agent_reviews ar
         JOIN users tgt ON tgt.id = ar.target_agent_id
         JOIN buyer_requests br ON br.id = ar.request_id
         WHERE ar.reviewer_agent_id = ?
         ORDER BY ar.created_at DESC`
      )
      .all(req.user!.id) as Array<Record<string, unknown> & { deal_closed: number }>
  ).map((r) => ({ ...r, deal_closed: Boolean(r.deal_closed) }));

  res.json({ summary, received, given });
});

// Admin: List agents for MYK verification (legacy compatibility)
app.get('/api/admin/agents', requireAdmin, (req: AuthedRequest, res: Response) => {
  const status = typeof req.query.status === 'string' ? req.query.status : 'all';
  let sql = "SELECT * FROM users WHERE role = 'agent'";
  const params: string[] = [];

  if (status && status !== 'all') {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += " ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END, created_at DESC";

  const users = db.prepare(sql).all(...params) as DbUser[];
  res.json({ agents: users.map(sanitizeUser) });
});

// Admin: Approve or Reject agent MYK application
app.patch('/api/admin/agents/:id/status', requireAdmin, (req: AuthedRequest, res: Response) => {
  const targetId = Number(req.params.id);
  const { status, rejection_reason = '' } = req.body as {
    status?: 'approved' | 'rejected' | 'pending';
    rejection_reason?: string;
  };

  if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
    res.status(400).json({ error: 'Geçersiz onay durumu.' });
    return;
  }
  if (status === 'rejected' && !rejection_reason.trim()) {
    res.status(400).json({ error: 'Reddetme işlemi için açıklayıcı gerekçe yazın.' });
    return;
  }

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as DbUser | undefined;
  if (!target) {
    res.status(404).json({ error: 'Emlak danışmanı bulunamadı.' });
    return;
  }

  const approvedAt = status === 'approved' ? new Date().toISOString() : null;
  db.prepare(
    'UPDATE users SET status = ?, rejection_reason = ?, approved_at = ? WHERE id = ?'
  ).run(status, status === 'rejected' ? rejection_reason.trim() : '', approvedAt, targetId);

  logAdminAction(
    req.user!,
    `MYK Durumu Güncellendi (${status})`,
    'user',
    targetId,
    `${target.full_name} (${target.email})`
  );

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as DbUser;
  res.json({ agent: sanitizeUser(updated) });
});

// ==========================================
// SUPER ADMIN CONTROL CENTER ENDPOINTS
// ==========================================

app.get('/api/admin/overview', requireAdmin, (_req: AuthedRequest, res: Response) => {
  const userCounts = db
    .prepare(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS admins,
        SUM(CASE WHEN role = 'agent' THEN 1 ELSE 0 END) AS agents,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
       FROM users`
    )
    .get() as Record<string, number>;

  const requestCounts = db
    .prepare(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status = 'matched' THEN 1 ELSE 0 END) AS matched,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed,
        SUM(CASE WHEN transaction_type = 'Satılık' THEN 1 ELSE 0 END) AS for_sale,
        SUM(CASE WHEN transaction_type = 'Kiralık' THEN 1 ELSE 0 END) AS for_rent,
        COALESCE(SUM(CASE WHEN transaction_type = 'Satılık' AND status = 'active' THEN budget_max ELSE 0 END), 0) AS active_sale_volume
       FROM buyer_requests`
    )
    .get() as Record<string, number>;

  const totalMatches = (
    db.prepare('SELECT COUNT(*) AS c FROM contact_matches').get() as { c: number }
  ).c;

  const activeSessions = (
    db
      .prepare('SELECT COUNT(*) AS c FROM sessions WHERE expires_at > ?')
      .get(new Date().toISOString()) as { c: number }
  ).c;

  const cachedLocations = (
    db.prepare('SELECT COUNT(*) AS c FROM location_neighborhoods_cache').get() as { c: number }
  ).c;

  const topCities = db
    .prepare(
      `SELECT city, COUNT(*) AS request_count
       FROM buyer_requests
       GROUP BY city
       ORDER BY request_count DESC
       LIMIT 6`
    )
    .all() as Array<{ city: string; request_count: number }>;

  const recentLogs = db
    .prepare('SELECT * FROM admin_audit_logs ORDER BY id DESC LIMIT 12')
    .all();

  res.json({
    users: userCounts,
    requests: requestCounts,
    totalMatches,
    activeSessions,
    cachedLocations,
    topCities,
    recentLogs,
    settings: getAppSettings(),
  });
});

// Super Admin: List ALL users (agents + admins) with request & match stats
app.get('/api/admin/users', requireAdmin, (_req: AuthedRequest, res: Response) => {
  const rows = db
    .prepare(
      `SELECT u.*,
        (SELECT COUNT(*) FROM buyer_requests br WHERE br.agent_id = u.id) AS request_count,
        (SELECT COUNT(*) FROM contact_matches cm WHERE cm.sender_agent_id = u.id) AS match_count
       FROM users u
       ORDER BY CASE u.status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END, u.created_at DESC`
    )
    .all() as Array<DbUser & { request_count: number; match_count: number }>;

  res.json({ users: rows.map(sanitizeUser) });
});

// Super Admin: Create a new agent or admin user directly
app.post('/api/admin/users', requireAdmin, (req: AuthedRequest, res: Response) => {
  const {
    full_name = '',
    email = '',
    phone = '',
    password = '',
    office_name = '',
    city = 'İstanbul',
    district = '',
    myk_number = '',
    ttbs_number = '',
    bio = '',
    role = 'agent',
    status = 'approved',
  } = req.body as Record<string, string>;

  if (!full_name.trim() || full_name.trim().length < 3) {
    res.status(400).json({ error: 'Ad Soyad en az 3 karakter olmalıdır.' });
    return;
  }
  if (!email.trim() || !email.includes('@')) {
    res.status(400).json({ error: 'Geçerli bir e-posta adresi girin.' });
    return;
  }
  if (!isValidTurkishPhone(phone)) {
    res.status(400).json({ error: 'Geçerli bir cep telefonu numarası girin (05XX XXX XX XX).' });
    return;
  }
  if (!password || password.length < 6) {
    res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır.' });
    return;
  }
  if (!office_name.trim()) {
    res.status(400).json({ error: 'Emlak ofisi / kurum adı zorunludur.' });
    return;
  }

  const formattedPhone = formatTurkishPhone(phone);
  const normalizedEmail = email.trim().toLowerCase();
  const conflict = db
    .prepare('SELECT id FROM users WHERE LOWER(email) = ? OR phone = ?')
    .get(normalizedEmail, formattedPhone);
  if (conflict) {
    res.status(409).json({ error: 'Bu e-posta veya telefon numarası zaten kayıtlı.' });
    return;
  }

  const safeRole = role === 'admin' ? 'admin' : 'agent';
  const safeStatus = ['pending', 'approved', 'rejected'].includes(status) ? status : 'approved';
  const now = new Date().toISOString();
  const approvedAt = safeStatus === 'approved' ? now : null;
  const cleanedMyk = myk_number.trim() ? myk_number.trim().toUpperCase() : 'Yönetici Kaydı';

  const result = db
    .prepare(
      `INSERT INTO users (
        full_name, email, phone, password_hash, office_name, city, district,
        myk_number, ttbs_number, myk_doc_path, myk_doc_name, myk_doc_mime, avatar_path,
        role, status, rejection_reason, bio, created_at, approved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, '', ?, ?, ?)`
    )
    .run(
      full_name.trim(),
      normalizedEmail,
      formattedPhone,
      hashPassword(password),
      office_name.trim(),
      city.trim() || 'İstanbul',
      district.trim(),
      cleanedMyk,
      ttbs_number.trim(),
      '/api/uploads/seed-admin-myk.svg',
      'yonetici-olusturdu.svg',
      'image/svg+xml',
      safeRole,
      safeStatus,
      bio.trim(),
      now,
      approvedAt
    );

  const created = db
    .prepare(
      `SELECT u.*, 0 AS request_count, 0 AS match_count FROM users u WHERE u.id = ?`
    )
    .get(result.lastInsertRowid) as DbUser & { request_count: number; match_count: number };

  logAdminAction(
    req.user!,
    `Yeni Kullanıcı Oluşturuldu (${safeRole})`,
    'user',
    created.id,
    `${created.full_name} (${created.email})`
  );

  res.status(201).json({ user: sanitizeUser(created) });
});

// Super Admin: Full update on any user (profile, role, status, password reset)
app.patch('/api/admin/users/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  const targetId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as
    | DbUser
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    return;
  }

  const body = req.body as Record<string, string | undefined>;
  const nextFullName = body.full_name !== undefined ? body.full_name.trim() : existing.full_name;
  const nextEmail = body.email !== undefined ? body.email.trim().toLowerCase() : existing.email;
  const nextPhoneRaw = body.phone !== undefined ? body.phone.trim() : existing.phone;
  const nextOffice = body.office_name !== undefined ? body.office_name.trim() : existing.office_name;
  const nextCity = body.city !== undefined ? body.city.trim() : existing.city;
  const nextDistrict = body.district !== undefined ? body.district.trim() : existing.district;
  const nextMyk = body.myk_number !== undefined ? body.myk_number.trim() : existing.myk_number;
  const nextTtbs = body.ttbs_number !== undefined ? body.ttbs_number.trim() : existing.ttbs_number;
  const nextBio = body.bio !== undefined ? body.bio.trim() : existing.bio;
  const nextRole = body.role === 'admin' || body.role === 'agent' ? body.role : existing.role;
  const nextStatus =
    body.status && ['pending', 'approved', 'rejected'].includes(body.status)
      ? (body.status as 'pending' | 'approved' | 'rejected')
      : existing.status;
  const nextRejectionReason =
    nextStatus === 'rejected'
      ? (body.rejection_reason ?? existing.rejection_reason).trim()
      : '';

  if (targetId === req.user!.id && nextRole !== 'admin') {
    res.status(400).json({ error: 'Kendi Süper Yönetici yetkinizi kaldıramazsınız.' });
    return;
  }
  if (!nextFullName || nextFullName.length < 3) {
    res.status(400).json({ error: 'Ad Soyad en az 3 karakter olmalıdır.' });
    return;
  }
  if (!nextEmail || !nextEmail.includes('@')) {
    res.status(400).json({ error: 'Geçerli bir e-posta adresi girin.' });
    return;
  }
  if (!isValidTurkishPhone(nextPhoneRaw)) {
    res.status(400).json({ error: 'Geçerli bir cep telefonu numarası girin (05XX XXX XX XX).' });
    return;
  }
  if (body.new_password && body.new_password.length < 6) {
    res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalıdır.' });
    return;
  }

  const formattedPhone = formatTurkishPhone(nextPhoneRaw);
  const conflict = db
    .prepare('SELECT id FROM users WHERE (LOWER(email) = ? OR phone = ?) AND id != ?')
    .get(nextEmail, formattedPhone, targetId);
  if (conflict) {
    res.status(409).json({ error: 'Bu e-posta veya telefon başka bir kullanıcıda kayıtlı.' });
    return;
  }

  const nextPasswordHash = body.new_password
    ? hashPassword(body.new_password)
    : existing.password_hash;
  const nextApprovedAt =
    nextStatus === 'approved' ? existing.approved_at || new Date().toISOString() : null;

  db.prepare(
    `UPDATE users SET
      full_name = ?, email = ?, phone = ?, password_hash = ?,
      office_name = ?, city = ?, district = ?, myk_number = ?, ttbs_number = ?,
      bio = ?, role = ?, status = ?, rejection_reason = ?, approved_at = ?
     WHERE id = ?`
  ).run(
    nextFullName,
    nextEmail,
    formattedPhone,
    nextPasswordHash,
    nextOffice,
    nextCity,
    nextDistrict,
    nextMyk,
    nextTtbs,
    nextBio,
    nextRole,
    nextStatus,
    nextRejectionReason,
    nextApprovedAt,
    targetId
  );

  logAdminAction(
    req.user!,
    'Kullanıcı Güncellendi',
    'user',
    targetId,
    `${nextFullName} (${nextRole}, ${nextStatus})${body.new_password ? ' + şifre sıfırlandı' : ''}`
  );

  const updated = db
    .prepare(
      `SELECT u.*,
        (SELECT COUNT(*) FROM buyer_requests br WHERE br.agent_id = u.id) AS request_count,
        (SELECT COUNT(*) FROM contact_matches cm WHERE cm.sender_agent_id = u.id) AS match_count
       FROM users u WHERE u.id = ?`
    )
    .get(targetId) as DbUser & { request_count: number; match_count: number };

  res.json({ user: sanitizeUser(updated) });
});

// Super Admin: Permanently delete a user and cascade their requests/matches/sessions
app.delete('/api/admin/users/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user!.id) {
    res.status(400).json({ error: 'Kendi aktif yönetici hesabınızı silemezsiniz.' });
    return;
  }
  const existing = db.prepare('SELECT id, full_name, email FROM users WHERE id = ?').get(targetId) as
    | { id: number; full_name: string; email: string }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    return;
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
  logAdminAction(
    req.user!,
    'Kullanıcı Silindi',
    'user',
    targetId,
    `${existing.full_name} (${existing.email})`
  );
  res.json({ ok: true });
});

// Super Admin: List ALL buyer requests regardless of status or owner
app.get('/api/admin/requests', requireAdmin, (_req: AuthedRequest, res: Response) => {
  const rows = db
    .prepare(
      `SELECT
        br.*,
        u.full_name AS agent_name,
        u.office_name AS agent_office,
        u.city AS agent_city,
        u.myk_number AS agent_myk_number,
        u.avatar_path AS agent_avatar,
        (SELECT COUNT(*) FROM contact_matches cm WHERE cm.request_id = br.id) AS match_count
       FROM buyer_requests br
       JOIN users u ON u.id = br.agent_id
       ORDER BY br.created_at DESC`
    )
    .all() as Array<
    Record<string, unknown> & {
      features_json: string;
      credit_suitable: number;
    }
  >;

  const formatted = rows.map((row) => ({
    ...row,
    credit_suitable: Boolean(row.credit_suitable),
    features: (() => {
      try {
        return JSON.parse(row.features_json || '[]');
      } catch {
        return [];
      }
    })(),
  }));

  res.json({ requests: formatted });
});

// Super Admin: Full edit on any buyer request
app.patch('/api/admin/requests/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM buyer_requests WHERE id = ?').get(id) as
    | (Record<string, unknown> & {
        id: number;
        title: string;
        transaction_type: string;
        property_type: string;
        city: string;
        district: string;
        neighborhood: string;
        budget_min: number;
        budget_max: number;
        room_count: string;
        min_sqm: number;
        building_age: string;
        floor_pref: string;
        credit_suitable: number;
        buyer_note: string;
        contact_phone: string;
        status: string;
      })
    | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Alıcı talebi bulunamadı.' });
    return;
  }

  const b = req.body as Record<string, unknown>;
  const nextTitle = b.title !== undefined ? String(b.title).trim() : existing.title;
  const nextTx =
    b.transaction_type === 'Satılık' || b.transaction_type === 'Kiralık'
      ? b.transaction_type
      : existing.transaction_type;
  const nextProp =
    b.property_type !== undefined ? String(b.property_type).trim() : existing.property_type;
  const nextCity = b.city !== undefined ? String(b.city).trim() : existing.city;
  const nextDistrict = b.district !== undefined ? String(b.district).trim() : existing.district;
  const nextNeighborhood =
    b.neighborhood !== undefined ? String(b.neighborhood).trim() : existing.neighborhood;
  const nextBudgetMin =
    b.budget_min !== undefined ? Number(b.budget_min) : existing.budget_min;
  const nextBudgetMax =
    b.budget_max !== undefined ? Number(b.budget_max) : existing.budget_max;
  const nextRoom = b.room_count !== undefined ? String(b.room_count).trim() : existing.room_count;
  const nextMinSqm = b.min_sqm !== undefined ? Number(b.min_sqm) : existing.min_sqm;
  const nextCredit =
    b.credit_suitable !== undefined ? (b.credit_suitable ? 1 : 0) : existing.credit_suitable;
  const nextNote = b.buyer_note !== undefined ? String(b.buyer_note).trim() : existing.buyer_note;
  const nextPhone =
    b.contact_phone !== undefined
      ? formatTurkishPhone(String(b.contact_phone))
      : existing.contact_phone;
  const nextStatus =
    typeof b.status === 'string' && ['active', 'matched', 'closed'].includes(b.status)
      ? b.status
      : existing.status;

  if (!nextCity || !nextDistrict || !nextNeighborhood) {
    res.status(400).json({ error: 'İl, ilçe ve mahalle bilgileri boş bırakılamaz.' });
    return;
  }
  if (!Number.isFinite(nextBudgetMax) || nextBudgetMax <= 0 || nextBudgetMin > nextBudgetMax) {
    res.status(400).json({ error: 'Geçerli bir bütçe aralığı girin.' });
    return;
  }

  db.prepare(
    `UPDATE buyer_requests SET
      title = ?, transaction_type = ?, property_type = ?,
      city = ?, district = ?, neighborhood = ?,
      budget_min = ?, budget_max = ?, room_count = ?, min_sqm = ?,
      credit_suitable = ?, buyer_note = ?, contact_phone = ?, status = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    nextTitle || `${nextDistrict} ${nextNeighborhood} ${nextTx}`,
    nextTx,
    nextProp,
    nextCity,
    nextDistrict,
    nextNeighborhood,
    nextBudgetMin,
    nextBudgetMax,
    nextRoom,
    nextMinSqm,
    nextCredit,
    nextNote,
    nextPhone,
    nextStatus,
    new Date().toISOString(),
    id
  );

  logAdminAction(
    req.user!,
    'Alıcı Talebi Güncellendi',
    'request',
    id,
    `${nextTitle} (${nextStatus})`
  );

  const updated = db
    .prepare(
      `SELECT br.*, u.full_name AS agent_name, u.office_name AS agent_office,
              u.city AS agent_city, u.myk_number AS agent_myk_number,
              u.avatar_path AS agent_avatar,
              (SELECT COUNT(*) FROM contact_matches cm WHERE cm.request_id = br.id) AS match_count
       FROM buyer_requests br
       JOIN users u ON u.id = br.agent_id
       WHERE br.id = ?`
    )
    .get(id) as Record<string, unknown> & { features_json: string; credit_suitable: number };

  res.json({
    request: {
      ...updated,
      credit_suitable: Boolean(updated.credit_suitable),
      features: JSON.parse(updated.features_json || '[]'),
    },
  });
});

// Super Admin: Delete any buyer request
app.delete('/api/admin/requests/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id, title FROM buyer_requests WHERE id = ?').get(id) as
    | { id: number; title: string }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Alıcı talebi bulunamadı.' });
    return;
  }
  db.prepare('DELETE FROM buyer_requests WHERE id = ?').run(id);
  logAdminAction(req.user!, 'Alıcı Talebi Silindi', 'request', id, existing.title);
  res.json({ ok: true });
});

// Super Admin: List all contact matches across the platform
app.get('/api/admin/matches', requireAdmin, (_req: AuthedRequest, res: Response) => {
  const matches = db
    .prepare(
      `SELECT cm.*,
              sender.full_name AS sender_name, sender.office_name AS sender_office,
              sender.city AS sender_city, sender.avatar_path AS sender_avatar,
              br.title AS request_title, br.city AS request_city,
              br.district AS request_district, br.neighborhood AS request_neighborhood,
              br.budget_max AS request_budget_max,
              owner.full_name AS request_agent_name, br.contact_phone AS request_agent_phone
       FROM contact_matches cm
       JOIN users sender ON sender.id = cm.sender_agent_id
       JOIN buyer_requests br ON br.id = cm.request_id
       JOIN users owner ON owner.id = br.agent_id
       ORDER BY cm.created_at DESC`
    )
    .all();
  res.json({ matches });
});

// Super Admin: Delete a contact match
app.delete('/api/admin/matches/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id, request_id FROM contact_matches WHERE id = ?').get(id) as
    | { id: number; request_id: number }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Eşleşme kaydı bulunamadı.' });
    return;
  }
  db.prepare('DELETE FROM contact_matches WHERE id = ?').run(id);
  logAdminAction(
    req.user!,
    'Portföy Eşleşmesi Silindi',
    'match',
    id,
    `Talep #${existing.request_id}`
  );
  res.json({ ok: true });
});

// Super Admin: Active sessions management
app.get('/api/admin/sessions', requireAdmin, (req: AuthedRequest, res: Response) => {
  const nowIso = new Date().toISOString();
  const rows = db
    .prepare(
      `SELECT s.rowid AS session_id, s.token, s.user_id, s.created_at, s.expires_at,
              u.full_name, u.email, u.office_name, u.role
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.expires_at > ?
       ORDER BY s.created_at DESC`
    )
    .all(nowIso) as Array<{
    session_id: number;
    token: string;
    user_id: number;
    created_at: string;
    expires_at: string;
    full_name: string;
    email: string;
    office_name: string;
    role: string;
  }>;

  const sessions = rows.map((r) => ({
    session_id: r.session_id,
    user_id: r.user_id,
    full_name: r.full_name,
    email: r.email,
    office_name: r.office_name,
    role: r.role,
    created_at: r.created_at,
    expires_at: r.expires_at,
    is_current: r.token === req.sessionToken,
  }));

  res.json({ sessions });
});

app.delete('/api/admin/sessions/:sessionId', requireAdmin, (req: AuthedRequest, res: Response) => {
  const sessionId = Number(req.params.sessionId);
  const existing = db
    .prepare('SELECT rowid AS session_id, token, user_id FROM sessions WHERE rowid = ?')
    .get(sessionId) as { session_id: number; token: string; user_id: number } | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Oturum bulunamadı.' });
    return;
  }
  if (existing.token === req.sessionToken) {
    res.status(400).json({ error: 'Kendi aktif oturumunuzu buradan sonlandıramazsınız.' });
    return;
  }
  db.prepare('DELETE FROM sessions WHERE rowid = ?').run(sessionId);
  logAdminAction(req.user!, 'Oturum Sonlandırıldı', 'session', sessionId, `Kullanıcı #${existing.user_id}`);
  res.json({ ok: true });
});

app.post('/api/admin/sessions/revoke-others', requireAdmin, (req: AuthedRequest, res: Response) => {
  const info = db
    .prepare('DELETE FROM sessions WHERE token != ?')
    .run(req.sessionToken || '');
  logAdminAction(
    req.user!,
    'Diğer Tüm Oturumlar Kapatıldı',
    'session',
    'bulk',
    `${info.changes} oturum sonlandırıldı`
  );
  res.json({ ok: true, revoked: info.changes });
});

// Super Admin: Platform settings
app.get('/api/admin/settings', requireAdmin, (_req: AuthedRequest, res: Response) => {
  res.json({ settings: getAppSettings() });
});

app.patch('/api/admin/settings', requireAdmin, (req: AuthedRequest, res: Response) => {
  const b = req.body as Partial<{
    platform_announcement: string;
    auto_approve_myk: boolean;
    allow_registrations: boolean;
    support_phone: string;
  }>;

  const now = new Date().toISOString();
  const upsert = db.prepare(
    'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)'
  );

  if (b.platform_announcement !== undefined) {
    upsert.run('platform_announcement', String(b.platform_announcement).trim(), now);
  }
  if (b.auto_approve_myk !== undefined) {
    upsert.run('auto_approve_myk', b.auto_approve_myk ? 'true' : 'false', now);
  }
  if (b.allow_registrations !== undefined) {
    upsert.run('allow_registrations', b.allow_registrations ? 'true' : 'false', now);
  }
  if (b.support_phone !== undefined) {
    upsert.run('support_phone', String(b.support_phone).trim(), now);
  }

  const nextSettings = getAppSettings();
  logAdminAction(
    req.user!,
    'Sistem Ayarları Güncellendi',
    'settings',
    'global',
    `Kayıt: ${nextSettings.allow_registrations ? 'Açık' : 'Kapalı'}, Oto-MYK: ${nextSettings.auto_approve_myk ? 'Açık' : 'Kapalı'}`
  );

  res.json({ settings: nextSettings });
});

// Super Admin: Audit logs
app.get('/api/admin/audit-logs', requireAdmin, (_req: AuthedRequest, res: Response) => {
  const logs = db
    .prepare('SELECT * FROM admin_audit_logs ORDER BY id DESC LIMIT 100')
    .all();
  res.json({ logs });
});

// Super Admin: Clear Turkey neighborhoods cache
app.delete('/api/admin/locations-cache', requireAdmin, (req: AuthedRequest, res: Response) => {
  const info = db.prepare('DELETE FROM location_neighborhoods_cache').run();
  logAdminAction(
    req.user!,
    'Konum Önbelleği Temizlendi',
    'cache',
    'locations',
    `${info.changes} ilçe önbelleği silindi`
  );
  res.json({ ok: true, cleared: info.changes });
});

// Super Admin: Moderate agent trust reviews
app.get('/api/admin/reviews', requireAdmin, (_req: AuthedRequest, res: Response) => {
  const rows = db
    .prepare(
      `SELECT ar.*,
              rev.full_name AS reviewer_name, rev.office_name AS reviewer_office,
              tgt.full_name AS target_name, tgt.office_name AS target_office,
              br.title AS request_title, br.city AS request_city, br.district AS request_district
       FROM agent_reviews ar
       JOIN users rev ON rev.id = ar.reviewer_agent_id
       JOIN users tgt ON tgt.id = ar.target_agent_id
       JOIN buyer_requests br ON br.id = ar.request_id
       ORDER BY ar.created_at DESC`
    )
    .all() as Array<Record<string, unknown> & { deal_closed: number }>;

  res.json({ reviews: rows.map((r) => ({ ...r, deal_closed: Boolean(r.deal_closed) })) });
});

app.delete('/api/admin/reviews/:id', requireAdmin, (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id, target_agent_id, rating FROM agent_reviews WHERE id = ?').get(id) as
    | { id: number; target_agent_id: number; rating: number }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Değerlendirme kaydı bulunamadı.' });
    return;
  }
  db.prepare('DELETE FROM agent_reviews WHERE id = ?').run(id);
  logAdminAction(
    req.user!,
    'Danışman Değerlendirmesi Silindi',
    'review',
    id,
    `Danışman #${existing.target_agent_id} (${existing.rating}/5)`
  );
  res.json({ ok: true });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AlıcıSepeti server listening on http://localhost:${PORT}`);
  });
}

startServer();
