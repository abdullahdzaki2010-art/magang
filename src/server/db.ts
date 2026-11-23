import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dataDir = path.resolve(process.cwd(), 'data');
export const uploadsDir = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'magangkeren.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('mahasiswa', 'perusahaan', 'admin')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS student_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      university TEXT NOT NULL DEFAULT '',
      major TEXT NOT NULL DEFAULT '',
      semester INTEGER NOT NULL DEFAULT 6,
      gpa TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      skills_json TEXT NOT NULL DEFAULT '[]',
      organizations_json TEXT NOT NULL DEFAULT '[]',
      cv_filename TEXT,
      cv_path TEXT,
      portfolio_url TEXT,
      portfolio_filename TEXT,
      portfolio_path TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS company_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      company_name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      industry TEXT NOT NULL DEFAULT '',
      company_size TEXT NOT NULL DEFAULT '11-50 Karyawan',
      location TEXT NOT NULL DEFAULT 'Jakarta',
      website TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      logo_url TEXT,
      banner_url TEXT,
      verified_status TEXT NOT NULL DEFAULT 'pending' CHECK(verified_status IN ('pending', 'verified', 'rejected')),
      verified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      icon_name TEXT NOT NULL DEFAULT 'Briefcase',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS internships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      title TEXT NOT NULL,
      location TEXT NOT NULL,
      work_mode TEXT NOT NULL CHECK(work_mode IN ('WFO', 'WFH', 'Hybrid')),
      duration_months INTEGER NOT NULL DEFAULT 3,
      stipend_amount INTEGER NOT NULL DEFAULT 0,
      stipend_label TEXT NOT NULL DEFAULT 'Berbayar',
      description TEXT NOT NULL,
      responsibilities_json TEXT NOT NULL DEFAULT '[]',
      qualifications_json TEXT NOT NULL DEFAULT '[]',
      benefits_json TEXT NOT NULL DEFAULT '[]',
      required_skills_json TEXT NOT NULL DEFAULT '[]',
      target_majors_json TEXT NOT NULL DEFAULT '[]',
      deadline TEXT NOT NULL,
      moderation_status TEXT NOT NULL DEFAULT 'active' CHECK(moderation_status IN ('active', 'pending', 'flagged', 'closed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      internship_id INTEGER NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
      cover_letter TEXT NOT NULL DEFAULT '',
      cv_snapshot_path TEXT,
      cv_snapshot_name TEXT,
      portfolio_snapshot_url TEXT,
      status TEXT NOT NULL DEFAULT 'menunggu_review' CHECK(status IN ('menunggu_review', 'diproses', 'interview', 'diterima', 'ditolak')),
      company_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(internship_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS saved_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      internship_id INTEGER NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, internship_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      link_path TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS interview_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
      scheduled_at TEXT NOT NULL,
      mode TEXT NOT NULL CHECK(mode IN ('Online', 'Offline')),
      meeting_link_or_location TEXT NOT NULL,
      interviewer_name TEXT NOT NULL DEFAULT 'Tim Rekrutmen',
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER,
      details TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_internships_company ON internships(company_id);
    CREATE INDEX IF NOT EXISTS idx_internships_category ON internships(category_id);
    CREATE INDEX IF NOT EXISTS idx_applications_internship ON applications(internship_id);
    CREATE INDEX IF NOT EXISTS idx_applications_student ON applications(student_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  `);
}

export function logActivity(
  actorUserId: number | null,
  actorName: string,
  actorRole: string,
  action: string,
  targetType: string,
  targetId: number | null,
  details: string
): void {
  db.prepare(
    `INSERT INTO activity_logs (actor_user_id, actor_name, actor_role, action, target_type, target_id, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(actorUserId, actorName, actorRole, action, targetType, targetId, details);
}

export function createNotification(
  userId: number,
  title: string,
  message: string,
  type: string,
  linkPath: string | null = null
): void {
  db.prepare(
    `INSERT INTO notifications (user_id, title, message, type, link_path)
     VALUES (?, ?, ?, ?, ?)`
  ).run(userId, title, message, type, linkPath);
}
