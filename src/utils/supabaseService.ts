import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MonthSchedule, Staff, ShiftSwapRecord, HandoverReport, DailyTask, ShiftCode } from '../types';
import { SEPTEMBER_2026_STAFF_LIST } from '../data/septemberSchedule';
import { OCTOBER_2026_STAFF_LIST } from '../data/octoberSchedule';
import { SHIFT_TASKS_TEMPLATE, INITIAL_STAFF_LIST } from '../data/initialSchedule';
import { INDONESIAN_MONTH_NAMES } from './scheduler';

const SUPABASE_URL_KEY = 'sr_supabase_project_url';
const SUPABASE_KEY_KEY = 'sr_supabase_anon_key';

/**
 * Sanitize Supabase Project URL (strip trailing /rest/v1 or trailing slashes)
 */
export function sanitizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let clean = rawUrl.trim();
  clean = clean.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  return clean;
}

const DEFAULT_FALLBACK_URL = 'https://iytlasbgerhgvyomqxul.supabase.co';
const DEFAULT_FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5dGxhc2JnZXJoZ3Z5b21xeHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5ODgxMTgsImV4cCI6MjEwNjU2NDExOH0.A-3sbjcvRyYtwNKG2Wmqr836NMl82m8vJURFZQma758';

/**
 * Get stored Supabase configuration from localStorage with environment fallback (Cloudflare / Vite)
 */
export function getStoredSupabaseConfig(): { url: string; key: string } {
  try {
    const envUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || '';
    const envKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || '';
    const localUrl = localStorage.getItem(SUPABASE_URL_KEY) || '';
    const localKey = localStorage.getItem(SUPABASE_KEY_KEY) || '';

    // Prioritize environment secrets set by user/Cloudflare, fallback to localStorage, then default project
    const rawUrl = envUrl || localUrl || DEFAULT_FALLBACK_URL;
    const rawKey = envKey || localKey || DEFAULT_FALLBACK_KEY;

    const url = sanitizeSupabaseUrl(rawUrl);
    const key = rawKey.trim();
    return { url, key };
  } catch {
    return { url: DEFAULT_FALLBACK_URL, key: DEFAULT_FALLBACK_KEY };
  }
}

/**
 * Save Supabase configuration to localStorage
 */
export function saveStoredSupabaseConfig(url: string, key: string): void {
  try {
    const cleanUrl = sanitizeSupabaseUrl(url);
    const cleanKey = key.trim();
    localStorage.setItem(SUPABASE_URL_KEY, cleanUrl);
    localStorage.setItem(SUPABASE_KEY_KEY, cleanKey);
    if (cleanUrl && cleanKey) {
      try {
        window.dispatchEvent(new CustomEvent('supabase_config_updated', { detail: { url: cleanUrl, key: cleanKey } }));
      } catch {}
    }
  } catch (e) {
    console.warn('Failed to save Supabase config to localStorage:', e);
  }
}

/**
 * Initialize background sync of Supabase credentials across tabs/windows
 */
export function initSupabaseGlobalSync(onUpdated?: (cfg: { url: string; key: string }) => void): () => void {
  const handler = (e: any) => {
    if (e.detail?.url && e.detail?.key) {
      onUpdated?.(e.detail);
    }
  };
  const storageHandler = (e: StorageEvent) => {
    if (e.key === SUPABASE_URL_KEY || e.key === SUPABASE_KEY_KEY) {
      const cfg = getStoredSupabaseConfig();
      if (cfg.url && cfg.key) {
        onUpdated?.(cfg);
      }
    }
  };

  window.addEventListener('supabase_config_updated', handler);
  window.addEventListener('storage', storageHandler);

  return () => {
    window.removeEventListener('supabase_config_updated', handler);
    window.removeEventListener('storage', storageHandler);
  };
}

/**
 * Create a Supabase client with given or stored credentials
 */
export function getSupabaseClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const { url, key } = getStoredSupabaseConfig();
  const finalUrl = sanitizeSupabaseUrl(customUrl || url);
  const finalKey = customKey?.trim() || key;

  if (!finalUrl || !finalKey) {
    return null;
  }

  try {
    return createClient(finalUrl, finalKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (err) {
    console.error('Error initializing Supabase client:', err);
    return null;
  }
}

/**
 * Test connectivity to Supabase project
 */
export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
  try {
    const cleanUrl = sanitizeSupabaseUrl(url);
    if (!cleanUrl.startsWith('https://')) {
      return { success: false, message: 'URL Supabase harus diawali dengan https:// (contoh: https://xxxx.supabase.co)' };
    }
    const client = createClient(cleanUrl, key);
    // Simple probe on staff table
    const { error } = await client.from('staff').select('count', { count: 'exact', head: true });
    
    if (error) {
      if (
        error.code === 'PGRST116' || 
        error.code === 'PGRST205' || 
        error.message.includes('Could not find the table') || 
        error.message.includes('relation "public.staff" does not exist')
      ) {
        return { 
          success: true, 
          message: 'Koneksi ke Supabase berhasil terhubung! Namun tabel "staff" belum dibuat di database. Silakan jalankan skrip SQL struktur tabel di menu SQL Editor Supabase terlebih dahulu.' 
        };
      }
      return { success: false, message: `Error Supabase (${error.code || 'API'}): ${error.message}` };
    }
    return { success: true, message: 'Koneksi berhasil! Basis data Supabase siap menerima migrasi data.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Gagal terhubung ke Supabase. Periksa kembali URL dan Anon Key Anda.' };
  }
}

/**
 * Escape string for SQL literal
 */
