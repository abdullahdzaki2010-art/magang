import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { db, uploadsDir, logActivity, createNotification } from './db.ts';
import {
  type AuthRequest,
  createSessionForUser,
  hashPassword,
  optionalAuth,
  requireAuth,
  requireRole,
  verifyPassword,
} from './auth.ts';
import type {
  Application,
  ApplicationStatus,
  CompanyProfile,
  Internship,
  ModerationStatus,
  OrganizationExperience,
  StudentProfile,
  UserRole,
  VerifiedStatus,
  WorkMode,
} from '../types.ts';

const router = express.Router();

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function validateSafeExternalUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return '';
  } catch {
    return '';
  }
}

// Configure Multer safely
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const cvUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf' && (file.mimetype === 'application/pdf' || file.mimetype === 'application/x-pdf')) {
      cb(null, true);
    } else {
      cb(new Error('File CV wajib berformat PDF (maksimal 5 MB).'));
    }
  },
});

const portfolioUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File portofolio harus berformat PDF, PNG, JPG, atau WEBP (maksimal 5 MB).'));
    }
  },
});

interface RawInternshipRow {
  id: number;
  company_id: number;
  category_id: number;
  title: string;
  location: string;
  work_mode: WorkMode;
  duration_months: number;
  stipend_amount: number;
  stipend_label: string;
  description: string;
  responsibilities_json: string;
  qualifications_json: string;
  benefits_json: string;
  required_skills_json: string;
  target_majors_json: string;
  deadline: string;
  moderation_status: ModerationStatus;
  created_at: string;
  company_name: string;
  company_slug: string;
  company_industry: string;
  company_logo_url: string | null;
  company_verified_status: VerifiedStatus;
  category_name: string;
  category_slug: string;
  applicants_count?: number;
}

function mapInternshipRow(
  row: RawInternshipRow,
  savedSet?: Set<number>,
  appliedSet?: Set<number>,
  studentCtx?: { major: string; skills: string[] } | null
): Internship {
  const requiredSkills = safeJsonParse<string[]>(row.required_skills_json, []);
  const targetMajors = safeJsonParse<string[]>(row.target_majors_json, []);
  let matchScore = 0;
  const matchReasons: string[] = [];

  if (studentCtx) {
    const studentSkillsLower = studentCtx.skills.map((s) => s.toLowerCase());
    const matchedSkills = requiredSkills.filter((s) =>
      studentSkillsLower.some((ss) => ss.includes(s.toLowerCase()) || s.toLowerCase().includes(ss))
    );
    if (matchedSkills.length > 0) {
      matchScore += matchedSkills.length * 20;
      matchReasons.push(`Cocok ${matchedSkills.length} keahlian (${matchedSkills.slice(0, 2).join(', ')})`);
    }
    if (
      studentCtx.major &&
      targetMajors.some(
        (m) =>
          m.toLowerCase().includes(studentCtx.major.toLowerCase()) ||
          studentCtx.major.toLowerCase().includes(m.toLowerCase())
      )
    ) {
      matchScore += 30;
      matchReasons.push(`Sesuai jurusan ${studentCtx.major}`);
    }
  }

  return {
    id: row.id,
    companyId: row.company_id,
    categoryId: row.category_id,
    title: row.title,
    location: row.location,
    workMode: row.work_mode,
    durationMonths: row.duration_months,
    stipendAmount: row.stipend_amount,
    stipendLabel: row.stipend_label,
    description: row.description,
    responsibilities: safeJsonParse<string[]>(row.responsibilities_json, []),
    qualifications: safeJsonParse<string[]>(row.qualifications_json, []),
    benefits: safeJsonParse<string[]>(row.benefits_json, []),
    requiredSkills,
    targetMajors,
    deadline: row.deadline,
    moderationStatus: row.moderation_status,
    createdAt: row.created_at,
    companyName: row.company_name,
    companySlug: row.company_slug,
    companyIndustry: row.company_industry,
    companyLogoUrl: row.company_logo_url,
    companyVerifiedStatus: row.company_verified_status,
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    applicantsCount: row.applicants_count,
    isSaved: savedSet ? savedSet.has(row.id) : false,
    hasApplied: appliedSet ? appliedSet.has(row.id) : false,
    matchScore,
    matchReasons,
  };
}

function getStudentContext(userId?: number): {
  studentId: number;
  major: string;
  skills: string[];
  savedSet: Set<number>;
  appliedSet: Set<number>;
} | null {
  if (!userId) return null;
  const savedRows = db
    .prepare(`SELECT internship_id FROM saved_jobs WHERE user_id = ?`)
    .all(userId) as { internship_id: number }[];
  const savedSet = new Set(savedRows.map((r) => r.internship_id));

  const student = db
    .prepare(`SELECT id, major, skills_json FROM student_profiles WHERE user_id = ?`)
    .get(userId) as { id: number; major: string; skills_json: string } | undefined;

  if (!student) {
    return { studentId: 0, major: '', skills: [], savedSet, appliedSet: new Set() };
  }

  const appliedRows = db
    .prepare(`SELECT internship_id FROM applications WHERE student_id = ?`)
    .all(student.id) as { internship_id: number }[];
  const appliedSet = new Set(appliedRows.map((r) => r.internship_id));

  return {
    studentId: student.id,
    major: student.major,
    skills: safeJsonParse<string[]>(student.skills_json, []),
    savedSet,
    appliedSet,
  };
}

// ---------- PUBLIC OVERVIEW & CATEGORIES ----------

router.get('/overview', optionalAuth, (req: AuthRequest, res) => {
  try {
    const activeInternships = (
      db.prepare(`SELECT COUNT(*) AS count FROM internships WHERE moderation_status = 'active'`).get() as {
        count: number;
      }
    ).count;
    const verifiedCompanies = (
      db
        .prepare(`SELECT COUNT(*) AS count FROM company_profiles WHERE verified_status = 'verified'`)
        .get() as { count: number }
    ).count;
    const registeredStudents = (
      db.prepare(`SELECT COUNT(*) AS count FROM users WHERE role = 'mahasiswa'`).get() as { count: number }
    ).count;
    const categoriesCount = (
      db.prepare(`SELECT COUNT(*) AS count FROM categories`).get() as { count: number }
    ).count;

    const categories = db
      .prepare(
        `SELECT c.id, c.name, c.slug, c.description, c.icon_name AS iconName,
                COUNT(CASE WHEN i.moderation_status = 'active' THEN 1 END) AS internshipCount
         FROM categories c
         LEFT JOIN internships i ON i.category_id = c.id
         GROUP BY c.id
         ORDER BY internshipCount DESC, c.name ASC`
      )
      .all();

    const ctx = getStudentContext(req.authUser?.id);

    const rawLatest = db
      .prepare(
        `SELECT i.*, cp.company_name, cp.slug AS company_slug, cp.industry AS company_industry,
                cp.logo_url AS company_logo_url, cp.verified_status AS company_verified_status,
                c.name AS category_name, c.slug AS category_slug
         FROM internships i
         JOIN company_profiles cp ON cp.id = i.company_id
         JOIN categories c ON c.id = i.category_id
         WHERE i.moderation_status = 'active'
         ORDER BY i.created_at DESC
         LIMIT 6`
      )
      .all() as RawInternshipRow[];

    const latestInternships = rawLatest.map((row) =>
      mapInternshipRow(row, ctx?.savedSet, ctx?.appliedSet, ctx)
    );

    const partnerCompanies = db
      .prepare(
        `SELECT cp.id, cp.user_id AS userId, cp.company_name AS companyName, cp.slug, cp.industry,
                cp.company_size AS companySize, cp.location, cp.website, cp.description,
                cp.logo_url AS logoUrl, cp.banner_url AS bannerUrl, cp.verified_status AS verifiedStatus,
                cp.verified_at AS verifiedAt, cp.created_at AS createdAt,
                COUNT(CASE WHEN i.moderation_status = 'active' THEN 1 END) AS activeInternshipsCount
         FROM company_profiles cp
         LEFT JOIN internships i ON i.company_id = cp.id
         WHERE cp.verified_status = 'verified'
         GROUP BY cp.id
         ORDER BY activeInternshipsCount DESC, cp.company_name ASC
         LIMIT 6`
      )
      .all();

    res.json({
      stats: {
        activeInternships,
        verifiedCompanies,
        registeredStudents,
        categoriesCount,
      },
      categories,
      latestInternships,
      partnerCompanies,
    });
  } catch (error) {
    console.error('Overview error:', error);
    res.status(500).json({ error: 'Gagal memuat ringkasan platform.' });
  }
});

router.get('/categories', (_req, res) => {
  try {
    const categories = db
      .prepare(
        `SELECT c.id, c.name, c.slug, c.description, c.icon_name AS iconName,
                COUNT(CASE WHEN i.moderation_status = 'active' THEN 1 END) AS internshipCount
         FROM categories c
         LEFT JOIN internships i ON i.category_id = c.id
         GROUP BY c.id
         ORDER BY c.name ASC`
      )
      .all();
    res.json(categories);
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ error: 'Gagal memuat kategori magang.' });
  }
});

// ---------- AUTHENTICATION ROUTES ----------

