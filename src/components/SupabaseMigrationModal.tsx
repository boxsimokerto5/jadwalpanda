import React, { useState, useMemo } from 'react';
import { 
  Database, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  FileText, 
  Layers, 
  UploadCloud, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  X,
  Code2,
  TableProperties,
  ArrowRight
} from 'lucide-react';
import { MonthSchedule, Staff, ShiftSwapRecord, HandoverReport, DailyTask } from '../types';
import { 
  generateSupabaseSchemaSQL, 
  generateSupabaseDataSQL, 
  generateFullDatabaseJSON, 
  downloadFile,
  testSupabaseConnection,
  directMigrateToSupabase,
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig
} from '../utils/supabaseService';
import { soundManager } from '../utils/audio';

interface SupabaseMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: MonthSchedule;
  staffList: Staff[];
  swapLogs?: ShiftSwapRecord[];
  handoverReports?: HandoverReport[];
  sopTasks?: DailyTask[];
}

export const SupabaseMigrationModal: React.FC<SupabaseMigrationModalProps> = ({
  isOpen,
  onClose,
  schedule,
  staffList,
  swapLogs = [],
  handoverReports = [],
  sopTasks = [],
}) => {
  const [activeTab, setActiveTab] = useState<'schema' | 'data' | 'direct' | 'json' | 'guide'>('schema');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Direct connection form state
  const storedConfig = useMemo(() => getStoredSupabaseConfig(), []);
  const [supabaseUrl, setSupabaseUrl] = useState<string>(storedConfig.url);
  const [supabaseKey, setSupabaseKey] = useState<string>(storedConfig.key);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [migrationProgress, setMigrationProgress] = useState<{ step: string; percent: number } | null>(null);
  const [migrationResult, setMigrationResult] = useState<{ success: boolean; message: string } | null>(null);

  // Generate dynamic SQL & JSON from live app state
  const schemaSQL = useMemo(() => generateSupabaseSchemaSQL(), []);
  const dataSQL = useMemo(() => {
    return generateSupabaseDataSQL(schedule, staffList, swapLogs, handoverReports, sopTasks);
  }, [schedule, staffList, swapLogs, handoverReports, sopTasks]);
  const jsonBackup = useMemo(() => {
    return generateFullDatabaseJSON(schedule, staffList, swapLogs, handoverReports, sopTasks);
  }, [schedule, staffList, swapLogs, handoverReports, sopTasks]);

  if (!isOpen) return null;

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      soundManager.playChime();
      setTimeout(() => setCopiedType(null), 2500);
    } catch (e) {
      console.error('Failed to copy to clipboard:', e);
    }
  };

  const handleTestConnection = async () => {
    if (!supabaseUrl || !supabaseKey) {
      setTestResult({ success: false, message: 'Harap isi URL Proyek dan Anon Key Supabase Anda.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    saveStoredSupabaseConfig(supabaseUrl, supabaseKey);

    const result = await testSupabaseConnection(supabaseUrl, supabaseKey);
    setIsTesting(false);
    setTestResult(result);
    if (result.success) {
      soundManager.playChime();
    } else {
      soundManager.playBell();
    }
  };

  const handleDirectMigrate = async () => {
    if (!supabaseUrl || !supabaseKey) {
      setMigrationResult({ success: false, message: 'Harap isi URL Proyek dan Anon Key Supabase terlebih dahulu.' });
      return;
    }
    setIsMigrating(true);
    setMigrationResult(null);
    setMigrationProgress({ step: 'Mempersiapkan migrasi data...', percent: 5 });
    saveStoredSupabaseConfig(supabaseUrl, supabaseKey);

    const result = await directMigrateToSupabase(
      supabaseUrl,
      supabaseKey,
      schedule,
      staffList,
      swapLogs,
      handoverReports,
      sopTasks,
      (step, percent) => {
        setMigrationProgress({ step, percent });
      }
    );

    setIsMigrating(false);
    setMigrationResult(result);
    if (result.success) {
      soundManager.playChime();
    } else {
      soundManager.playBell();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex items-center justify-between gap-3 border-b border-emerald-700/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Migrasi Data ke Supabase (PostgreSQL)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider">
                  PostgreSQL Ready
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                Ekspor lengkap DDL SQL, skrip data relasional, dan sinkronisasi instan ke database Supabase baru
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-3 sm:px-6 py-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('schema')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'schema'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>1. Struktur Tabel (SQL DDL)</span>
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'data'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <TableProperties className="w-3.5 h-3.5" />
            <span>2. Data Aktif (SQL INSERT)</span>
          </button>

          <button
            onClick={() => setActiveTab('direct')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'direct'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>3. Koneksi Langsung (Otomatis)</span>
          </button>

          <button
            onClick={() => setActiveTab('json')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'json'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>4. Cadangan JSON</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>5. Panduan Step-by-Step</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* TAB 1: SCHEMA SQL (DDL) */}
          {activeTab === 'schema' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
                <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-0.5">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    Skrip DDL Lengkap: 7 Tabel PostgreSQL + RLS Security + Realtime Publication
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Mencakup tabel: <code>staff</code>, <code>schedules</code>, <code>schedule_assignments</code>, <code>shift_swaps</code>, <code>handover_reports</code>, <code>sop_templates</code>, dan <code>daily_tasks</code>.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(schemaSQL, 'schema')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    {copiedType === 'schema' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedType === 'schema' ? 'Tersalin ke Clipboard!' : 'Salin Skrip SQL'}</span>
                  </button>
                  <button
                    onClick={() => downloadFile(schemaSQL, 'supabase_schema.sql', 'application/sql')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh .sql</span>
                  </button>
                </div>
              </div>

              {/* Code Box */}
              <div className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-950 font-mono text-[11px] text-slate-200 shadow-inner">
                <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-slate-400 text-[10.5px] flex items-center justify-between">
                  <span>supabase_schema.sql (Struktur Tabel & Relasi)</span>
                  <span>PostgreSQL 15+ / Supabase</span>
                </div>
                <pre className="p-3.5 max-h-[380px] overflow-y-auto overflow-x-auto leading-relaxed select-all">
                  {schemaSQL}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: DATA SQL (DML INSERT) */}
          {activeTab === 'data' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/80">
                <div className="text-xs text-blue-900 dark:text-blue-200 space-y-0.5">
                  <p className="font-bold flex items-center gap-1.5">
                    <TableProperties className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    Data Real-Time: {staffList.length} Personel + {schedule.totalDays} Hari Jadwal + Rekap Swap & Jurnal
                  </p>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300">
                    Skrip ini menghasilkan perintah <code>INSERT ... ON CONFLICT</code> otomatis dari data jadwal yang sedang aktif di aplikasi saat ini.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(dataSQL, 'data')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    {copiedType === 'data' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedType === 'data' ? 'Data Tersalin!' : 'Salin Data SQL'}</span>
                  </button>
                  <button
                    onClick={() => downloadFile(dataSQL, `supabase_data_${schedule.year}_${schedule.month}.sql`, 'application/sql')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh .sql</span>
                  </button>
                </div>
              </div>

              {/* Code Box */}
              <div className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-950 font-mono text-[11px] text-slate-200 shadow-inner">
                <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-slate-400 text-[10.5px] flex items-center justify-between">
                  <span>supabase_data_migration.sql (Data Real-time Siap Di-insert)</span>
                  <span>{staffList.length} Staff • {schedule.year}-{schedule.month}</span>
                </div>
                <pre className="p-3.5 max-h-[380px] overflow-y-auto overflow-x-auto leading-relaxed select-all">
                  {dataSQL}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: DIRECT CONNECTION (AUTOMATED) */}
          {activeTab === 'direct' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Sinkronkan Langsung ke Akun Supabase Anda
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Masukkan <strong>Project URL</strong> dan <strong>Anon Public Key</strong> dari dashboard proyek Supabase Anda (bisa ditemukan di menu <em>Settings → API</em>). Aplikasi akan mengunggah seluruh data secara otomatis menggunakan library <code>@supabase/supabase-js</code>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Project URL (Supabase URL):
                    </label>
                    <input
                      type="text"
                      placeholder="https://your-project-id.supabase.co"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Anon Public API Key:
                    </label>
                    <input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || isMigrating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{isTesting ? 'Menguji Koneksi...' : 'Uji Koneksi Supabase'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDirectMigrate}
                    disabled={isMigrating || isTesting}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isMigrating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                    <span>{isMigrating ? 'Sedang Mengunggah...' : 'Mulai Migrasi Data Sekarang'}</span>
                  </button>
                </div>

                {/* Test Feedback */}
                {testResult && (
                  <div className={`p-2.5 rounded-lg text-xs font-semibold flex items-start gap-2 ${
                    testResult.success 
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                      : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700'
                  }`}>
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                    <span>{testResult.message}</span>
                  </div>
                )}

                {/* Migration Progress */}
                {isMigrating && migrationProgress && (
                  <div className="space-y-1.5 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>{migrationProgress.step}</span>
                      <span>{migrationProgress.percent}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-300" 
                        style={{ width: `${migrationProgress.percent}%` }} 
                      />
                    </div>
                  </div>
                )}

                {/* Migration Result */}
                {migrationResult && (
                  <div className={`p-3 rounded-lg text-xs font-bold flex items-start gap-2 ${
                    migrationResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border border-emerald-400 dark:border-emerald-700'
                      : 'bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 border border-rose-400 dark:border-rose-700'
                  }`}>
                    {migrationResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                    <div>
                      <p>{migrationResult.message}</p>
                      {migrationResult.success && (
                        <p className="text-[11px] font-normal text-emerald-700 dark:text-emerald-300 mt-0.5">
                          Anda sekarang dapat melihat seluruh data telah masuk ke Supabase Table Editor.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Realtime Publication Notice for Wali Asuh */}
                <div className="mt-3 p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <span>⚡</span>
                      <span>Wajib: Aktifkan Realtime di Supabase (Agar HP Wali Asuh Otomatis Berubah)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules, public.staff, public.shift_swaps, public.handover_reports, public.daily_tasks;', 'realtime_sql')}
                      className="px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      {copiedType === 'realtime_sql' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedType === 'realtime_sql' ? 'Tersalin!' : 'Salin Perintah SQL'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    Jalankan perintah ini satu kali di <strong>Supabase Dashboard ➔ SQL Editor ➔ Run</strong> agar setiap kali admin mengedit jadwal, server Supabase langsung memancarkan pembaruan ke seluruh HP Wali Asuh secara real-time:
                  </p>
                  <pre className="p-2 rounded bg-amber-100/80 dark:bg-slate-900 font-mono text-[10.5px] text-amber-950 dark:text-amber-200 overflow-x-auto border border-amber-200 dark:border-slate-800 select-all">
                    ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules, public.staff, public.shift_swaps, public.handover_reports, public.daily_tasks;
                  </pre>
                  <p className="text-[10.5px] text-amber-700 dark:text-amber-400">
                    💡 <em>Kredensial URL & Key Supabase kini juga otomatis disinkronkan ke semua HP Wali Asuh secara cloud, serta dilengkapi auto-polling setiap 6 detik sebagai cadangan!</em>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: JSON BACKUP */}
          {activeTab === 'json' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/80">
                <div className="text-xs text-amber-900 dark:text-amber-200 space-y-0.5">
                  <p className="font-bold flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    Arsip Cadangan JSON Lengkap
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    Dapat diimpor ke aplikasi lain atau disimpan sebagai arsip snapshot independen di komputer Anda.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(jsonBackup, 'json')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    {copiedType === 'json' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedType === 'json' ? 'JSON Tersalin!' : 'Salin JSON'}</span>
                  </button>
                  <button
                    onClick={() => downloadFile(jsonBackup, `wali_asuh_backup_${schedule.year}_${schedule.month}.json`, 'application/json')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh JSON</span>
                  </button>
                </div>
              </div>

              {/* Code Box */}
              <div className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-950 font-mono text-[11px] text-slate-200 shadow-inner">
                <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-slate-400 text-[10.5px] flex items-center justify-between">
                  <span>wali_asuh_database_backup.json</span>
                  <span>Format Standar JSON</span>
                </div>
                <pre className="p-3.5 max-h-[380px] overflow-y-auto overflow-x-auto leading-relaxed select-all">
                  {jsonBackup}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 5: STEP BY STEP GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 text-xs text-slate-700 dark:text-slate-300">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-500" />
                  Langkah-demi-Langkah Memindahkan Data ke Supabase
                </h3>

                <ol className="space-y-3 pl-2">
                  <li className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <strong className="text-slate-900 dark:text-white">Buat Proyek Baru di Supabase:</strong>
                      <p className="mt-0.5">
                        Kunjungi <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-600 dark:text-emerald-400 underline font-semibold inline-flex items-center gap-1">supabase.com <ExternalLink className="w-3 h-3" /></a>, login atau daftar gratis, lalu klik tombol <em>New Project</em> (pilih region terdekat seperti Singapore).
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <strong className="text-slate-900 dark:text-white">Buka SQL Editor:</strong>
                      <p className="mt-0.5">
                        Di dashboard proyek Supabase Anda, klik ikon <strong>SQL Editor</strong> pada sidebar menu sebelah kiri.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <strong className="text-slate-900 dark:text-white">Jalankan Skrip Struktur Tabel (DDL):</strong>
                      <p className="mt-0.5">
                        Salin skrip dari tab <strong>"1. Struktur Tabel (SQL DDL)"</strong> di atas, tempelkan (paste) ke SQL Editor Supabase, lalu klik tombol hijau <strong>RUN</strong> di pojok kanan bawah. Skrip ini akan membuat seluruh tabel, indeks, kebijakan keamanan (RLS), dan publikasi realtime.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] shrink-0 mt-0.5">
                      4
                    </span>
                    <div>
                      <strong className="text-slate-900 dark:text-white">Jalankan Skrip Data (INSERT):</strong>
                      <p className="mt-0.5">
                        Buat query baru di SQL Editor Supabase, salin skrip dari tab <strong>"2. Data Aktif (SQL INSERT)"</strong>, lalu klik <strong>RUN</strong>. Seluruh 31 personel dan jadwal lengkap 30/31 hari akan langsung terisi ke dalam database PostgreSQL Anda.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] shrink-0 mt-0.5">
                      5
                    </span>
                    <div>
                      <strong className="text-slate-900 dark:text-white">Periksa Hasil di Table Editor:</strong>
                      <p className="mt-0.5">
                        Klik menu <strong>Table Editor</strong> di Supabase untuk melihat tabel <code>staff</code>, <code>schedules</code>, <code>schedule_assignments</code>, dll. Semua data Anda kini tersimpan dengan aman dan dapat diakses melalui REST API, GraphQL, atau SDK Supabase!
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-100 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Skrip SQL yang dihasilkan kompatibel 100% dengan PostgreSQL 14/15/16 dan Supabase Cloud.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition-colors cursor-pointer"
          >
            Selesai / Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