function escapeSqlString(str: string | null | undefined): string {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

/**
 * Generate full SQL DDL (Table Structure) Script for Supabase
 */
export function generateSupabaseSchemaSQL(): string {
  return `-- ==============================================================================
-- SKRIP STRUKTUR TABEL LENGKAP UNTUK SUPABASE (POSTGRESQL)
-- SISTEM JADWAL SHIF WALI ASUH & ASRAMA
-- ==============================================================================
-- Jalankan di: Supabase Dashboard -> SQL Editor -> New Query -> Run

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABEL STAFF
CREATE TABLE IF NOT EXISTS public.staff (
    id INTEGER PRIMARY KEY,
    code VARCHAR(10),
    name VARCHAR(150) NOT NULL,
    gender VARCHAR(2) CHECK (gender IN ('L', 'P')),
    jenjang VARCHAR(10) DEFAULT '-',
    role VARCHAR(50) DEFAULT 'Wali Asuh',
    group_name VARCHAR(50),
    initials VARCHAR(10),
    phone VARCHAR(30),
    nip VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABEL SCHEDULES (HEADER & RAW JSON)
CREATE TABLE IF NOT EXISTS public.schedules (
    id VARCHAR(50) PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    total_days INTEGER NOT NULL,
    days_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by VARCHAR(100) DEFAULT 'Admin',
    CONSTRAINT uq_schedules_year_month UNIQUE (year, month)
);

-- 3. TABEL SCHEDULE_ASSIGNMENTS (RELASIONAL)
CREATE TABLE IF NOT EXISTS public.schedule_assignments (
    id BIGSERIAL PRIMARY KEY,
    schedule_id VARCHAR(50) REFERENCES public.schedules(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    day INTEGER NOT NULL,
    staff_id INTEGER REFERENCES public.staff(id) ON DELETE CASCADE,
    shift_code VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_schedule_assignment UNIQUE (year, month, day, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_ymd ON public.schedule_assignments(year, month, day);
CREATE INDEX IF NOT EXISTS idx_assignments_staff ON public.schedule_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_assignments_shift ON public.schedule_assignments(shift_code);

-- 4. TABEL SHIFT_SWAPS
CREATE TABLE IF NOT EXISTS public.shift_swaps (
    id VARCHAR(100) PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    swap_type VARCHAR(30) DEFAULT 'swap',
    day1 INTEGER NOT NULL,
    staff1_id INTEGER REFERENCES public.staff(id) ON DELETE SET NULL,
    staff1_name VARCHAR(150) NOT NULL,
    staff1_old_shift VARCHAR(10) NOT NULL,
    staff1_new_shift VARCHAR(10) NOT NULL,
    day2 INTEGER,
    staff2_id INTEGER REFERENCES public.staff(id) ON DELETE SET NULL,
    staff2_name VARCHAR(150),
    staff2_old_shift VARCHAR(10),
    staff2_new_shift VARCHAR(10),
    reason TEXT DEFAULT '',
    auto_lp_applied BOOLEAN DEFAULT FALSE,
    undone BOOLEAN DEFAULT FALSE,
    approved_by VARCHAR(100) DEFAULT 'Admin',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_swaps_year_month ON public.shift_swaps(year, month);
CREATE INDEX IF NOT EXISTS idx_swaps_created_at ON public.shift_swaps(created_at DESC);

-- 5. TABEL HANDOVER_REPORTS
CREATE TABLE IF NOT EXISTS public.handover_reports (
    id VARCHAR(100) PRIMARY KEY,
    date_str DATE NOT NULL,
    day INTEGER NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    shift_type VARCHAR(40) NOT NULL,
    handover_time VARCHAR(20),
    outgoing_staff_ids INTEGER[] DEFAULT '{}',
    outgoing_staff_names TEXT[] DEFAULT '{}',
    incoming_staff_ids INTEGER[] DEFAULT '{}',
    incoming_staff_names TEXT[] DEFAULT '{}',
    student_count_total INTEGER DEFAULT 0,
    student_count_present INTEGER DEFAULT 0,
    student_count_permit INTEGER DEFAULT 0,
    student_count_sick INTEGER DEFAULT 0,
    student_count_fasting INTEGER DEFAULT 0,
    sick_students JSONB DEFAULT '[]'::jsonb,
    permits JSONB DEFAULT '[]'::jsonb,
    cleanliness_status VARCHAR(50) DEFAULT 'Cukup Bersih',
    discipline_status VARCHAR(50) DEFAULT 'Kondusif & Tertib',
    special_incidents TEXT DEFAULT '',
    completed_activities JSONB DEFAULT '[]'::jsonb,
    inventory_notes TEXT DEFAULT '',
    notes_for_next_shift TEXT DEFAULT '',
    submitted_by VARCHAR(100) NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_handover_date ON public.handover_reports(date_str DESC);

-- 6. TABEL SOP_TEMPLATES
CREATE TABLE IF NOT EXISTS public.sop_templates (
    id VARCHAR(100) PRIMARY KEY,
    shift_code VARCHAR(10) NOT NULL,
    time_range VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    category VARCHAR(30) DEFAULT 'presensi',
    priority VARCHAR(20) DEFAULT 'normal',
    order_num INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABEL DAILY_TASKS
CREATE TABLE IF NOT EXISTS public.daily_tasks (
    id VARCHAR(150) PRIMARY KEY,
    date_key VARCHAR(20) NOT NULL,
    staff_id INTEGER REFERENCES public.staff(id) ON DELETE CASCADE,
    shift_code VARCHAR(10) NOT NULL,
    task_id VARCHAR(100) NOT NULL,
    time_range VARCHAR(30),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    completed_by VARCHAR(100),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_tasks_date_staff ON public.daily_tasks(date_key, staff_id);

-- 8. TABEL ANNOUNCEMENTS (PENGUMUMAN BERJALAN & BANNER)
CREATE TABLE IF NOT EXISTS public.announcements (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
    text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    category VARCHAR(30) DEFAULT 'info',
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by VARCHAR(100) DEFAULT 'Admin'
);

-- 9. TABEL MEDICAL_PLANS (REKAM MEDIS & PERAWATAN SANTRI SAKIT)
CREATE TABLE IF NOT EXISTS public.medical_plans (
    id VARCHAR(100) PRIMARY KEY,
    student_id INTEGER NOT NULL DEFAULT 1,
    student_name VARCHAR(150) NOT NULL,
    grade VARCHAR(20) DEFAULT '-',
    dorm_room VARCHAR(50) DEFAULT '-',
    diagnosis TEXT NOT NULL,
    symptoms TEXT DEFAULT '',
    medicines JSONB DEFAULT '[]'::jsonb,
    treatment_location VARCHAR(50) DEFAULT 'UKS',
    diet_notes TEXT DEFAULT '',
    is_fasting BOOLEAN DEFAULT FALSE,
    special_care_notes TEXT DEFAULT '',
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(30) DEFAULT 'rencana',
    reported_by VARCHAR(100) DEFAULT 'Wali Asuh',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. TABEL STUDENT_NOTES (CATATAN PERKEMBANGAN & PORTOFOLIO SISWA)
CREATE TABLE IF NOT EXISTS public.student_notes (
    id VARCHAR(100) PRIMARY KEY,
    student_no INTEGER NOT NULL,
    student_name VARCHAR(150) NOT NULL,
    author_id INTEGER,
    author_name VARCHAR(150) NOT NULL,
    date_str VARCHAR(20) NOT NULL,
    category VARCHAR(50) DEFAULT 'Karakter & Kedisiplinan',
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. TABEL STUDENT_OVERRIDES (DATA KUSTOM PROFIL SISWA)
CREATE TABLE IF NOT EXISTS public.student_overrides (
    student_no INTEGER PRIMARY KEY,
    data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. TABEL LEAVE_PERMISSIONS (SURAT IZIN & CUTI PETUGAS WALI ASUH)
CREATE TABLE IF NOT EXISTS public.leave_permissions (
    id VARCHAR(100) PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    day INTEGER NOT NULL,
    staff_id INTEGER REFERENCES public.staff(id) ON DELETE SET NULL,
    staff_name VARCHAR(150) NOT NULL,
    leave_type VARCHAR(50) NOT NULL,
    reason TEXT DEFAULT '',
    proof_url TEXT,
    proof_file_name VARCHAR(255),
    status VARCHAR(30) DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. TABEL MORNING_POSTS, P5_ASSIGNMENTS, PUSH & SYSTEM_SETTINGS
CREATE TABLE IF NOT EXISTS public.morning_post_options (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
    options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.morning_posts (
    schedule_id VARCHAR(50) PRIMARY KEY,
    assignments_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.p5_task_options (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
    options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.p5_assignments (
    schedule_id VARCHAR(50) PRIMARY KEY,
    assignments_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id VARCHAR(150) PRIMARY KEY,
    staff_id INTEGER,
    endpoint TEXT NOT NULL,
    keys_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    device_info TEXT DEFAULT '',
    last_active TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. KEBIJAKAN ROW LEVEL SECURITY (RLS)
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sop_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.morning_post_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.morning_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p5_task_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p5_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow all for anon and auth on staff" ON public.staff;
    CREATE POLICY "Allow all for anon and auth on staff" ON public.staff FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for anon and auth on schedules" ON public.schedules;
    CREATE POLICY "Allow all for anon and auth on schedules" ON public.schedules FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for anon and auth on assignments" ON public.schedule_assignments;
    CREATE POLICY "Allow all for anon and auth on assignments" ON public.schedule_assignments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for anon and auth on swaps" ON public.shift_swaps;
    CREATE POLICY "Allow all for anon and auth on swaps" ON public.shift_swaps FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for anon and auth on handover" ON public.handover_reports;
    CREATE POLICY "Allow all for anon and auth on handover" ON public.handover_reports FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for anon and auth on sop_templates" ON public.sop_templates;
    CREATE POLICY "Allow all for anon and auth on sop_templates" ON public.sop_templates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for anon and auth on daily_tasks" ON public.daily_tasks;
    CREATE POLICY "Allow all for anon and auth on daily_tasks" ON public.daily_tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on announcements" ON public.announcements;
    CREATE POLICY "Allow all on announcements" ON public.announcements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on medical_plans" ON public.medical_plans;
    CREATE POLICY "Allow all on medical_plans" ON public.medical_plans FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on student_notes" ON public.student_notes;
    CREATE POLICY "Allow all on student_notes" ON public.student_notes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on student_overrides" ON public.student_overrides;
    CREATE POLICY "Allow all on student_overrides" ON public.student_overrides FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on leave_permissions" ON public.leave_permissions;
    CREATE POLICY "Allow all on leave_permissions" ON public.leave_permissions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on morning_post_options" ON public.morning_post_options;
    CREATE POLICY "Allow all on morning_post_options" ON public.morning_post_options FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on morning_posts" ON public.morning_posts;
    CREATE POLICY "Allow all on morning_posts" ON public.morning_posts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on p5_task_options" ON public.p5_task_options;
    CREATE POLICY "Allow all on p5_task_options" ON public.p5_task_options FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on p5_assignments" ON public.p5_assignments;
    CREATE POLICY "Allow all on p5_assignments" ON public.p5_assignments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on push_subscriptions" ON public.push_subscriptions;
    CREATE POLICY "Allow all on push_subscriptions" ON public.push_subscriptions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on system_settings" ON public.system_settings;
    CREATE POLICY "Allow all on system_settings" ON public.system_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
END $$;

-- 15. PUBLIKASI REALTIME SUPABASE
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE 
        public.schedules,
        public.staff,
        public.shift_swaps,
        public.handover_reports,
        public.daily_tasks,
        public.announcements,
        public.medical_plans,
        public.student_notes,
        public.student_overrides,
        public.leave_permissions,
        public.morning_posts,
        public.p5_assignments,
        public.system_settings;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
`;
}

/**
 * Generate full SQL Data INSERT statements using current live application data
 */
export function generateSupabaseDataSQL(
  schedule: MonthSchedule,
  staffList: Staff[] = SEPTEMBER_2026_STAFF_LIST,
  swapLogs: ShiftSwapRecord[] = [],
  handoverReports: HandoverReport[] = [],
  sopTasks: DailyTask[] = SHIFT_TASKS_TEMPLATE
): string {
  const lines: string[] = [];

  lines.push(`-- ==============================================================================`);
  lines.push(`-- SKRIP MIGRASI DATA LENGKAP KE SUPABASE`);
  lines.push(`-- DI-GENERATE OTOMATIS DARI DATA AKTIF SISTEM JADWAL SHIF WALI ASUH`);
  lines.push(`-- Waktu Generate: ${new Date().toISOString()}`);
  lines.push(`-- ==============================================================================\n`);

  // 1. Staff Insert
  lines.push(`-- 1. INSERT DATA PERSONEL WALI ASUH (${staffList.length} PERSONEL)`);
  lines.push(`INSERT INTO public.staff (id, code, name, gender, jenjang, role, group_name, initials, phone) VALUES`);
  const staffValues = staffList.map((s) => {
    return `  (${s.id}, ${escapeSqlString(s.code || '')}, ${escapeSqlString(s.name)}, ${escapeSqlString(s.gender || 'L')}, ${escapeSqlString(s.jenjang || '-')}, ${escapeSqlString(s.role || 'Wali Asuh')}, ${escapeSqlString(s.group || '')}, ${escapeSqlString(s.initials || '')}, ${escapeSqlString(s.phone || '')})`;
  });
  lines.push(staffValues.join(',\n'));
  lines.push(`ON CONFLICT (id) DO UPDATE SET`);
  lines.push(`  code = EXCLUDED.code, name = EXCLUDED.name, gender = EXCLUDED.gender, jenjang = EXCLUDED.jenjang,`);
  lines.push(`  role = EXCLUDED.role, group_name = EXCLUDED.group_name, initials = EXCLUDED.initials, phone = EXCLUDED.phone;\n`);

  // 2. SOP Templates Insert
  if (sopTasks && sopTasks.length > 0) {
    lines.push(`-- 2. INSERT MASTER CHECKLIST TUGAS SOP (${sopTasks.length} TUGAS)`);
    lines.push(`INSERT INTO public.sop_templates (id, shift_code, time_range, title, description, category, priority, order_num) VALUES`);
    const sopValues = sopTasks.map((t, idx) => {
      return `  (${escapeSqlString(t.id)}, ${escapeSqlString(t.shiftCode)}, ${escapeSqlString(t.time)}, ${escapeSqlString(t.title)}, ${escapeSqlString(t.description || '')}, ${escapeSqlString(t.category || 'presensi')}, ${escapeSqlString(t.priority || 'normal')}, ${idx + 1})`;
    });
    lines.push(sopValues.join(',\n'));
    lines.push(`ON CONFLICT (id) DO UPDATE SET`);
    lines.push(`  shift_code = EXCLUDED.shift_code, time_range = EXCLUDED.time_range, title = EXCLUDED.title, description = EXCLUDED.description;\n`);
  }

  // 3. Schedule Master Document Insert
  lines.push(`-- 3. INSERT INDUK JADWAL BULAN ${schedule.year}-${String(schedule.month).padStart(2, '0')} (${schedule.totalDays} HARI)`);
  const scheduleId = `schedule_${schedule.year}_${String(schedule.month).padStart(2, '0')}`;
  const daysJsonString = JSON.stringify(schedule.days).replace(/'/g, "''");
  lines.push(`INSERT INTO public.schedules (id, year, month, total_days, days_json, updated_at, updated_by) VALUES`);
  lines.push(`  (${escapeSqlString(scheduleId)}, ${schedule.year}, ${schedule.month}, ${schedule.totalDays}, '${daysJsonString}'::jsonb, now(), 'Admin Migration')`);
  lines.push(`ON CONFLICT (id) DO UPDATE SET`);
  lines.push(`  days_json = EXCLUDED.days_json, total_days = EXCLUDED.total_days, updated_at = now();\n`);

  // 4. Normalized Schedule Assignments Insert
  lines.push(`-- 4. INSERT PENUGASAN SHIF RELASIONAL (SCHEDULE_ASSIGNMENTS)`);
  const assignmentRows: string[] = [];
  for (let day = 1; day <= schedule.totalDays; day++) {
    const dayShifts = schedule.days[day];
    if (dayShifts) {
      for (const staffIdStr in dayShifts) {
        const staffId = Number(staffIdStr);
        const shiftCode = dayShifts[staffId];
        if (shiftCode) {
          assignmentRows.push(
            `  ('${scheduleId}', ${schedule.year}, ${schedule.month}, ${day}, ${staffId}, ${escapeSqlString(shiftCode)})`
          );
        }
      }
    }
  }

  if (assignmentRows.length > 0) {
    // Break into chunks of 500 to avoid query size limits
    const chunkSize = 300;
    for (let i = 0; i < assignmentRows.length; i += chunkSize) {
      const chunk = assignmentRows.slice(i, i + chunkSize);
      lines.push(`INSERT INTO public.schedule_assignments (schedule_id, year, month, day, staff_id, shift_code) VALUES`);
      lines.push(chunk.join(',\n'));
      lines.push(`ON CONFLICT (year, month, day, staff_id) DO UPDATE SET shift_code = EXCLUDED.shift_code, updated_at = now();\n`);
    }
  }

  // 5. Shift Swaps Insert (if any)
  if (swapLogs && swapLogs.length > 0) {
    lines.push(`-- 5. INSERT LOGS PERTUKARAN SHIF (${swapLogs.length} REKOR)`);
    lines.push(`INSERT INTO public.shift_swaps (id, year, month, swap_type, day1, staff1_id, staff1_name, staff1_old_shift, staff1_new_shift, day2, staff2_id, staff2_name, staff2_old_shift, staff2_new_shift, reason, auto_lp_applied, undone, approved_by) VALUES`);
    const swapValues = swapLogs.map((sw) => {
      return `  (${escapeSqlString(sw.id)}, ${sw.year}, ${sw.month}, ${escapeSqlString(sw.type)}, ${sw.day1}, ${sw.staff1Id}, ${escapeSqlString(sw.staff1Name)}, ${escapeSqlString(sw.staff1OldShift)}, ${escapeSqlString(sw.staff1NewShift)}, ${sw.day2 || 'NULL'}, ${sw.staff2Id || 'NULL'}, ${escapeSqlString(sw.staff2Name || '')}, ${escapeSqlString(sw.staff2OldShift || '')}, ${escapeSqlString(sw.staff2NewShift || '')}, ${escapeSqlString(sw.reason || '')}, ${sw.autoLpApplied ? 'TRUE' : 'FALSE'}, ${sw.undone ? 'TRUE' : 'FALSE'}, 'Admin')`;
    });
    lines.push(swapValues.join(',\n'));
    lines.push(`ON CONFLICT (id) DO NOTHING;\n`);
  }

  // 6. Handover Reports Insert (if any)
  if (handoverReports && handoverReports.length > 0) {
    lines.push(`-- 6. INSERT JURNAL SERAH TERIMA PIKET (${handoverReports.length} LAPORAN)`);
    for (const r of handoverReports) {
      const sickJson = JSON.stringify(r.sickStudents || []).replace(/'/g, "''");
      const permitsJson = JSON.stringify(r.permits || []).replace(/'/g, "''");
      const actsJson = JSON.stringify(r.completedActivities || []).replace(/'/g, "''");
      const outIds = (r.outgoingStaffIds || []).join(',');
      const incIds = (r.incomingStaffIds || []).join(',');
      const outNames = (r.outgoingStaffNames || []).map((n) => `"${n.replace(/"/g, '""')}"`).join(',');
      const incNames = (r.incomingStaffNames || []).map((n) => `"${n.replace(/"/g, '""')}"`).join(',');

      lines.push(`INSERT INTO public.handover_reports (`);
      lines.push(`  id, date_str, day, month, year, shift_type, handover_time,`);
      lines.push(`  outgoing_staff_ids, outgoing_staff_names, incoming_staff_ids, incoming_staff_names,`);
      lines.push(`  student_count_total, student_count_present, student_count_permit, student_count_sick,`);
      lines.push(`  sick_students, permits, cleanliness_status, discipline_status, special_incidents,`);
      lines.push(`  completed_activities, inventory_notes, notes_for_next_shift, submitted_by`);
      lines.push(`) VALUES (`);
      lines.push(`  ${escapeSqlString(r.id)}, ${escapeSqlString(r.dateStr)}, ${r.day}, ${r.month}, ${r.year}, ${escapeSqlString(r.shiftType)}, ${escapeSqlString(r.handoverTime || '')},`);
      lines.push(`  '{${outIds}}', '{${outNames}}', '{${incIds}}', '{${incNames}}',`);
      lines.push(`  ${r.studentCountTotal || 0}, ${r.studentCountPresent || 0}, ${r.studentCountPermit || 0}, ${r.studentCountSick || 0},`);
      lines.push(`  '${sickJson}'::jsonb, '${permitsJson}'::jsonb, ${escapeSqlString(r.cleanlinessStatus || '')}, ${escapeSqlString(r.disciplineStatus || '')}, ${escapeSqlString(r.specialIncidents || '')},`);
      lines.push(`  '${actsJson}'::jsonb, ${escapeSqlString(r.inventoryNotes || '')}, ${escapeSqlString(r.notesForNextShift || '')}, ${escapeSqlString(r.submittedBy || 'Petugas')}`);
      lines.push(`) ON CONFLICT (id) DO NOTHING;\n`);
    }
  }

  lines.push(`-- ==============================================================================`);
  lines.push(`-- SELESAI! SEMUA DATA BERHASIL DIMIGRASIKAN KE SUPABASE DENGAN SEMPURNA.`);
  lines.push(`-- ==============================================================================`);

  return lines.join('\n');
}

/**
 * Generate full JSON Backup of the entire database
 */
export function generateFullDatabaseJSON(
  schedule: MonthSchedule,
  staffList: Staff[] = SEPTEMBER_2026_STAFF_LIST,
  swapLogs: ShiftSwapRecord[] = [],
  handoverReports: HandoverReport[] = [],
  sopTasks: DailyTask[] = SHIFT_TASKS_TEMPLATE
): string {
  const exportPayload = {
    metadata: {
      appName: 'Sistem Jadwal Shif Wali Asuh Kemensos RI',
      exportDate: new Date().toISOString(),
      version: '1.0.0-supabase-ready',
    },
    staff: staffList,
    sopTemplates: sopTasks,
    schedule: {
      year: schedule.year,
      month: schedule.month,
      monthName: schedule.monthName,
      totalDays: schedule.totalDays,
      days: schedule.days,
    },
    shiftSwaps: swapLogs,
    handoverReports,
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Direct Migration: Upload all data to Supabase using @supabase/supabase-js
 */
export async function directMigrateToSupabase(
  url: string,
  key: string,
  schedule: MonthSchedule,
  staffList: Staff[] = SEPTEMBER_2026_STAFF_LIST,
  swapLogs: ShiftSwapRecord[] = [],
  handoverReports: HandoverReport[] = [],
  sopTasks: DailyTask[] = SHIFT_TASKS_TEMPLATE,
  onProgress?: (step: string, percent: number) => void
): Promise<{ success: boolean; message: string }> {
  try {
    const client = createClient(url, key);

    // 1. Migrate Staff (Ensure all staff from active schedule + October/September baseline are included so FK constraints succeed)
    onProgress?.(`Mengunggah data ${staffList.length} Personel Wali Asuh...`, 15);
    const staffMap = new Map<number, Staff>();
    SEPTEMBER_2026_STAFF_LIST.forEach((s) => staffMap.set(s.id, s));
    OCTOBER_2026_STAFF_LIST.forEach((s) => staffMap.set(s.id, s));
    staffList.forEach((s) => staffMap.set(s.id, s));
    if (schedule.staffList) {
      schedule.staffList.forEach((s) => staffMap.set(s.id, s));
    }

    const staffRecords = Array.from(staffMap.values()).map((s) => ({
      id: s.id,
      code: s.code || '',
      name: s.name,
      gender: s.gender === 'P' ? 'P' : 'L',
      jenjang: s.jenjang || '-',
      role: s.role || 'Wali Asuh',
      group_name: s.group || '',
      initials: s.initials || '',
      phone: s.phone || '',
      nip: s.nip || '',
      is_active: s.status !== 'archived',
    }));

    const { error: staffErr } = await client.from('staff').upsert(staffRecords, { onConflict: 'id' });
    if (staffErr) {
      throw new Error(`Gagal migrasi tabel staff: ${staffErr.message}`);
    }

    // 2. Migrate SOP Templates
    onProgress?.('Mengunggah template tugas SOP harian...', 35);
    if (sopTasks && sopTasks.length > 0) {
      const sopRecords = sopTasks.map((t, idx) => ({
        id: t.id,
        shift_code: t.shiftCode,
        time_range: t.time,
        title: t.title,
        description: t.description || '',
        category: t.category || 'presensi',
        priority: t.priority || 'normal',
        order_num: idx + 1,
      }));
      const { error: sopErr } = await client.from('sop_templates').upsert(sopRecords, { onConflict: 'id' });
      if (sopErr) {
        console.warn('SOP upload notice:', sopErr.message);
      }
      try {
        await client.from('system_settings').upsert({
          key: 'checklist_sop',
          value_json: { tasks: sopTasks, updatedAt: new Date().toISOString(), updatedBy: 'Admin Migration' },
          updated_at: new Date().toISOString(),
        });
      } catch {}
    }

    // 3. Migrate Master Schedules & Per-Month Staff List
    onProgress?.('Mengunggah master jadwal bulanan...', 55);
    const scheduleId = `schedule_${schedule.year}_${String(schedule.month).padStart(2, '0')}`;
    const { error: schedErr } = await client.from('schedules').upsert(
      {
        id: scheduleId,
        year: schedule.year,
        month: schedule.month,
        total_days: schedule.totalDays,
        days_json: schedule.days,
        updated_at: new Date().toISOString(),
        updated_by: 'Supabase Direct Sync',
      },
      { onConflict: 'id' }
    );
    if (schedErr) {
      throw new Error(`Gagal migrasi tabel schedules: ${schedErr.message}`);
    }

    try {
      await client.from('system_settings').upsert({
        key: `schedule_staff_${schedule.year}_${schedule.month}`,
        value_json: { staffList: schedule.staffList || staffList, updatedAt: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      });
    } catch {}

    // 4. Migrate Schedule Assignments (Relational)
    onProgress?.(`Mengunggah penugasan relasional ${schedule.totalDays} hari...`, 75);
    const assignmentRecords: any[] = [];
    for (let day = 1; day <= schedule.totalDays; day++) {
      const dayShifts = schedule.days[day];
      if (dayShifts) {
        for (const staffIdStr in dayShifts) {
          const staffId = Number(staffIdStr);
          const shiftCode = dayShifts[staffId];
          if (shiftCode && staffMap.has(staffId)) {
            assignmentRecords.push({
              schedule_id: scheduleId,
              year: schedule.year,
              month: schedule.month,
              day,
              staff_id: staffId,
              shift_code: shiftCode,
            });
          }
        }
      }
    }

    if (assignmentRecords.length > 0) {
      // Chunk into 200 items per upsert
      const chunkSize = 200;
      for (let i = 0; i < assignmentRecords.length; i += chunkSize) {
        const chunk = assignmentRecords.slice(i, i + chunkSize);
        const { error: assignErr } = await client
          .from('schedule_assignments')
          .upsert(chunk, { onConflict: 'year,month,day,staff_id' });
        if (assignErr) {
          console.warn('Assignment chunk upload notice:', assignErr.message);
        }
      }
    }

    // 5. Migrate Swaps
    if (swapLogs && swapLogs.length > 0) {
      onProgress?.('Mengunggah rekap riwayat pertukaran shif...', 88);
      const swapRecords = swapLogs.map((sw) => ({
        id: sw.id,
        year: sw.year,
        month: sw.month,
        swap_type: sw.type,
        day1: sw.day1,
        staff1_id: staffMap.has(sw.staff1Id) ? sw.staff1Id : null,
        staff1_name: sw.staff1Name,
        staff1_old_shift: sw.staff1OldShift,
        staff1_new_shift: sw.staff1NewShift,
        day2: sw.day2 || null,
        staff2_id: sw.staff2Id && staffMap.has(sw.staff2Id) ? sw.staff2Id : null,
        staff2_name: sw.staff2Name || null,
        staff2_old_shift: sw.staff2OldShift || null,
        staff2_new_shift: sw.staff2NewShift || null,
        reason: sw.reason || '',
        auto_lp_applied: sw.autoLpApplied || false,
        undone: sw.undone || false,
        approved_by: 'Admin',
      }));
      await client.from('shift_swaps').upsert(swapRecords, { onConflict: 'id' });
    }

    // 6. Migrate Handover Reports
    if (handoverReports && handoverReports.length > 0) {
      onProgress?.('Mengunggah buku jurnal serah terima piket...', 95);
      const handoverRecords = handoverReports.map((r) => ({
        id: r.id,
        date_str: r.dateStr,
        day: r.day,
        month: r.month,
        year: r.year,
        shift_type: r.shiftType,
        handover_time: r.handoverTime || '',
        outgoing_staff_ids: r.outgoingStaffIds || [],
        outgoing_staff_names: r.outgoingStaffNames || [],
        incoming_staff_ids: r.incomingStaffIds || [],
        incoming_staff_names: r.incomingStaffNames || [],
        student_count_total: r.studentCountTotal || 0,
        student_count_present: r.studentCountPresent || 0,
        student_count_permit: r.studentCountPermit || 0,
        student_count_sick: r.studentCountSick || 0,
        student_count_fasting: r.studentCountFasting || 0,
        sick_students: r.sickStudents || [],
        permits: r.permits || [],
        cleanliness_status: r.cleanlinessStatus || 'Cukup Bersih',
        discipline_status: r.disciplineStatus || 'Kondusif & Tertib',
        special_incidents: r.specialIncidents || '',
        completed_activities: r.completedActivities || [],
        inventory_notes: r.inventoryNotes || '',
        notes_for_next_shift: r.notesForNextShift || '',
        submitted_by: r.submittedBy || 'Admin',
      }));
      await client.from('handover_reports').upsert(handoverRecords, { onConflict: 'id' });
    }

    onProgress?.('Migrasi selesai!', 100);
    return {
      success: true,
      message: 'Seluruh data berhasil dimigrasikan ke database Supabase Anda!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Terjadi kesalahan saat mengunggah data ke Supabase.',
    };
  }
}

/**
 * Trigger file download in browser
 */
export function downloadFile(content: string, fileName: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Check if Supabase credentials are configured
 */
export function isSupabaseConfigured(): boolean {
  const { url, key } = getStoredSupabaseConfig();
  return Boolean(url && key);
}

/**
 * Resolve default baseline staff list for a given year and month
 */
function getBaselineStaffForMonth(year: number, month: number): Staff[] {
  if (year === 2026 && month === 8) return INITIAL_STAFF_LIST;
  if (year === 2026 && month === 9) return SEPTEMBER_2026_STAFF_LIST;
  return OCTOBER_2026_STAFF_LIST;
}

/**
 * Fetch schedule from Supabase
 */
export async function fetchScheduleFromSupabase(year: number, month: number): Promise<MonthSchedule | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const scheduleId = `schedule_${year}_${String(month).padStart(2, '0')}`;
    const { data: schedData, error } = await client
      .from('schedules')
      .select('*')
      .eq('id', scheduleId)
      .maybeSingle();

    if (error || !schedData) return null;

    let staffList: Staff[] | undefined = undefined;
    let hasExplicitMonthStaff = false;

    // 1. Check month-specific staff roster in system_settings first
    try {
      const { data: monthStaffSetting } = await client
        .from('system_settings')
        .select('value_json')
        .eq('key', `schedule_staff_${year}_${month}`)
        .maybeSingle();
      if (
        monthStaffSetting?.value_json?.staffList &&
        Array.isArray(monthStaffSetting.value_json.staffList) &&
        monthStaffSetting.value_json.staffList.length > 0
      ) {
        staffList = monthStaffSetting.value_json.staffList;
        hasExplicitMonthStaff = true;
      }
    } catch {}

    // 2. Fallback to staff table if month-specific setting not found
    if (!staffList) {
      try {
        const { data: staffData } = await client.from('staff').select('*').order('id', { ascending: true });
        if (staffData && staffData.length > 0) {
          const allDbStaff: Staff[] = staffData.map((s) => ({
            id: s.id,
            code: s.code,
            name: s.name,
            gender: s.gender,
            jenjang: s.jenjang,
            role: s.role,
            group: s.group_name,
            initials: s.initials,
            phone: s.phone,
            nip: s.nip,
          }));

          // Filter to staff IDs actually present in this month's days_json if available
          const day1Map = schedData.days_json?.[1] || schedData.days_json?.['1'];
          if (day1Map && typeof day1Map === 'object' && Object.keys(day1Map).length > 0) {
            const activeIdsInDays = new Set(Object.keys(day1Map).map(Number));
            const filtered = allDbStaff.filter((s) => activeIdsInDays.has(s.id));
            if (filtered.length > 0) {
              staffList = filtered;
              hasExplicitMonthStaff = true;
            } else {
              staffList = allDbStaff;
            }
          } else {
            staffList = allDbStaff;
          }
        }
      } catch {}
    }

    // 3. Fallback to baseline only if no explicit month staff roster was saved
    const baseline = getBaselineStaffForMonth(schedData.year, schedData.month);
    if (!staffList || staffList.length === 0) {
      staffList = baseline;
    } else if (
      !hasExplicitMonthStaff &&
      schedData.year === 2026 &&
      schedData.month === 10 &&
      staffList.length === SEPTEMBER_2026_STAFF_LIST.length
    ) {
      const mergedMap = new Map<number, Staff>();
      OCTOBER_2026_STAFF_LIST.forEach((s) => mergedMap.set(s.id, s));
      staffList.forEach((s) => mergedMap.set(s.id, s));
      staffList = Array.from(mergedMap.values());
    }

    const defaultTotalDays = new Date(schedData.year, schedData.month, 0).getDate() || 30;

    return {
      year: schedData.year,
      month: schedData.month,
      monthName: INDONESIAN_MONTH_NAMES[(schedData.month || 1) - 1] || 'Bulan',
      totalDays: schedData.total_days || defaultTotalDays,
      days: schedData.days_json || {},
      staffList,
      updatedAt: schedData.updated_at,
      updatedBy: schedData.updated_by,
    };
  } catch (err) {
    console.warn('Failed to fetch schedule from Supabase:', err);
    return null;
  }
}

/**
 * Save schedule to Supabase (both header days_json, staff roster, and relational schedule_assignments)
 */
export async function saveScheduleToSupabase(schedule: MonthSchedule, updatedBy: string = 'User'): Promise<boolean> {
  // Always persist to localStorage (v16, v15, v14) so local & multi-tab state is 100% consistent
  const nowIso = schedule.updatedAt || new Date().toISOString();
  const scheduleWithMeta: MonthSchedule = {
    ...schedule,
    updatedAt: nowIso,
    updatedBy,
  };
  try {
    const serialized = JSON.stringify(scheduleWithMeta);
    localStorage.setItem(`wali_asuh_schedule_v16_${schedule.year}_${schedule.month}`, serialized);
    localStorage.setItem(`wali_asuh_schedule_v15_${schedule.year}_${schedule.month}`, serialized);
    localStorage.setItem(`wali_asuh_schedule_v14_${schedule.year}_${schedule.month}`, serialized);
  } catch {}

  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const scheduleId = `schedule_${schedule.year}_${String(schedule.month).padStart(2, '0')}`;

    // 1. Upsert staff records first so foreign key constraints on schedule_assignments never fail
    const activeRoster =
      schedule.staffList && schedule.staffList.length > 0
        ? schedule.staffList
        : getBaselineStaffForMonth(schedule.year, schedule.month);

    if (activeRoster.length > 0) {
      const staffRecords = activeRoster.map((s) => ({
        id: s.id,
        code: s.code || '',
        name: s.name,
        gender: s.gender === 'P' ? 'P' : 'L',
        jenjang: s.jenjang || '-',
        role: s.role || 'Wali Asuh',
        group_name: s.group || '',
        initials: s.initials || '',
        phone: s.phone || '',
        nip: s.nip || '',
        is_active: s.status !== 'archived',
      }));
      try {
        await client.from('staff').upsert(staffRecords, { onConflict: 'id' });
      } catch (staffErr) {
        console.warn('Supabase staff pre-upsert notice:', staffErr);
      }

      try {
        await client.from('system_settings').upsert({
          key: `schedule_staff_${schedule.year}_${schedule.month}`,
          value_json: { staffList: activeRoster, updatedAt: nowIso, updatedBy },
          updated_at: nowIso,
        });
      } catch {}
    }

    // 2. Upsert master schedule
    const { error: schedErr } = await client.from('schedules').upsert(
      {
        id: scheduleId,
        year: schedule.year,
        month: schedule.month,
        total_days: schedule.totalDays,
        days_json: schedule.days,
        updated_at: nowIso,
        updated_by: updatedBy,
      },
      { onConflict: 'id' }
    );
    if (schedErr) {
      console.warn('Supabase schedule upsert notice:', schedErr.message);
    }

    // 3. Upsert relational assignments
    const validStaffIds = new Set(activeRoster.map((s) => s.id));
    const assignmentRecords: any[] = [];
    for (let day = 1; day <= schedule.totalDays; day++) {
      const dayShifts = schedule.days[day];
      if (dayShifts) {
        for (const staffIdStr in dayShifts) {
          const staffId = Number(staffIdStr);
          const shiftCode = dayShifts[staffId];
          if (shiftCode && (validStaffIds.size === 0 || validStaffIds.has(staffId))) {
            assignmentRecords.push({
              schedule_id: scheduleId,
              year: schedule.year,
              month: schedule.month,
              day,
              staff_id: staffId,
              shift_code: shiftCode,
            });
          }
        }
      }
    }

    if (assignmentRecords.length > 0) {
      const chunkSize = 250;
      for (let i = 0; i < assignmentRecords.length; i += chunkSize) {
        const chunk = assignmentRecords.slice(i, i + chunkSize);
        const { error: assignErr } = await client
          .from('schedule_assignments')
          .upsert(chunk, { onConflict: 'year,month,day,staff_id' });
        if (assignErr) {
          console.warn('Supabase assignment upsert notice:', assignErr.message);
        }
      }
    }

    return !schedErr;
  } catch (err) {
    console.warn('Failed to save schedule to Supabase:', err);
    return false;
  }
}

/**
 * Subscribe to Supabase Schedule updates in Realtime with deduplicated resilient polling & cross-tab sync
 */
export function subscribeToSupabaseSchedule(
  year: number,
  month: number,
  onUpdate: (data: {
    days: Record<number, Record<number, ShiftCode>>;
    staffList?: Staff[];
    updatedAt?: string;
    updatedBy?: string;
  }) => void
): (() => void) | null {
  let lastEmittedFingerprint = '';

  const emitIfChanged = (payload: {
    days: Record<number, Record<number, ShiftCode>>;
    staffList?: Staff[];
    updatedAt?: string;
    updatedBy?: string;
  }) => {
    if (!payload.days || Object.keys(payload.days).length === 0) return;
    const staffSig = (payload.staffList || []).map((s) => `${s.id}:${s.name}`).join('|');
    const fingerprint = `${payload.updatedAt || ''}_${staffSig}_${JSON.stringify(payload.days)}`;
    if (fingerprint === lastEmittedFingerprint) return;
    lastEmittedFingerprint = fingerprint;
    onUpdate(payload);
  };

  // Cross-tab storage listener for instant local multi-tab sync
  const storageKey = `wali_asuh_schedule_v16_${year}_${month}`;
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === storageKey && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && parsed.days) {
          emitIfChanged({
            days: parsed.days,
            staffList: parsed.staffList,
            updatedAt: parsed.updatedAt,
            updatedBy: parsed.updatedBy,
          });
        }
      } catch {}
    }
  };
  window.addEventListener('storage', handleStorageEvent);

  const client = getSupabaseClient();
  if (!client) {
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
    };
  }

  try {
    const scheduleId = `schedule_${year}_${String(month).padStart(2, '0')}`;

    const fetchAndEmitFullSchedule = async () => {
      try {
        const fullSched = await fetchScheduleFromSupabase(year, month);
        if (fullSched && fullSched.days && Object.keys(fullSched.days).length > 0) {
          emitIfChanged({
            days: fullSched.days,
            staffList: fullSched.staffList,
            updatedAt: fullSched.updatedAt,
            updatedBy: fullSched.updatedBy,
          });
        }
      } catch {}
    };

    // 1. Immediate initial fetch from Supabase
    fetchAndEmitFullSchedule();

    // 2. Realtime WebSocket subscription
    const channel = client
      .channel(`schedule_updates_${scheduleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules',
          filter: `id=eq.${scheduleId}`,
        },
        () => {
          fetchAndEmitFullSchedule();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: `key=eq.schedule_staff_${year}_${month}`,
        },
        () => {
          fetchAndEmitFullSchedule();
        }
      )
      .subscribe();

    // 3. Deduplicated Resilient Polling Fallback (runs every 6 seconds to guarantee sync even without Realtime extension)
    const pollTimer = setInterval(() => {
      fetchAndEmitFullSchedule();
    }, 6000);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      clearInterval(pollTimer);
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Failed to subscribe to Supabase realtime schedule:', err);
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
    };
  }
}