router.get('/auth/admin-status', (_req, res) => {
  const adminRow = db
    .prepare(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`)
    .get() as { id: number } | undefined;
  const envPasscodeConfigured = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0);
  res.json({
    adminExists: Boolean(adminRow),
    envPasscodeConfigured,
  });
});

router.post('/auth/claim-admin', (req, res) => {
  try {
    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    if (envPasscode) {
      res.status(403).json({
        error: 'Passcode admin telah dikonfigurasi di server. Gunakan mode login passcode admin.',
      });
      return;
    }

    const existingAdmin = db.prepare(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`).get();
    if (existingAdmin) {
      res.status(403).json({ error: 'Akun Administrator utama sudah terdaftar. Silakan masuk dengan kredensial Admin.' });
      return;
    }

    const { email, fullName, password } = req.body as {
      email?: string;
      fullName?: string;
      password?: string;
    };

    if (!email || !fullName || !password || password.length < 8) {
      res.status(400).json({
        error: 'Nama lengkap, email valid, dan kata sandi (minimal 8 karakter) wajib diisi.',
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingEmail = db.prepare(`SELECT id FROM users WHERE email = ?`).get(cleanEmail);
    if (existingEmail) {
      res.status(409).json({ error: 'Email tersebut sudah terdaftar pada akun lain.' });
      return;
    }

    const pwHash = hashPassword(password);
    const result = db
      .prepare(
        `INSERT INTO users (email, password_hash, full_name, role, status) VALUES (?, ?, ?, 'admin', 'active')`
      )
      .run(cleanEmail, pwHash, fullName.trim());

    const userId = Number(result.lastInsertRowid);
    const token = createSessionForUser(userId);
    const user = db
      .prepare(`SELECT id, email, full_name AS fullName, role, status, avatar_url AS avatarUrl, created_at AS createdAt FROM users WHERE id = ?`)
      .get(userId);

    logActivity(userId, fullName.trim(), 'admin', 'Aktivasi Akun Admin', 'user', userId, 'Administrator utama platform MagangKeren diaktifkan.');
    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Claim admin error:', error);
    res.status(500).json({ error: 'Gagal mengaktifkan akun Administrator.' });
  }
});

router.post('/auth/admin-login', (req, res) => {
  try {
    const { email, password, passcode } = req.body as {
      email?: string;
      password?: string;
      passcode?: string;
    };

    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    if (envPasscode) {
      if (!passcode) {
        res.status(400).json({ error: 'Masukkan passcode administrator.' });
        return;
      }
      const providedBuf = Buffer.from(passcode);
      const expectedBuf = Buffer.from(envPasscode);
      if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
        res.status(401).json({ error: 'Passcode administrator tidak sesuai.' });
        return;
      }

      let adminUser = db
        .prepare(`SELECT id, email, full_name AS fullName, role, status, avatar_url AS avatarUrl, created_at AS createdAt FROM users WHERE role = 'admin' LIMIT 1`)
        .get() as { id: number; email: string; fullName: string; role: UserRole; status: 'active' | 'suspended'; avatarUrl: string | null; createdAt: string } | undefined;

      if (!adminUser) {
        const placeholderHash = hashPassword(crypto.randomBytes(24).toString('hex'));
        const resInsert = db
          .prepare(`INSERT INTO users (email, password_hash, full_name, role, status) VALUES (?, ?, ?, 'admin', 'active')`)
          .run('admin@magangkeren.id', placeholderHash, 'Administrator MagangKeren');
        adminUser = db
          .prepare(`SELECT id, email, full_name AS fullName, role, status, avatar_url AS avatarUrl, created_at AS createdAt FROM users WHERE id = ?`)
          .get(Number(resInsert.lastInsertRowid)) as typeof adminUser;
      }

      const token = createSessionForUser(adminUser!.id);
      logActivity(adminUser!.id, adminUser!.fullName, 'admin', 'Login Administrator', 'auth', adminUser!.id, 'Admin masuk menggunakan passcode server.');
      res.json({ token, user: adminUser });
      return;
    }

    if (!email || !password) {
      res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
      return;
    }

    const row = db
      .prepare(`SELECT * FROM users WHERE email = ? AND role = 'admin'`)
      .get(email.trim().toLowerCase()) as
      | {
          id: number;
          email: string;
          password_hash: string;
          full_name: string;
          role: UserRole;
          status: 'active' | 'suspended';
          avatar_url: string | null;
          created_at: string;
        }
      | undefined;

    if (!row || !verifyPassword(password, row.password_hash)) {
      res.status(401).json({ error: 'Kredensial administrator tidak valid.' });
      return;
    }

    const token = createSessionForUser(row.id);
    logActivity(row.id, row.full_name, 'admin', 'Login Administrator', 'auth', row.id, 'Admin masuk ke konsol manajemen.');
    res.json({
      token,
      user: {
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        role: row.role,
        status: row.status,
        avatarUrl: row.avatar_url,
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Gagal memproses login administrator.' });
  }
});

router.post('/auth/register', (req, res) => {
  try {
    const {
      email,
      password,
      fullName,
      role,
      university,
      major,
      companyName,
      industry,
      location,
    } = req.body as {
      email?: string;
      password?: string;
      fullName?: string;
      role?: string;
      university?: string;
      major?: string;
      companyName?: string;
      industry?: string;
      location?: string;
    };

    if (!email || !password || !fullName || !role) {
      res.status(400).json({ error: 'Nama lengkap, email, kata sandi, dan peran wajib diisi.' });
      return;
    }

    if (role !== 'mahasiswa' && role !== 'perusahaan') {
      res.status(400).json({ error: 'Peran pendaftaran hanya mendukung Mahasiswa atau Perusahaan.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({ error: 'Format alamat email tidak valid.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
      return;
    }

    if (role === 'perusahaan' && (!companyName || !companyName.trim())) {
      res.status(400).json({ error: 'Nama perusahaan wajib diisi untuk pendaftaran Perusahaan.' });
      return;
    }

    const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(cleanEmail);
    if (existing) {
      res.status(409).json({ error: 'Email ini sudah terdaftar. Silakan gunakan halaman Masuk.' });
      return;
    }

    const pwHash = hashPassword(password);
    const tx = db.transaction(() => {
      const userRes = db
        .prepare(`INSERT INTO users (email, password_hash, full_name, role, status) VALUES (?, ?, ?, ?, 'active')`)
        .run(cleanEmail, pwHash, fullName.trim(), role);
      const userId = Number(userRes.lastInsertRowid);

      if (role === 'mahasiswa') {
        db.prepare(
          `INSERT INTO student_profiles (user_id, university, major, location) VALUES (?, ?, ?, ?)`
        ).run(userId, (university || '').trim(), (major || '').trim(), (location || '').trim());

        createNotification(
          userId,
          'Selamat Datang di MagangKeren',
          'Lengkapi profil akademik, keterampilan, dan unggah CV PDF Anda untuk mendapatkan rekomendasi magang terbaik.',
          'info',
          '/dashboard'
        );
        logActivity(userId, fullName.trim(), 'mahasiswa', 'Pendaftaran Mahasiswa', 'user', userId, `${fullName.trim()} mendaftar sebagai Mahasiswa.`);
      } else {
        const baseSlug = slugify(companyName!.trim()) || `perusahaan-${userId}`;
        let uniqueSlug = baseSlug;
        let counter = 1;
        while (db.prepare(`SELECT id FROM company_profiles WHERE slug = ?`).get(uniqueSlug)) {
          uniqueSlug = `${baseSlug}-${counter++}`;
        }

        const compRes = db
          .prepare(
            `INSERT INTO company_profiles (user_id, company_name, slug, industry, location, banner_url, verified_status)
             VALUES (?, ?, ?, ?, ?, ?, 'pending')`
          )
          .run(
            userId,
            companyName!.trim(),
            uniqueSlug,
            (industry || 'Teknologi & Digital').trim(),
            (location || 'Jakarta').trim(),
            '/src/assets/images/company_modern_office_1795414992957.jpg'
          );

        createNotification(
          userId,
          'Akun Perusahaan Terdaftar',
          'Profil perusahaan Anda sedang menunggu verifikasi Administrator. Anda tetap dapat menyiapkan draf lowongan.',
          'info',
          '/dashboard'
        );
        logActivity(
          userId,
          fullName.trim(),
          'perusahaan',
          'Pendaftaran Perusahaan',
          'company',
          Number(compRes.lastInsertRowid),
          `${companyName!.trim()} mendaftar sebagai mitra perusahaan (menunggu verifikasi).`
        );
      }

      return userId;
    });

    const userId = tx();
    const token = createSessionForUser(userId);
    const user = db
      .prepare(`SELECT id, email, full_name AS fullName, role, status, avatar_url AS avatarUrl, created_at AS createdAt FROM users WHERE id = ?`)
      .get(userId);

    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Gagal memproses pendaftaran.' });
  }
});

router.post('/auth/login', (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
      return;
    }

    const row = db
      .prepare(`SELECT * FROM users WHERE email = ?`)
      .get(email.trim().toLowerCase()) as
      | {
          id: number;
          email: string;
          password_hash: string;
          full_name: string;
          role: UserRole;
          status: 'active' | 'suspended';
          avatar_url: string | null;
          created_at: string;
        }
      | undefined;

    if (!row || !verifyPassword(password, row.password_hash)) {
      res.status(401).json({ error: 'Email atau kata sandi salah.' });
      return;
    }

    if (row.status === 'suspended') {
      res.status(403).json({ error: 'Akun Anda sedang dinonaktifkan oleh Administrator.' });
      return;
    }

    const token = createSessionForUser(row.id);
    res.json({
      token,
      user: {
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        role: row.role,
        status: row.status,
        avatarUrl: row.avatar_url,
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Gagal masuk ke sistem.' });
  }
});

router.post('/auth/logout', requireAuth, (req: AuthRequest, res) => {
  if (req.authTokenHash) {
    db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(req.authTokenHash);
  }
  res.json({ ok: true });
});

router.get('/auth/me', requireAuth, (req: AuthRequest, res) => {
  const user = req.authUser!;
  const unreadCount = (
    db
      .prepare(`SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0`)
      .get(user.id) as { count: number }
  ).count;

  let studentProfile: StudentProfile | null = null;
  let companyProfile: CompanyProfile | null = null;

  if (user.role === 'mahasiswa') {
    const sp = db.prepare(`SELECT * FROM student_profiles WHERE user_id = ?`).get(user.id) as
      | {
          id: number;
          user_id: number;
          university: string;
          major: string;
          semester: number;
          gpa: string;
          phone: string;
          location: string;
          bio: string;
          skills_json: string;
          organizations_json: string;
          cv_filename: string | null;
          cv_path: string | null;
          portfolio_url: string | null;
          portfolio_filename: string | null;
          portfolio_path: string | null;
          updated_at: string;
        }
      | undefined;
    if (sp) {
      studentProfile = {
        id: sp.id,
        userId: sp.user_id,
        fullName: user.fullName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        university: sp.university,
        major: sp.major,
        semester: sp.semester,
        gpa: sp.gpa,
        phone: sp.phone,
        location: sp.location,
        bio: sp.bio,
        skills: safeJsonParse<string[]>(sp.skills_json, []),
        organizations: safeJsonParse<OrganizationExperience[]>(sp.organizations_json, []),
        cvFilename: sp.cv_filename,
        cvUrl: sp.cv_path ? `/api/files/${sp.cv_path}` : null,
        portfolioUrl: sp.portfolio_url,
        portfolioFilename: sp.portfolio_filename,
        portfolioFileUrl: sp.portfolio_path ? `/api/files/${sp.portfolio_path}` : null,
        updatedAt: sp.updated_at,
      };
    }
  } else if (user.role === 'perusahaan') {
    const cp = db
      .prepare(
        `SELECT id, user_id AS userId, company_name AS companyName, slug, industry, company_size AS companySize,
                location, website, description, logo_url AS logoUrl, banner_url AS bannerUrl,
                verified_status AS verifiedStatus, verified_at AS verifiedAt, created_at AS createdAt
         FROM company_profiles WHERE user_id = ?`
      )
      .get(user.id) as CompanyProfile | undefined;
    companyProfile = cp ?? null;
  }

  res.json({
    user,
    unreadNotifications: unreadCount,
    studentProfile,
    companyProfile,
  });
});

// ---------- PUBLIC INTERNSHIPS & COMPANIES ----------

router.get('/internships', optionalAuth, (req: AuthRequest, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const category = String(req.query.category || '').trim();
    const location = String(req.query.location || '').trim();
    const workMode = String(req.query.workMode || '').trim();
    const duration = String(req.query.duration || '').trim();
    const stipend = String(req.query.stipend || '').trim();
    const company = String(req.query.company || '').trim();
    const sort = String(req.query.sort || 'newest').trim();

    const conditions: string[] = [`i.moderation_status = 'active'`];
    const params: (string | number)[] = [];

    if (q) {
      conditions.push(`(i.title LIKE ? OR cp.company_name LIKE ? OR i.location LIKE ? OR i.required_skills_json LIKE ?)`);
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }
    if (category && category !== 'all') {
      conditions.push(`c.slug = ?`);
      params.push(category);
    }
    if (location && location !== 'all') {
      conditions.push(`i.location LIKE ?`);
      params.push(`%${location}%`);
    }
    if (workMode && workMode !== 'all') {
      conditions.push(`i.work_mode = ?`);
      params.push(workMode);
    }
    if (duration === '1-3') {
      conditions.push(`i.duration_months BETWEEN 1 AND 3`);
    } else if (duration === '4-6') {
      conditions.push(`i.duration_months BETWEEN 4 AND 6`);
    } else if (duration === '6+') {
      conditions.push(`i.duration_months > 6`);
    }
    if (stipend === 'paid') {
      conditions.push(`i.stipend_amount > 0`);
    } else if (stipend === '2m') {
      conditions.push(`i.stipend_amount >= 2000000`);
    } else if (stipend === '4m') {
      conditions.push(`i.stipend_amount >= 4000000`);
    } else if (stipend === 'unpaid') {
      conditions.push(`i.stipend_amount = 0`);
    }
    if (company && company !== 'all') {
      conditions.push(`cp.slug = ?`);
      params.push(company);
    }

    const sql = `
      SELECT i.*, cp.company_name, cp.slug AS company_slug, cp.industry AS company_industry,
             cp.logo_url AS company_logo_url, cp.verified_status AS company_verified_status,
             c.name AS category_name, c.slug AS category_slug
      FROM internships i
      JOIN company_profiles cp ON cp.id = i.company_id
      JOIN categories c ON c.id = i.category_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY i.created_at DESC
    `;

    const rows = db.prepare(sql).all(...params) as RawInternshipRow[];
    const ctx = getStudentContext(req.authUser?.id);
    let mapped = rows.map((r) => mapInternshipRow(r, ctx?.savedSet, ctx?.appliedSet, ctx));

    if (sort === 'relevance') {
      mapped = mapped.sort((a, b) => {
        const qLower = q.toLowerCase();
        const aTitleMatch = qLower && a.title.toLowerCase().includes(qLower) ? 50 : 0;
        const bTitleMatch = qLower && b.title.toLowerCase().includes(qLower) ? 50 : 0;
        const scoreDiff = (b.matchScore || 0) + bTitleMatch - ((a.matchScore || 0) + aTitleMatch);
        if (scoreDiff !== 0) return scoreDiff;
        return b.stipendAmount - a.stipendAmount;
      });
    }

    res.json(mapped);
  } catch (error) {
    console.error('Internships query error:', error);
    res.status(500).json({ error: 'Gagal memuat daftar lowongan magang.' });
  }
});

router.get('/internships/:id', optionalAuth, (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'ID lowongan tidak valid.' });
      return;
    }

    const row = db
      .prepare(
        `SELECT i.*, cp.company_name, cp.slug AS company_slug, cp.industry AS company_industry,
                cp.logo_url AS company_logo_url, cp.verified_status AS company_verified_status,
                c.name AS category_name, c.slug AS category_slug,
                (SELECT COUNT(*) FROM applications a WHERE a.internship_id = i.id) AS applicants_count
         FROM internships i
         JOIN company_profiles cp ON cp.id = i.company_id
         JOIN categories c ON c.id = i.category_id
         WHERE i.id = ?`
      )
      .get(id) as RawInternshipRow | undefined;

    if (!row) {
      res.status(404).json({ error: 'Lowongan magang tidak ditemukan.' });
      return;
    }

    const ctx = getStudentContext(req.authUser?.id);
    const internship = mapInternshipRow(row, ctx?.savedSet, ctx?.appliedSet, ctx);

    const company = db
      .prepare(
        `SELECT id, user_id AS userId, company_name AS companyName, slug, industry, company_size AS companySize,
                location, website, description, logo_url AS logoUrl, banner_url AS bannerUrl,
                verified_status AS verifiedStatus, verified_at AS verifiedAt, created_at AS createdAt
         FROM company_profiles WHERE id = ?`
      )
      .get(row.company_id) as CompanyProfile;

    res.json({ internship, company });
  } catch (error) {
    console.error('Internship detail error:', error);
    res.status(500).json({ error: 'Gagal memuat detail lowongan.' });
  }
});

router.get('/companies', (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const conditions: string[] = [`cp.verified_status = 'verified'`];
    const params: string[] = [];

    if (q) {
      conditions.push(`(cp.company_name LIKE ? OR cp.industry LIKE ? OR cp.location LIKE ?)`);
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    const companies = db
      .prepare(
        `SELECT cp.id, cp.user_id AS userId, cp.company_name AS companyName, cp.slug, cp.industry,
                cp.company_size AS companySize, cp.location, cp.website, cp.description,
                cp.logo_url AS logoUrl, cp.banner_url AS bannerUrl, cp.verified_status AS verifiedStatus,
                cp.verified_at AS verifiedAt, cp.created_at AS createdAt,
                COUNT(CASE WHEN i.moderation_status = 'active' THEN 1 END) AS activeInternshipsCount
         FROM company_profiles cp
         LEFT JOIN internships i ON i.company_id = cp.id
         WHERE ${conditions.join(' AND ')}
         GROUP BY cp.id
         ORDER BY activeInternshipsCount DESC, cp.company_name ASC`
      )
      .all(...params);

    res.json(companies);
  } catch (error) {
    console.error('Companies list error:', error);
    res.status(500).json({ error: 'Gagal memuat daftar perusahaan.' });
  }
});

router.get('/companies/:slug', optionalAuth, (req: AuthRequest, res) => {
  try {
    const slug = String(req.params.slug || '').trim();
    const company = db
      .prepare(
        `SELECT id, user_id AS userId, company_name AS companyName, slug, industry,
                company_size AS companySize, location, website, description,
                logo_url AS logoUrl, banner_url AS bannerUrl, verified_status AS verifiedStatus,
                verified_at AS verifiedAt, created_at AS createdAt
         FROM company_profiles WHERE slug = ?`
      )
      .get(slug) as CompanyProfile | undefined;

    if (!company) {
      res.status(404).json({ error: 'Perusahaan tidak ditemukan.' });
      return;
    }

    const ctx = getStudentContext(req.authUser?.id);
    const rawJobs = db
      .prepare(
        `SELECT i.*, cp.company_name, cp.slug AS company_slug, cp.industry AS company_industry,
                cp.logo_url AS company_logo_url, cp.verified_status AS company_verified_status,
                c.name AS category_name, c.slug AS category_slug
         FROM internships i
         JOIN company_profiles cp ON cp.id = i.company_id
         JOIN categories c ON c.id = i.category_id
         WHERE i.company_id = ? AND i.moderation_status = 'active'
         ORDER BY i.created_at DESC`
      )
      .all(company.id) as RawInternshipRow[];

    const internships = rawJobs.map((r) => mapInternshipRow(r, ctx?.savedSet, ctx?.appliedSet, ctx));
    res.json({ company, internships });
  } catch (error) {
    console.error('Company profile error:', error);
    res.status(500).json({ error: 'Gagal memuat profil perusahaan.' });
  }
});

// ---------- STUDENT ROUTES ----------

router.get('/student/dashboard', requireAuth, requireRole('mahasiswa'), (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const sp = db.prepare(`SELECT * FROM student_profiles WHERE user_id = ?`).get(user.id) as {
      id: number;
      user_id: number;
      university: string;
      major: string;
      semester: number;
      gpa: string;
      phone: string;
      location: string;
      bio: string;
      skills_json: string;
      organizations_json: string;
      cv_filename: string | null;
      cv_path: string | null;
      portfolio_url: string | null;
      portfolio_filename: string | null;
      portfolio_path: string | null;
      updated_at: string;
    };

    const profile: StudentProfile = {
      id: sp.id,
      userId: sp.user_id,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      university: sp.university,
      major: sp.major,
      semester: sp.semester,
      gpa: sp.gpa,
      phone: sp.phone,
      location: sp.location,
      bio: sp.bio,
      skills: safeJsonParse<string[]>(sp.skills_json, []),
      organizations: safeJsonParse<OrganizationExperience[]>(sp.organizations_json, []),
      cvFilename: sp.cv_filename,
      cvUrl: sp.cv_path ? `/api/files/${sp.cv_path}` : null,
      portfolioUrl: sp.portfolio_url,
      portfolioFilename: sp.portfolio_filename,
      portfolioFileUrl: sp.portfolio_path ? `/api/files/${sp.portfolio_path}` : null,
      updatedAt: sp.updated_at,
    };

    const appRows = db
      .prepare(
        `SELECT a.*, i.title AS internship_title, i.work_mode, i.location, i.duration_months, i.stipend_label,
                cp.company_name, cp.slug AS company_slug, cp.logo_url AS company_logo_url,
                iv.id AS iv_id, iv.scheduled_at AS iv_scheduled_at, iv.mode AS iv_mode,
                iv.meeting_link_or_location AS iv_location, iv.interviewer_name AS iv_interviewer,
                iv.notes AS iv_notes, iv.status AS iv_status, iv.created_at AS iv_created_at
         FROM applications a
         JOIN internships i ON i.id = a.internship_id
         JOIN company_profiles cp ON cp.id = i.company_id
         LEFT JOIN interview_schedules iv ON iv.application_id = a.id
         WHERE a.student_id = ?
         ORDER BY a.updated_at DESC`
      )
      .all(sp.id) as Array<{
      id: number;
      internship_id: number;
      student_id: number;
      cover_letter: string;
      cv_snapshot_path: string | null;
      cv_snapshot_name: string | null;
      portfolio_snapshot_url: string | null;
      status: ApplicationStatus;
      company_notes: string | null;
      created_at: string;
      updated_at: string;
      internship_title: string;
      work_mode: WorkMode;
      location: string;
      duration_months: number;
      stipend_label: string;
      company_name: string;
      company_slug: string;
      company_logo_url: string | null;
      iv_id: number | null;
      iv_scheduled_at: string | null;
      iv_mode: 'Online' | 'Offline' | null;
      iv_location: string | null;
      iv_interviewer: string | null;
      iv_notes: string | null;
      iv_status: 'scheduled' | 'completed' | 'cancelled' | null;
      iv_created_at: string | null;
    }>;

    const applications: Application[] = appRows.map((r) => ({
      id: r.id,
      internshipId: r.internship_id,
      studentId: r.student_id,
      coverLetter: r.cover_letter,
      cvSnapshotUrl: r.cv_snapshot_path ? `/api/files/${r.cv_snapshot_path}` : null,
      cvSnapshotName: r.cv_snapshot_name,
      portfolioSnapshotUrl: r.portfolio_snapshot_url,
      status: r.status,
      companyNotes: r.company_notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      internshipTitle: r.internship_title,
      workMode: r.work_mode,
      location: r.location,
      durationMonths: r.duration_months,
      stipendLabel: r.stipend_label,
      companyName: r.company_name,
      companySlug: r.company_slug,
      companyLogoUrl: r.company_logo_url,
      interview: r.iv_id
        ? {
            id: r.iv_id,
            applicationId: r.id,
            scheduledAt: r.iv_scheduled_at!,
            mode: r.iv_mode!,
            meetingLinkOrLocation: r.iv_location!,
            interviewerName: r.iv_interviewer!,
            notes: r.iv_notes || '',
            status: r.iv_status!,
            createdAt: r.iv_created_at!,
          }
        : null,
    }));

    const stats = {
      total: applications.length,
      menunggu_review: applications.filter((a) => a.status === 'menunggu_review').length,
      diproses: applications.filter((a) => a.status === 'diproses').length,
      interview: applications.filter((a) => a.status === 'interview').length,
      diterima: applications.filter((a) => a.status === 'diterima').length,
      ditolak: applications.filter((a) => a.status === 'ditolak').length,
    };

    const ctx = getStudentContext(user.id)!;

    const rawSaved = db
      .prepare(
        `SELECT i.*, cp.company_name, cp.slug AS company_slug, cp.industry AS company_industry,
                cp.logo_url AS company_logo_url, cp.verified_status AS company_verified_status,
                c.name AS category_name, c.slug AS category_slug
         FROM saved_jobs sj
         JOIN internships i ON i.id = sj.internship_id
         JOIN company_profiles cp ON cp.id = i.company_id
         JOIN categories c ON c.id = i.category_id
         WHERE sj.user_id = ? AND i.moderation_status = 'active'
         ORDER BY sj.created_at DESC`
      )
      .all(user.id) as RawInternshipRow[];

    const savedJobs = rawSaved.map((r) => mapInternshipRow(r, ctx.savedSet, ctx.appliedSet, ctx));

    const allActive = db
      .prepare(
        `SELECT i.*, cp.company_name, cp.slug AS company_slug, cp.industry AS company_industry,
                cp.logo_url AS company_logo_url, cp.verified_status AS company_verified_status,
                c.name AS category_name, c.slug AS category_slug
         FROM internships i
         JOIN company_profiles cp ON cp.id = i.company_id
         JOIN categories c ON c.id = i.category_id
         WHERE i.moderation_status = 'active'
         ORDER BY i.created_at DESC`
      )
      .all() as RawInternshipRow[];

    const recommendations = allActive
      .map((r) => mapInternshipRow(r, ctx.savedSet, ctx.appliedSet, ctx))
      .filter((job) => !job.hasApplied)
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
      .slice(0, 4);

    const notifications = db
      .prepare(
        `SELECT id, user_id AS userId, title, message, type, link_path AS linkPath,
                is_read AS isRead, created_at AS createdAt
         FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 15`
      )
      .all(user.id)
      .map((n: any) => ({ ...n, isRead: Boolean(n.isRead) }));

    res.json({
      profile,
      stats,
      applications,
      savedJobs,
      recommendations,
      notifications,
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({ error: 'Gagal memuat dashboard mahasiswa.' });
  }
});

router.put('/student/profile', requireAuth, requireRole('mahasiswa'), (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const {
      fullName,
      university,
      major,
      semester,
      gpa,
      phone,
      location,
      bio,
      skills,
      organizations,
      portfolioUrl,
    } = req.body as {
      fullName?: string;
      university?: string;
      major?: string;
      semester?: number;
      gpa?: string;
      phone?: string;
      location?: string;
      bio?: string;
      skills?: string[];
      organizations?: OrganizationExperience[];
      portfolioUrl?: string;
    };

    if (fullName && fullName.trim()) {
      db.prepare(`UPDATE users SET full_name = ? WHERE id = ?`).run(fullName.trim(), user.id);
    }

    const cleanSkills = Array.isArray(skills)
      ? skills.map((s) => String(s).trim()).filter(Boolean).slice(0, 25)
      : [];
    const cleanOrgs = Array.isArray(organizations)
      ? organizations
          .filter((o) => o && o.name && o.name.trim())
          .map((o) => ({
            name: String(o.name).trim(),
            role: String(o.role || '').trim(),
            period: String(o.period || '').trim(),
            description: String(o.description || '').trim(),
          }))
      : [];

    const safePortfolio = validateSafeExternalUrl(portfolioUrl);

    db.prepare(
      `UPDATE student_profiles
       SET university = ?, major = ?, semester = ?, gpa = ?, phone = ?, location = ?,
           bio = ?, skills_json = ?, organizations_json = ?, portfolio_url = ?, updated_at = datetime('now')
       WHERE user_id = ?`
    ).run(
      (university || '').trim(),
      (major || '').trim(),
      Math.max(1, Math.min(14, Number(semester) || 6)),
      (gpa || '').trim(),
      (phone || '').trim(),
      (location || '').trim(),
      (bio || '').trim(),
      JSON.stringify(cleanSkills),
      JSON.stringify(cleanOrgs),
      safePortfolio || null,
      user.id
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Update student profile error:', error);
    res.status(500).json({ error: 'Gagal memperbarui profil mahasiswa.' });
  }
});

router.post(
  '/student/upload-cv',
  requireAuth,
  requireRole('mahasiswa'),
  (req: AuthRequest, res) => {
    cvUpload.single('cv')(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err.message || 'Gagal mengunggah CV PDF.' });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'Pilih file CV berformat PDF untuk diunggah.' });
        return;
      }
      const user = req.authUser!;
      db.prepare(
        `UPDATE student_profiles SET cv_filename = ?, cv_path = ?, updated_at = datetime('now') WHERE user_id = ?`
      ).run(req.file.originalname, req.file.filename, user.id);

      res.json({
        cvFilename: req.file.originalname,
        cvUrl: `/api/files/${req.file.filename}`,
      });
    });
  }
);

