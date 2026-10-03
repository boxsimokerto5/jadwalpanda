-- ==============================================================================
-- SKRIP STRUKTUR TABEL LENGKAP UNTUK SUPABASE (POSTGRESQL)
-- SISTEM JADWAL SHIF WALI ASUH & ASRAMA
-- ==============================================================================
-- Skrip ini siap dijalankan di Supabase Dashboard -> SQL Editor
-- Fitur yang disediakan:
-- 1. Tabel Staff (Personel Wali Asuh)
-- 2. Tabel Schedules (Induk Jadwal Bulanan & Raw JSON)
-- 3. Tabel Schedule Assignments (Tabel Relasional Per Hari & Per Petugas)
-- 4. Tabel Shift Swaps (Riwayat Pertukaran Shif / Override Admin)
-- 5. Tabel Handover Reports (Buku Jurnal Serah Terima Piket & Absensi Santri)
-- 6. Tabel SOP Tasks (Master Template Checklist Tugas Harian Tiap Shif)
-- 7. Tabel Daily Task Logs (Penyelesaian Tugas Tiap Petugas Per Hari)
-- 8. Row Level Security (RLS) & Realtime Publication untuk sinkronisasi instan
-- ==============================================================================

-- 1. AKTIFKAN EKSTENSI POSTGRESQL (JIKA BELUM AKTIF)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABEL STAFF (PERSONEL WALI ASUH)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.staff (
    id INTEGER PRIMARY KEY,
    code VARCHAR(10),                 -- Contoh: 'L1', 'P1'
    name VARCHAR(150) NOT NULL,
    gender VARCHAR(2) CHECK (gender IN ('L', 'P')),
    jenjang VARCHAR(10) DEFAULT '-',  -- 'SD', 'SMP', 'SMA', '-'
    role VARCHAR(50) DEFAULT 'Wali Asuh',
    group_name VARCHAR(50),           -- 'Petugas Laki-laki' / 'Petugas Perempuan'
    initials VARCHAR(10),             -- Contoh: 'ams', 'ms'
    phone VARCHAR(30),
    nip VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.staff IS 'Daftar personel wali asuh putra dan putri';

-- ==============================================================================
-- 3. TABEL SCHEDULES (HEADER & RAW JSON JADWAL BULANAN)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.schedules (
    id VARCHAR(50) PRIMARY KEY,       -- Contoh: 'schedule_2026_09'
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    total_days INTEGER NOT NULL,
    days_json JSONB NOT NULL DEFAULT '{}'::jsonb, -- Pemetaan { "1": { "1": "P1", "2": "P2" } }
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by VARCHAR(100) DEFAULT 'Admin',
    CONSTRAINT uq_schedules_year_month UNIQUE (year, month)
);

COMMENT ON TABLE public.schedules IS 'Dokumen jadwal bulanan lengkap dalam format JSONB untuk kecepatan load aplikasi';

-- ==============================================================================
-- 4. TABEL SCHEDULE_ASSIGNMENTS (NORMALISASI RELASIONAL PER HARI & PER PETUGAS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.schedule_assignments (
    id BIGSERIAL PRIMARY KEY,
    schedule_id VARCHAR(50) REFERENCES public.schedules(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    day INTEGER NOT NULL,
    staff_id INTEGER REFERENCES public.staff(id) ON DELETE CASCADE,
    shift_code VARCHAR(10) NOT NULL,  -- 'P1', 'P2', 'P3', 'S', 'S2A', 'S3A', 'S4A', 'M', 'M1', 'M2', 'LP', 'O', 'L', 'C'
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_schedule_assignment UNIQUE (year, month, day, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_ymd ON public.schedule_assignments(year, month, day);
CREATE INDEX IF NOT EXISTS idx_assignments_staff ON public.schedule_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_assignments_shift ON public.schedule_assignments(shift_code);

-- ==============================================================================
-- 5. TABEL SHIFT_SWAPS (RIWAYAT PERTUKARAN SHIF & OVERRIDE ADMIN)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.shift_swaps (
    id VARCHAR(100) PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    swap_type VARCHAR(30) DEFAULT 'swap', -- 'swap', 'override', 'cross_day'
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

-- ==============================================================================
-- 6. TABEL HANDOVER_REPORTS (BUKU JURNAL SERAH TERIMA PIKET)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.handover_reports (
    id VARCHAR(100) PRIMARY KEY,
    date_str DATE NOT NULL,
    day INTEGER NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    shift_type VARCHAR(40) NOT NULL,  -- 'PAGI_KE_SORE', 'SORE_KE_MALAM', 'MALAM_KE_PAGI'
    handover_time VARCHAR(20),        -- Contoh: '15:30 WIB'
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
CREATE INDEX IF NOT EXISTS idx_handover_ym ON public.handover_reports(year, month);

-- ==============================================================================
-- 7. TABEL SOP_TEMPLATES (MASTER TEMPLATE CHECKLIST TUGAS HARIAN TIAP SHIF)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sop_templates (
    id VARCHAR(100) PRIMARY KEY,
    shift_code VARCHAR(10) NOT NULL,  -- 'P1', 'P2', 'P3', 'S', 'S2A', 'S3A', 'S4A', 'M1', 'M2'
    time_range VARCHAR(30) NOT NULL,  -- '06:45', '11:45', dll.
    title VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    category VARCHAR(30) DEFAULT 'presensi', -- 'presensi', 'ibadah', 'makan', 'belajar', 'patroli', 'laporan', 'kebersihan'
    priority VARCHAR(20) DEFAULT 'normal',   -- 'normal', 'penting', 'krusial'
    order_num INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sop_shift ON public.sop_templates(shift_code);

-- ==============================================================================
-- 8. TABEL DAILY_TASKS (PROGRES PENYELESAIAN TUGAS PER HARI PER PETUGAS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.daily_tasks (
    id VARCHAR(150) PRIMARY KEY,      -- Contoh: '2026-09-01_staff_1_task_p1_1'
    date_key VARCHAR(20) NOT NULL,    -- '2026-09-01'
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

-- ==============================================================================
-- 9. TABEL ANNOUNCEMENTS (PENGUMUMAN BERJALAN & BANNER)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
    text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    category VARCHAR(30) DEFAULT 'info',
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by VARCHAR(100) DEFAULT 'Admin'
);

-- ==============================================================================
-- 10. TABEL MEDICAL_PLANS (REKAM MEDIS & PERAWATAN SANTRI SAKIT)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.medical_plans (
    id VARCHAR(100) PRIMARY KEY,
    student_id INTEGER NOT NULL,
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
    status VARCHAR(30) DEFAULT 'active',
    reported_by VARCHAR(100) DEFAULT 'Wali Asuh',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_medical_plans_status ON public.medical_plans(status);

-- ==============================================================================
-- 11. TABEL STUDENT_NOTES (CATATAN PERKEMBANGAN & PORTOFOLIO SISWA)
-- ==============================================================================
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

CREATE INDEX IF NOT EXISTS idx_student_notes_student ON public.student_notes(student_no);

-- ==============================================================================
-- 12. TABEL STUDENT_OVERRIDES (DATA KOSTUM/PERUBAHAN PROFIL SISWA)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.student_overrides (
    student_no INTEGER PRIMARY KEY,
    data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 13. TABEL LEAVE_PERMISSIONS (SURAT IZIN & CUTI PETUGAS WALI ASUH)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.leave_permissions (
    id VARCHAR(100) PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    day INTEGER NOT NULL,
    staff_id INTEGER REFERENCES public.staff(id) ON DELETE CASCADE,
    staff_name VARCHAR(150) NOT NULL,
    leave_type VARCHAR(50) NOT NULL,
    reason TEXT DEFAULT '',
    proof_url TEXT,
    proof_file_name VARCHAR(255),
    status VARCHAR(30) DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 14. TABEL MORNING_POSTS & P5_ASSIGNMENTS
-- ==============================================================================
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

-- ==============================================================================
-- 15. OTOMATISASI TRIGGER UPDATE TIMESTAMP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_schedules_updated_at ON public.schedules;
CREATE TRIGGER trg_schedules_updated_at
    BEFORE UPDATE ON public.schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_assignments_updated_at ON public.schedule_assignments;
CREATE TRIGGER trg_assignments_updated_at
    BEFORE UPDATE ON public.schedule_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 16. ROW LEVEL SECURITY (RLS) UNTUK AKSES APLIKASI SUPABASE
-- ==============================================================================
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

-- Kebijakan Akses: Memungkinkan aplikasi web membaca & mengedit dengan Anon Key / Authenticated Key
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow all on staff" ON public.staff;
    CREATE POLICY "Allow all on staff" ON public.staff FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on schedules" ON public.schedules;
    CREATE POLICY "Allow all on schedules" ON public.schedules FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on assignments" ON public.schedule_assignments;
    CREATE POLICY "Allow all on assignments" ON public.schedule_assignments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on swaps" ON public.shift_swaps;
    CREATE POLICY "Allow all on swaps" ON public.shift_swaps FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on handover" ON public.handover_reports;
    CREATE POLICY "Allow all on handover" ON public.handover_reports FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on sop_templates" ON public.sop_templates;
    CREATE POLICY "Allow all on sop_templates" ON public.sop_templates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on daily_tasks" ON public.daily_tasks;
    CREATE POLICY "Allow all on daily_tasks" ON public.daily_tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

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

-- ==============================================================================
-- 17. SUPABASE REALTIME PUBLICATION
-- ==============================================================================
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
        public.leave_permissions, 
        public.morning_posts, 
        public.p5_assignments;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ==============================================================================
-- 12. VIEW ANALITIK: REKAP JAM KERJA & DISTRIBUSI SHIF PER PETUGAS
-- ==============================================================================
CREATE OR REPLACE VIEW public.view_monthly_shift_summary AS
SELECT 
    s.year,
    s.month,
    st.id AS staff_id,
    st.name AS staff_name,
    st.gender,
    st.role,
    COUNT(CASE WHEN sa.shift_code IN ('P', 'P1', 'P2', 'P3') THEN 1 END) AS total_pagi,
    COUNT(CASE WHEN sa.shift_code = 'P1' THEN 1 END) AS count_p1,
    COUNT(CASE WHEN sa.shift_code = 'P2' THEN 1 END) AS count_p2,
    COUNT(CASE WHEN sa.shift_code = 'P3' THEN 1 END) AS count_p3,
    COUNT(CASE WHEN sa.shift_code = 'S' THEN 1 END) AS count_s_standar,
    COUNT(CASE WHEN sa.shift_code = 'S2A' THEN 1 END) AS count_s2a_kantin_smp,
    COUNT(CASE WHEN sa.shift_code = 'S3A' THEN 1 END) AS count_s3a_kantin_sma,
    COUNT(CASE WHEN sa.shift_code = 'S4A' THEN 1 END) AS count_s4a_masjid,
    COUNT(CASE WHEN sa.shift_code IN ('S', 'S2A', 'S3A', 'S4A') THEN 1 END) AS total_sore,
    COUNT(CASE WHEN sa.shift_code IN ('M', 'M1', 'M2') THEN 1 END) AS total_malam,
    COUNT(CASE WHEN sa.shift_code = 'M1' THEN 1 END) AS count_m1,
    COUNT(CASE WHEN sa.shift_code = 'M2' THEN 1 END) AS count_m2,
    COUNT(CASE WHEN sa.shift_code = 'LP' THEN 1 END) AS total_lepas_piket,
    COUNT(CASE WHEN sa.shift_code IN ('O', 'L') THEN 1 END) AS total_off,
    COUNT(CASE WHEN sa.shift_code = 'C' THEN 1 END) AS total_cuti,
    -- Estimasi total jam kerja (P1=8h, P2=8h, P3=9h, S=8h, S2A=8h, S3A=8h, S4A=8h, M=16h, M1=9h, M2=7h)
    SUM(CASE 
        WHEN sa.shift_code = 'P3' THEN 9
        WHEN sa.shift_code IN ('P', 'P1', 'P2', 'S', 'S2A', 'S3A', 'S4A') THEN 8
        WHEN sa.shift_code = 'M' THEN 16
        WHEN sa.shift_code = 'M1' THEN 9
        WHEN sa.shift_code = 'M2' THEN 7
        ELSE 0
    END) AS total_jam_kerja
FROM public.schedules s
CROSS JOIN public.staff st
LEFT JOIN public.schedule_assignments sa 
    ON sa.schedule_id = s.id AND sa.staff_id = st.id
GROUP BY s.year, s.month, st.id, st.name, st.gender, st.role;