router.post(
  '/student/upload-portfolio',
  requireAuth,
  requireRole('mahasiswa'),
  (req: AuthRequest, res) => {
    portfolioUpload.single('portfolio')(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err.message || 'Gagal mengunggah file portofolio.' });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'Pilih file portofolio (PDF atau gambar) untuk diunggah.' });
        return;
      }
      const user = req.authUser!;
      db.prepare(
        `UPDATE student_profiles SET portfolio_filename = ?, portfolio_path = ?, updated_at = datetime('now') WHERE user_id = ?`
      ).run(req.file.originalname, req.file.filename, user.id);

      res.json({
        portfolioFilename: req.file.originalname,
        portfolioFileUrl: `/api/files/${req.file.filename}`,
      });
    });
  }
);

router.post('/internships/:id/save', requireAuth, requireRole('mahasiswa'), (req: AuthRequest, res) => {
  try {
    const internshipId = Number(req.params.id);
    const userId = req.authUser!.id;
    const existing = db
      .prepare(`SELECT id FROM saved_jobs WHERE user_id = ? AND internship_id = ?`)
      .get(userId, internshipId) as { id: number } | undefined;

    if (existing) {
      db.prepare(`DELETE FROM saved_jobs WHERE id = ?`).run(existing.id);
      res.json({ saved: false });
    } else {
      const job = db.prepare(`SELECT id FROM internships WHERE id = ?`).get(internshipId);
      if (!job) {
        res.status(404).json({ error: 'Lowongan tidak ditemukan.' });
        return;
      }
      db.prepare(`INSERT INTO saved_jobs (user_id, internship_id) VALUES (?, ?)`).run(userId, internshipId);
      res.json({ saved: true });
    }
  } catch (error) {
    console.error('Save job error:', error);
    res.status(500).json({ error: 'Gagal menyimpan lowongan.' });
  }
});

router.post('/internships/:id/apply', requireAuth, requireRole('mahasiswa'), (req: AuthRequest, res) => {
  try {
    const internshipId = Number(req.params.id);
    const user = req.authUser!;
    const { coverLetter, portfolioUrl } = req.body as {
      coverLetter?: string;
      portfolioUrl?: string;
    };

    const job = db
      .prepare(
        `SELECT i.id, i.title, i.moderation_status, cp.user_id AS company_user_id, cp.company_name
         FROM internships i
         JOIN company_profiles cp ON cp.id = i.company_id
         WHERE i.id = ?`
      )
      .get(internshipId) as
      | {
          id: number;
          title: string;
          moderation_status: ModerationStatus;
          company_user_id: number;
          company_name: string;
        }
      | undefined;

    if (!job || job.moderation_status !== 'active') {
      res.status(404).json({ error: 'Lowongan magang tidak tersedia atau sudah ditutup.' });
      return;
    }

    const sp = db.prepare(`SELECT * FROM student_profiles WHERE user_id = ?`).get(user.id) as {
      id: number;
      cv_path: string | null;
      cv_filename: string | null;
      portfolio_url: string | null;
      portfolio_path: string | null;
    };

    const duplicate = db
      .prepare(`SELECT id FROM applications WHERE internship_id = ? AND student_id = ?`)
      .get(internshipId, sp.id);
    if (duplicate) {
      res.status(409).json({ error: 'Anda sudah melamar pada posisi magang ini.' });
      return;
    }

    const cleanCover = (coverLetter || '').trim();
    if (cleanCover.length < 20) {
      res.status(400).json({ error: 'Tuliskan motivasi/surat lamaran singkat minimal 20 karakter.' });
      return;
    }

    const resolvedPortfolio =
      validateSafeExternalUrl(portfolioUrl) ||
      sp.portfolio_url ||
      (sp.portfolio_path ? `/api/files/${sp.portfolio_path}` : null);

    const insertRes = db
      .prepare(
        `INSERT INTO applications (internship_id, student_id, cover_letter, cv_snapshot_path, cv_snapshot_name, portfolio_snapshot_url, status)
         VALUES (?, ?, ?, ?, ?, ?, 'menunggu_review')`
      )
      .run(
        internshipId,
        sp.id,
        cleanCover,
        sp.cv_path,
        sp.cv_filename,
        resolvedPortfolio
      );

    createNotification(
      job.company_user_id,
      'Pelamar Baru Diterima',
      `${user.fullName} baru saja melamar posisi ${job.title}.`,
      'application',
      '/dashboard'
    );
    createNotification(
      user.id,
      'Lamaran Terkirim',
      `Lamaran Anda untuk posisi ${job.title} di ${job.company_name} berhasil dikirim.`,
      'status',
      '/dashboard'
    );
    logActivity(
      user.id,
      user.fullName,
      'mahasiswa',
      'Mengirim Lamaran',
      'application',
      Number(insertRes.lastInsertRowid),
      `${user.fullName} melamar posisi ${job.title} di ${job.company_name}.`
    );

    res.status(201).json({ id: Number(insertRes.lastInsertRowid), status: 'menunggu_review' });
  } catch (error) {
    console.error('Apply error:', error);
    res.status(500).json({ error: 'Gagal mengirim lamaran magang.' });
  }
});

// ---------- COMPANY ROUTES ----------

router.get('/company/dashboard', requireAuth, requireRole('perusahaan'), (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const company = db
      .prepare(
        `SELECT id, user_id AS userId, company_name AS companyName, slug, industry,
                company_size AS companySize, location, website, description,
                logo_url AS logoUrl, banner_url AS bannerUrl, verified_status AS verifiedStatus,
                verified_at AS verifiedAt, created_at AS createdAt
         FROM company_profiles WHERE user_id = ?`
      )
      .get(user.id) as CompanyProfile | undefined;

    if (!company) {
      res.status(404).json({ error: 'Profil perusahaan tidak ditemukan.' });
      return;
    }

    const rawInternships = db
      .prepare(
        `SELECT i.*, cp.company_name, cp.slug AS company_slug, cp.industry AS company_industry,
                cp.logo_url AS company_logo_url, cp.verified_status AS company_verified_status,
                c.name AS category_name, c.slug AS category_slug,
                (SELECT COUNT(*) FROM applications a WHERE a.internship_id = i.id) AS applicants_count
         FROM internships i
         JOIN company_profiles cp ON cp.id = i.company_id
         JOIN categories c ON c.id = i.category_id
         WHERE i.company_id = ?
         ORDER BY i.created_at DESC`
      )
      .all(company.id) as RawInternshipRow[];

    const internships = rawInternships.map((r) => mapInternshipRow(r));

    const applicantRows = db
      .prepare(
        `SELECT a.*, i.title AS internship_title, i.work_mode, i.location AS job_location,
                sp.university, sp.major, sp.semester, sp.gpa, sp.phone, sp.location AS student_location,
                sp.bio, sp.skills_json, sp.organizations_json, sp.cv_filename, sp.cv_path,
                sp.portfolio_url, sp.portfolio_path,
                u.full_name AS student_name, u.email AS student_email,
                iv.id AS iv_id, iv.scheduled_at AS iv_scheduled_at, iv.mode AS iv_mode,
                iv.meeting_link_or_location AS iv_location, iv.interviewer_name AS iv_interviewer,
                iv.notes AS iv_notes, iv.status AS iv_status, iv.created_at AS iv_created_at
         FROM applications a
         JOIN internships i ON i.id = a.internship_id
         JOIN student_profiles sp ON sp.id = a.student_id
         JOIN users u ON u.id = sp.user_id
         LEFT JOIN interview_schedules iv ON iv.application_id = a.id
         WHERE i.company_id = ?
         ORDER BY a.created_at DESC`
      )
      .all(company.id) as Array<any>;

    const applicants: Application[] = applicantRows.map((r) => ({
      id: r.id,
      internshipId: r.internship_id,
      studentId: r.student_id,
      coverLetter: r.cover_letter,
      cvSnapshotUrl: r.cv_snapshot_path
        ? `/api/files/${r.cv_snapshot_path}`
        : r.cv_path
        ? `/api/files/${r.cv_path}`
        : null,
      cvSnapshotName: r.cv_snapshot_name || r.cv_filename || null,
      portfolioSnapshotUrl:
        r.portfolio_snapshot_url || r.portfolio_url || (r.portfolio_path ? `/api/files/${r.portfolio_path}` : null),
      status: r.status,
      companyNotes: r.company_notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      internshipTitle: r.internship_title,
      workMode: r.work_mode,
      location: r.job_location,
      studentName: r.student_name,
      studentEmail: r.student_email,
      studentUniversity: r.university,
      studentMajor: r.major,
      studentSemester: r.semester,
      studentGpa: r.gpa,
      studentPhone: r.phone,
      studentLocation: r.student_location,
      studentBio: r.bio,
      studentSkills: safeJsonParse<string[]>(r.skills_json, []),
      studentOrganizations: safeJsonParse<OrganizationExperience[]>(r.organizations_json, []),
      interview: r.iv_id
        ? {
            id: r.iv_id,
            applicationId: r.id,
            scheduledAt: r.iv_scheduled_at,
            mode: r.iv_mode,
            meetingLinkOrLocation: r.iv_location,
            interviewerName: r.iv_interviewer,
            notes: r.iv_notes || '',
            status: r.iv_status,
            createdAt: r.iv_created_at,
          }
        : null,
    }));

    const notifications = db
      .prepare(
        `SELECT id, user_id AS userId, title, message, type, link_path AS linkPath,
                is_read AS isRead, created_at AS createdAt
         FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 15`
      )
      .all(user.id)
      .map((n: any) => ({ ...n, isRead: Boolean(n.isRead) }));

    res.json({
      company,
      stats: {
        totalListings: internships.length,
        activeListings: internships.filter((i) => i.moderationStatus === 'active').length,
        totalApplicants: applicants.length,
        interviewsScheduled: applicants.filter((a) => a.interview !== null).length,
      },
      internships,
      applicants,
      notifications,
    });
  } catch (error) {
    console.error('Company dashboard error:', error);
    res.status(500).json({ error: 'Gagal memuat dashboard perusahaan.' });
  }
});

router.put('/company/profile', requireAuth, requireRole('perusahaan'), (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const { companyName, industry, companySize, location, website, description } = req.body as {
      companyName?: string;
      industry?: string;
      companySize?: string;
      location?: string;
      website?: string;
      description?: string;
    };

    if (!companyName || !companyName.trim()) {
      res.status(400).json({ error: 'Nama perusahaan wajib diisi.' });
      return;
    }

    const safeWebsite = validateSafeExternalUrl(website);

    db.prepare(
      `UPDATE company_profiles
       SET company_name = ?, industry = ?, company_size = ?, location = ?, website = ?, description = ?
       WHERE user_id = ?`
    ).run(
      companyName.trim(),
      (industry || '').trim(),
      (companySize || '11-50 Karyawan').trim(),
      (location || '').trim(),
      safeWebsite,
      (description || '').trim(),
      user.id
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Update company profile error:', error);
    res.status(500).json({ error: 'Gagal memperbarui profil perusahaan.' });
  }
});

router.post('/company/internships', requireAuth, requireRole('perusahaan'), (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const company = db
      .prepare(`SELECT id, company_name, verified_status FROM company_profiles WHERE user_id = ?`)
      .get(user.id) as { id: number; company_name: string; verified_status: VerifiedStatus } | undefined;

    if (!company) {
      res.status(404).json({ error: 'Profil perusahaan tidak ditemukan.' });
      return;
    }

    const {
      categoryId,
      title,
      location,
      workMode,
      durationMonths,
      stipendAmount,
      stipendLabel,
      description,
      responsibilities,
      qualifications,
      benefits,
      requiredSkills,
      targetMajors,
      deadline,
    } = req.body as {
      categoryId?: number;
      title?: string;
      location?: string;
      workMode?: WorkMode;
      durationMonths?: number;
      stipendAmount?: number;
      stipendLabel?: string;
      description?: string;
      responsibilities?: string[];
      qualifications?: string[];
      benefits?: string[];
      requiredSkills?: string[];
      targetMajors?: string[];
      deadline?: string;
    };

    if (!title || !title.trim() || !categoryId || !location || !workMode || !description || !deadline) {
      res.status(400).json({ error: 'Judul posisi, kategori, lokasi, sistem kerja, deskripsi, dan deadline wajib diisi.' });
      return;
    }

    const amount = Math.max(0, Number(stipendAmount) || 0);
    const computedLabel =
      stipendLabel?.trim() ||
      (amount > 0 ? `Rp ${amount.toLocaleString('id-ID')} / bulan` : 'Sertifikat & Pengalaman (Unpaid)');

    const initialModeration: ModerationStatus = company.verified_status === 'verified' ? 'active' : 'pending';

    const insertRes = db
      .prepare(
        `INSERT INTO internships (
          company_id, category_id, title, location, work_mode, duration_months,
          stipend_amount, stipend_label, description, responsibilities_json,
          qualifications_json, benefits_json, required_skills_json, target_majors_json,
          deadline, moderation_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        company.id,
        Number(categoryId),
        title.trim(),
        location.trim(),
        workMode,
        Math.max(1, Math.min(12, Number(durationMonths) || 3)),
        amount,
        computedLabel,
        description.trim(),
        JSON.stringify(Array.isArray(responsibilities) ? responsibilities.filter(Boolean) : []),
        JSON.stringify(Array.isArray(qualifications) ? qualifications.filter(Boolean) : []),
        JSON.stringify(Array.isArray(benefits) ? benefits.filter(Boolean) : []),
        JSON.stringify(Array.isArray(requiredSkills) ? requiredSkills.filter(Boolean) : []),
        JSON.stringify(Array.isArray(targetMajors) ? targetMajors.filter(Boolean) : []),
        deadline,
        initialModeration
      );

    const newId = Number(insertRes.lastInsertRowid);
    logActivity(
      user.id,
      user.fullName,
      'perusahaan',
      'Membuat Lowongan Magang',
      'internship',
      newId,
      `${company.company_name} mempublikasikan lowongan ${title.trim()}.`
    );

    res.status(201).json({ id: newId, moderationStatus: initialModeration });
  } catch (error) {
    console.error('Create internship error:', error);
    res.status(500).json({ error: 'Gagal membuat lowongan magang.' });
  }
});

router.put('/company/internships/:id', requireAuth, requireRole('perusahaan'), (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const user = req.authUser!;
    const company = db
      .prepare(`SELECT id FROM company_profiles WHERE user_id = ?`)
      .get(user.id) as { id: number } | undefined;

    if (!company) {
      res.status(404).json({ error: 'Perusahaan tidak ditemukan.' });
      return;
    }

    const existing = db
      .prepare(`SELECT id FROM internships WHERE id = ? AND company_id = ?`)
      .get(id, company.id);
    if (!existing) {
      res.status(404).json({ error: 'Lowongan tidak ditemukan atau bukan milik perusahaan Anda.' });
      return;
    }

    const {
      categoryId,
      title,
      location,
      workMode,
      durationMonths,
      stipendAmount,
      stipendLabel,
      description,
      responsibilities,
      qualifications,
      benefits,
      requiredSkills,
      targetMajors,
      deadline,
      moderationStatus,
    } = req.body as any;

    const amount = Math.max(0, Number(stipendAmount) || 0);
    const computedLabel =
      stipendLabel?.trim() ||
      (amount > 0 ? `Rp ${amount.toLocaleString('id-ID')} / bulan` : 'Sertifikat & Pengalaman (Unpaid)');

    db.prepare(
      `UPDATE internships
       SET category_id = ?, title = ?, location = ?, work_mode = ?, duration_months = ?,
           stipend_amount = ?, stipend_label = ?, description = ?, responsibilities_json = ?,
           qualifications_json = ?, benefits_json = ?, required_skills_json = ?, target_majors_json = ?,
           deadline = ?, moderation_status = COALESCE(?, moderation_status)
       WHERE id = ? AND company_id = ?`
    ).run(
      Number(categoryId),
      String(title).trim(),
      String(location).trim(),
      workMode,
      Math.max(1, Math.min(12, Number(durationMonths) || 3)),
      amount,
      computedLabel,
      String(description).trim(),
      JSON.stringify(Array.isArray(responsibilities) ? responsibilities.filter(Boolean) : []),
      JSON.stringify(Array.isArray(qualifications) ? qualifications.filter(Boolean) : []),
      JSON.stringify(Array.isArray(benefits) ? benefits.filter(Boolean) : []),
      JSON.stringify(Array.isArray(requiredSkills) ? requiredSkills.filter(Boolean) : []),
      JSON.stringify(Array.isArray(targetMajors) ? targetMajors.filter(Boolean) : []),
      deadline,
      moderationStatus === 'closed' || moderationStatus === 'active' ? moderationStatus : null,
      id,
      company.id
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Update internship error:', error);
    res.status(500).json({ error: 'Gagal memperbarui lowongan.' });
  }
});

router.delete('/company/internships/:id', requireAuth, requireRole('perusahaan'), (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const user = req.authUser!;
    const company = db
      .prepare(`SELECT id, company_name FROM company_profiles WHERE user_id = ?`)
      .get(user.id) as { id: number; company_name: string } | undefined;

    if (!company) {
      res.status(404).json({ error: 'Perusahaan tidak ditemukan.' });
      return;
    }

    const info = db
      .prepare(`DELETE FROM internships WHERE id = ? AND company_id = ?`)
      .run(id, company.id);

    if (info.changes === 0) {
      res.status(404).json({ error: 'Lowongan tidak ditemukan atau bukan milik perusahaan Anda.' });
      return;
    }

    logActivity(
      user.id,
      user.fullName,
      'perusahaan',
      'Menghapus Lowongan',
      'internship',
      id,
      `${company.company_name} menghapus lowongan #${id}.`
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete internship error:', error);
    res.status(500).json({ error: 'Gagal menghapus lowongan.' });
  }
});

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  menunggu_review: 'Menunggu Review',
  diproses: 'Diproses',
  interview: 'Interview',
  diterima: 'Diterima',
  ditolak: 'Ditolak',
};

router.patch(
  '/company/applications/:id/status',
  requireAuth,
  requireRole('perusahaan'),
  (req: AuthRequest, res) => {
    try {
      const appId = Number(req.params.id);
      const user = req.authUser!;
      const { status, companyNotes } = req.body as {
        status?: ApplicationStatus;
        companyNotes?: string;
      };

      if (!status || !STATUS_LABELS[status]) {
        res.status(400).json({ error: 'Status lamaran tidak valid.' });
        return;
      }

      const appRow = db
        .prepare(
          `SELECT a.id, i.title AS internship_title, cp.user_id AS company_user_id,
                  cp.company_name, sp.user_id AS student_user_id, u.full_name AS student_name
           FROM applications a
           JOIN internships i ON i.id = a.internship_id
           JOIN company_profiles cp ON cp.id = i.company_id
           JOIN student_profiles sp ON sp.id = a.student_id
           JOIN users u ON u.id = sp.user_id
           WHERE a.id = ?`
        )
        .get(appId) as
        | {
            id: number;
            internship_title: string;
            company_user_id: number;
            company_name: string;
            student_user_id: number;
            student_name: string;
          }
        | undefined;

      if (!appRow || appRow.company_user_id !== user.id) {
        res.status(404).json({ error: 'Lamaran tidak ditemukan atau Anda tidak memiliki akses.' });
        return;
      }

      db.prepare(
        `UPDATE applications SET status = ?, company_notes = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(status, (companyNotes || '').trim() || null, appId);

      createNotification(
        appRow.student_user_id,
        `Status Lamaran: ${STATUS_LABELS[status]}`,
        `Lamaran Anda untuk posisi ${appRow.internship_title} di ${appRow.company_name} kini berstatus "${STATUS_LABELS[status]}".`,
        status === 'diterima' ? 'accepted' : 'status',
        '/dashboard'
      );

      logActivity(
        user.id,
        user.fullName,
        'perusahaan',
        'Memperbarui Status Pelamar',
        'application',
        appId,
        `Status lamaran ${appRow.student_name} (${appRow.internship_title}) diubah menjadi ${STATUS_LABELS[status]}.`
      );

      res.json({ ok: true });
    } catch (error) {
      console.error('Update application status error:', error);
      res.status(500).json({ error: 'Gagal memperbarui status lamaran.' });
    }
  }
);

router.post(
  '/company/applications/:id/interview',
  requireAuth,
  requireRole('perusahaan'),
  (req: AuthRequest, res) => {
    try {
      const appId = Number(req.params.id);
      const user = req.authUser!;
      const { scheduledAt, mode, meetingLinkOrLocation, interviewerName, notes } = req.body as {
        scheduledAt?: string;
        mode?: 'Online' | 'Offline';
        meetingLinkOrLocation?: string;
        interviewerName?: string;
        notes?: string;
      };

      if (!scheduledAt || !mode || !meetingLinkOrLocation) {
        res.status(400).json({ error: 'Tanggal/waktu, mode, dan tautan/lokasi interview wajib diisi.' });
        return;
      }

      const appRow = db
        .prepare(
          `SELECT a.id, a.status, i.title AS internship_title, cp.user_id AS company_user_id,
                  cp.company_name, sp.user_id AS student_user_id, u.full_name AS student_name
           FROM applications a
           JOIN internships i ON i.id = a.internship_id
           JOIN company_profiles cp ON cp.id = i.company_id
           JOIN student_profiles sp ON sp.id = a.student_id
           JOIN users u ON u.id = sp.user_id
           WHERE a.id = ?`
        )
        .get(appId) as
        | {
            id: number;
            status: ApplicationStatus;
            internship_title: string;
            company_user_id: number;
            company_name: string;
            student_user_id: number;
            student_name: string;
          }
        | undefined;

      if (!appRow || appRow.company_user_id !== user.id) {
        res.status(404).json({ error: 'Lamaran tidak ditemukan atau Anda tidak memiliki akses.' });
        return;
      }

      db.prepare(
        `INSERT INTO interview_schedules (application_id, scheduled_at, mode, meeting_link_or_location, interviewer_name, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, 'scheduled')
         ON CONFLICT(application_id) DO UPDATE SET
           scheduled_at = excluded.scheduled_at,
           mode = excluded.mode,
           meeting_link_or_location = excluded.meeting_link_or_location,
           interviewer_name = excluded.interviewer_name,
           notes = excluded.notes,
           status = 'scheduled'`
      ).run(
        appId,
        scheduledAt,
        mode,
        meetingLinkOrLocation.trim(),
        (interviewerName || 'Tim Rekrutmen').trim(),
        (notes || '').trim()
      );

      if (appRow.status !== 'diterima' && appRow.status !== 'ditolak') {
        db.prepare(`UPDATE applications SET status = 'interview', updated_at = datetime('now') WHERE id = ?`).run(
          appId
        );
      }

      createNotification(
        appRow.student_user_id,
        'Jadwal Interview Baru',
        `${appRow.company_name} menjadwalkan interview (${mode}) untuk posisi ${appRow.internship_title} pada ${scheduledAt.replace('T', ' ')}.`,
        'interview',
        '/dashboard'
      );

      logActivity(
        user.id,
        user.fullName,
        'perusahaan',
        'Menjadwalkan Interview',
        'application',
        appId,
        `Interview ${mode} dijadwalkan untuk ${appRow.student_name} (${appRow.internship_title}).`
      );

      res.json({ ok: true });
    } catch (error) {
      console.error('Schedule interview error:', error);
      res.status(500).json({ error: 'Gagal menyimpan jadwal interview.' });
    }
  }
);

// ---------- NOTIFICATIONS ----------

router.get('/notifications', requireAuth, (req: AuthRequest, res) => {
  const rows = db
    .prepare(
      `SELECT id, user_id AS userId, title, message, type, link_path AS linkPath,
              is_read AS isRead, created_at AS createdAt
       FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`
    )
    .all(req.authUser!.id)
    .map((n: any) => ({ ...n, isRead: Boolean(n.isRead) }));
  res.json(rows);
});

router.patch('/notifications/:id/read', requireAuth, (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`).run(id, req.authUser!.id);
  res.json({ ok: true });
});

router.post('/notifications/read-all', requireAuth, (req: AuthRequest, res) => {
  db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(req.authUser!.id);
  res.json({ ok: true });
});

// ---------- ADMIN ROUTES ----------

router.get('/admin/dashboard', requireAuth, requireRole('admin'), (_req: AuthRequest, res) => {
  try {
    const totalStudents = (
      db.prepare(`SELECT COUNT(*) AS count FROM users WHERE role = 'mahasiswa'`).get() as { count: number }
    ).count;
    const totalCompanies = (
      db.prepare(`SELECT COUNT(*) AS count FROM company_profiles`).get() as { count: number }
    ).count;
    const verifiedCompanies = (
      db
        .prepare(`SELECT COUNT(*) AS count FROM company_profiles WHERE verified_status = 'verified'`)
        .get() as { count: number }
    ).count;
    const pendingCompanies = (
      db
        .prepare(`SELECT COUNT(*) AS count FROM company_profiles WHERE verified_status = 'pending'`)
        .get() as { count: number }
    ).count;
    const activeInternships = (
      db.prepare(`SELECT COUNT(*) AS count FROM internships WHERE moderation_status = 'active'`).get() as {
        count: number;
      }
    ).count;
    const totalApplications = (
      db.prepare(`SELECT COUNT(*) AS count FROM applications`).get() as { count: number }
    ).count;

    const companies = db
      .prepare(
        `SELECT cp.id, cp.user_id AS userId, cp.company_name AS companyName, cp.slug, cp.industry,
                cp.company_size AS companySize, cp.location, cp.website, cp.description,
                cp.verified_status AS verifiedStatus, cp.verified_at AS verifiedAt, cp.created_at AS createdAt,
                u.email AS ownerEmail, u.full_name AS ownerName,
                (SELECT COUNT(*) FROM internships i WHERE i.company_id = cp.id) AS listingsCount
         FROM company_profiles cp
         JOIN users u ON u.id = cp.user_id
         ORDER BY CASE WHEN cp.verified_status = 'pending' THEN 0 ELSE 1 END, cp.created_at DESC`
      )
      .all();

    const users = db
      .prepare(
        `SELECT id, email, full_name AS fullName, role, status, created_at AS createdAt
         FROM users
         ORDER BY created_at DESC`
      )
      .all();

    const rawInternships = db
      .prepare(
        `SELECT i.*, cp.company_name, cp.slug AS company_slug, cp.industry AS company_industry,
                cp.logo_url AS company_logo_url, cp.verified_status AS company_verified_status,
                c.name AS category_name, c.slug AS category_slug,
                (SELECT COUNT(*) FROM applications a WHERE a.internship_id = i.id) AS applicants_count
         FROM internships i
         JOIN company_profiles cp ON cp.id = i.company_id
         JOIN categories c ON c.id = i.category_id
         ORDER BY i.created_at DESC`
      )
      .all() as RawInternshipRow[];
    const internships = rawInternships.map((r) => mapInternshipRow(r));

    const categories = db
      .prepare(
        `SELECT c.id, c.name, c.slug, c.description, c.icon_name AS iconName,
                COUNT(i.id) AS internshipCount
         FROM categories c
         LEFT JOIN internships i ON i.category_id = c.id
         GROUP BY c.id
         ORDER BY c.name ASC`
      )
      .all();

    const activityLogs = db
      .prepare(
        `SELECT id, actor_user_id AS actorUserId, actor_name AS actorName, actor_role AS actorRole,
                action, target_type AS targetType, target_id AS targetId, details, created_at AS createdAt
         FROM activity_logs
         ORDER BY created_at DESC, id DESC
         LIMIT 50`
      )
      .all();

    res.json({
      stats: {
        totalStudents,
        totalCompanies,
        verifiedCompanies,
        pendingCompanies,
        activeInternships,
        totalApplications,
      },
      companies,
      users,
      internships,
      categories,
      activityLogs,
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Gagal memuat dashboard administrator.' });
  }
});

router.patch('/admin/companies/:id/verify', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body as { status?: VerifiedStatus };
    if (status !== 'verified' && status !== 'rejected' && status !== 'pending') {
      res.status(400).json({ error: 'Status verifikasi tidak valid.' });
      return;
    }

    const company = db
      .prepare(`SELECT id, user_id, company_name FROM company_profiles WHERE id = ?`)
      .get(id) as { id: number; user_id: number; company_name: string } | undefined;

    if (!company) {
      res.status(404).json({ error: 'Perusahaan tidak ditemukan.' });
      return;
    }

    const verifiedAt = status === 'verified' ? new Date().toISOString() : null;
    db.prepare(`UPDATE company_profiles SET verified_status = ?, verified_at = ? WHERE id = ?`).run(
      status,
      verifiedAt,
      id
    );

    if (status === 'verified') {
      db.prepare(
        `UPDATE internships SET moderation_status = 'active' WHERE company_id = ? AND moderation_status = 'pending'`
      ).run(id);
    }

    const label =
      status === 'verified' ? 'Terverifikasi' : status === 'rejected' ? 'Ditolak' : 'Menunggu Verifikasi';

    createNotification(
      company.user_id,
      `Verifikasi Perusahaan: ${label}`,
      status === 'verified'
        ? `Selamat! Akun ${company.company_name} telah terverifikasi dan lencana verifikasi kini tampil di profil publik.`
        : `Status verifikasi perusahaan ${company.company_name} diperbarui menjadi ${label}.`,
      status === 'verified' ? 'accepted' : 'info',
      '/dashboard'
    );

    logActivity(
      req.authUser!.id,
      req.authUser!.fullName,
      'admin',
      `Verifikasi Perusahaan (${label})`,
      'company',
      id,
      `Perusahaan ${company.company_name} diubah status verifikasinya menjadi ${label}.`
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Verify company error:', error);
    res.status(500).json({ error: 'Gagal memperbarui status verifikasi perusahaan.' });
  }
});

router.patch('/admin/users/:id/status', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body as { status?: 'active' | 'suspended' };
    if (status !== 'active' && status !== 'suspended') {
      res.status(400).json({ error: 'Status pengguna tidak valid.' });
      return;
    }
    if (id === req.authUser!.id) {
      res.status(400).json({ error: 'Anda tidak dapat menonaktifkan akun administrator Anda sendiri.' });
      return;
    }

    const target = db.prepare(`SELECT id, full_name FROM users WHERE id = ?`).get(id) as
      | { id: number; full_name: string }
      | undefined;
    if (!target) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
      return;
    }

    db.prepare(`UPDATE users SET status = ? WHERE id = ?`).run(status, id);
    if (status === 'suspended') {
      db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(id);
    }

    logActivity(
      req.authUser!.id,
      req.authUser!.fullName,
      'admin',
      status === 'suspended' ? 'Suspend Pengguna' : 'Aktifkan Pengguna',
      'user',
      id,
      `Akun ${target.full_name} diubah menjadi ${status}.`
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Gagal mengubah status pengguna.' });
  }
});

router.patch(
  '/admin/internships/:id/moderation',
  requireAuth,
  requireRole('admin'),
  (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body as { status?: ModerationStatus };
      if (!status || !['active', 'pending', 'flagged', 'closed'].includes(status)) {
        res.status(400).json({ error: 'Status moderasi tidak valid.' });
        return;
      }

      const job = db
        .prepare(
          `SELECT i.id, i.title, cp.user_id AS company_user_id
           FROM internships i JOIN company_profiles cp ON cp.id = i.company_id WHERE i.id = ?`
        )
        .get(id) as { id: number; title: string; company_user_id: number } | undefined;

      if (!job) {
        res.status(404).json({ error: 'Lowongan tidak ditemukan.' });
        return;
      }

      db.prepare(`UPDATE internships SET moderation_status = ? WHERE id = ?`).run(status, id);

      createNotification(
        job.company_user_id,
        'Moderasi Lowongan',
        `Status moderasi lowongan "${job.title}" diperbarui oleh Administrator menjadi "${status}".`,
        'info',
        '/dashboard'
      );

      logActivity(
        req.authUser!.id,
        req.authUser!.fullName,
        'admin',
        `Moderasi Lowongan (${status})`,
        'internship',
        id,
        `Lowongan "${job.title}" diatur ke status ${status}.`
      );

      res.json({ ok: true });
    } catch (error) {
      console.error('Moderation error:', error);
      res.status(500).json({ error: 'Gagal memperbarui moderasi lowongan.' });
    }
  }
);

router.post('/admin/categories', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
  try {
    const { name, description, iconName } = req.body as {
      name?: string;
      description?: string;
      iconName?: string;
    };
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Nama kategori wajib diisi.' });
      return;
    }
    const cleanName = name.trim();
    const slug = slugify(cleanName);
    const exists = db.prepare(`SELECT id FROM categories WHERE slug = ? OR name = ?`).get(slug, cleanName);
    if (exists) {
      res.status(409).json({ error: 'Kategori dengan nama tersebut sudah ada.' });
      return;
    }

    const result = db
      .prepare(`INSERT INTO categories (name, slug, description, icon_name) VALUES (?, ?, ?, ?)`)
      .run(cleanName, slug, (description || '').trim(), (iconName || 'Briefcase').trim());

    const catId = Number(result.lastInsertRowid);
    logActivity(
      req.authUser!.id,
      req.authUser!.fullName,
      'admin',
      'Tambah Kategori',
      'category',
      catId,
      `Kategori baru "${cleanName}" ditambahkan.`
    );

    res.status(201).json({ id: catId, name: cleanName, slug });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Gagal menambahkan kategori.' });
  }
});

router.delete('/admin/categories/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const refCount = (
      db.prepare(`SELECT COUNT(*) AS count FROM internships WHERE category_id = ?`).get(id) as {
        count: number;
      }
    ).count;

    if (refCount > 0) {
      res.status(409).json({
        error: `Kategori tidak dapat dihapus karena masih digunakan oleh ${refCount} lowongan aktif.`,
      });
      return;
    }

    db.prepare(`DELETE FROM categories WHERE id = ?`).run(id);
    logActivity(
      req.authUser!.id,
      req.authUser!.fullName,
      'admin',
      'Hapus Kategori',
      'category',
      id,
      `Kategori #${id} dihapus.`
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Gagal menghapus kategori.' });
  }
});

// ---------- SECURE FILE SERVING ----------

router.get('/files/:filename', requireAuth, (req: AuthRequest, res) => {
  try {
    const rawName = String(req.params.filename || '');
    const safeName = path.basename(rawName);
    if (!safeName || safeName !== rawName) {
      res.status(400).json({ error: 'Nama berkas tidak valid.' });
      return;
    }

    const resolvedPath = path.resolve(uploadsDir, safeName);
    if (!resolvedPath.startsWith(uploadsDir + path.sep)) {
      res.status(403).json({ error: 'Akses berkas ditolak.' });
      return;
    }

    if (!fs.existsSync(resolvedPath)) {
      res.status(404).json({ error: 'Berkas tidak ditemukan.' });
      return;
    }

    // Access check: admin, owner student, or company whose job received application with this file
    const user = req.authUser!;
    if (user.role === 'mahasiswa') {
      const ownsFile = db
        .prepare(`SELECT id FROM student_profiles WHERE user_id = ? AND (cv_path = ? OR portfolio_path = ?)`)
        .get(user.id, safeName, safeName);
      if (!ownsFile) {
        res.status(403).json({ error: 'Anda tidak berwenang mengakses berkas ini.' });
        return;
      }
    } else if (user.role === 'perusahaan') {
      const companyHasAccess = db
        .prepare(
          `SELECT a.id
           FROM applications a
           JOIN internships i ON i.id = a.internship_id
           JOIN company_profiles cp ON cp.id = i.company_id
           JOIN student_profiles sp ON sp.id = a.student_id
           WHERE cp.user_id = ?
             AND (a.cv_snapshot_path = ? OR sp.cv_path = ? OR sp.portfolio_path = ?)
           LIMIT 1`
        )
        .get(user.id, safeName, safeName, safeName);
      if (!companyHasAccess) {
        res.status(403).json({ error: 'Perusahaan hanya dapat mengakses berkas dari pelamarnya.' });
        return;
      }
    }

    res.sendFile(resolvedPath);
  } catch (error) {
    console.error('File serve error:', error);
    res.status(500).json({ error: 'Gagal membuka berkas.' });
  }
});

export default router;
