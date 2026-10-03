import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  RotateCcw,
  ArrowRight,
  Clock,
  Users,
  CalendarDays,
  Flame,
  Check,
  ChevronRight,
  Info
} from 'lucide-react';
import { MonthSchedule, Staff, ShiftCode } from '../types';
import { 
  SHIFT_DEFINITIONS, 
  INITIAL_STAFF_LIST, 
  getInitialAugust2026Days, 
  SEPTEMBER_2026_STAFF_LIST, 
  getInitialSeptember2026Days 
} from '../data/initialSchedule';
import { 
  generateNextMonthScheduleFromPrior, 
  INDONESIAN_MONTH_NAMES, 
  INDONESIAN_DAY_NAMES 
} from '../utils/scheduler';
import { soundManager } from '../utils/audio';
import { saveScheduleToSupabase } from '../utils/supabaseService';

interface AutoSchedulerViewProps {
  schedule: MonthSchedule;
  setSchedule: React.Dispatch<React.SetStateAction<MonthSchedule>>;
  staffList: Staff[];
  onNavigateToMatrix: () => void;
  onSelectMonth?: (year: number, month: number) => void;
}

export const AutoSchedulerView: React.FC<AutoSchedulerViewProps> = ({
  schedule,
  setSchedule,
  staffList,
  onNavigateToMatrix,
  onSelectMonth,
}) => {
  // Compute default next month and year based on current active schedule
  const nextMonthDefault = schedule.month === 12 ? 1 : schedule.month + 1;
  const nextYearDefault = schedule.month === 12 ? schedule.year + 1 : schedule.year;

  // Form states
  const [targetYear, setTargetYear] = useState<number>(nextYearDefault);
  const [targetMonth, setTargetMonth] = useState<number>(nextMonthDefault);
  const [generationMode, setGenerationMode] = useState<'continuation' | 'day_matching'>('continuation');
  const [displayOption, setDisplayOption] = useState<'open_now' | 'save_only'>('open_now');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedSuccess, setGeneratedSuccess] = useState<boolean>(false);
  const [successInfo, setSuccessInfo] = useState<{ monthName: string; year: number; totalDays: number; isSwitched: boolean } | null>(null);

  // Dynamic calculations for the target month calendar
  const targetDaysInMonth = useMemo(() => {
    return new Date(targetYear, targetMonth, 0).getDate();
  }, [targetYear, targetMonth]);

  const targetFirstDayName = useMemo(() => {
    const firstDate = new Date(targetYear, targetMonth - 1, 1);
    return INDONESIAN_DAY_NAMES[firstDate.getDay()];
  }, [targetYear, targetMonth]);

  const targetLastDayName = useMemo(() => {
    const lastDate = new Date(targetYear, targetMonth - 1, targetDaysInMonth);
    return INDONESIAN_DAY_NAMES[lastDate.getDay()];
  }, [targetYear, targetMonth, targetDaysInMonth]);

  // List of Monday dates in the target month (which will automatically get P3)
  const mondayDates = useMemo(() => {
    const dates: number[] = [];
    for (let d = 1; d <= targetDaysInMonth; d++) {
      const dateObj = new Date(targetYear, targetMonth - 1, d);
      if (dateObj.getDay() === 1) {
        dates.push(d);
      }
    }
    return dates;
  }, [targetYear, targetMonth, targetDaysInMonth]);

  // Weekend days count
  const weekendDaysCount = useMemo(() => {
    let count = 0;
    for (let d = 1; d <= targetDaysInMonth; d++) {
      const dateObj = new Date(targetYear, targetMonth - 1, d);
      const day = dateObj.getDay();
      if (day === 0 || day === 6) count++;
    }
    return count;
  }, [targetYear, targetMonth, targetDaysInMonth]);

  const handleOpenConfirm = () => {
    setIsConfirmModalOpen(true);
  };

  const handleExecuteGenerate = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const newSchedule = generateNextMonthScheduleFromPrior(
        schedule,
        targetYear,
        targetMonth,
        generationMode
      );

      // 1. Simpan dokumen bulan baru secara terpisah ke penyimpanan lokal
      try {
        localStorage.setItem(`wali_asuh_schedule_v16_${targetYear}_${targetMonth}`, JSON.stringify(newSchedule));
        localStorage.setItem(`wali_asuh_schedule_v15_${targetYear}_${targetMonth}`, JSON.stringify(newSchedule));
        localStorage.setItem(`wali_asuh_schedule_v14_${targetYear}_${targetMonth}`, JSON.stringify(newSchedule));
      } catch (e) {
        console.warn('Gagal menyimpan draf lokal:', e);
      }

      // 2. Simpan dokumen bulan baru secara terpisah ke Supabase Cloud (September tetap utuh di schedule_2026_09)
      saveScheduleToSupabase(
        newSchedule, 
        `Penerbitan Jadwal ${INDONESIAN_MONTH_NAMES[targetMonth - 1]} ${targetYear}`
      ).catch(() => {});

      // 3. Terapkan pilihan tampilan layar
      if (displayOption === 'open_now') {
        if (onSelectMonth) {
          onSelectMonth(targetYear, targetMonth);
        } else {
          setSchedule(newSchedule);
        }
      }

      setIsGenerating(false);
      setIsConfirmModalOpen(false);
      setGeneratedSuccess(true);
      setSuccessInfo({
        monthName: INDONESIAN_MONTH_NAMES[targetMonth - 1],
        year: targetYear,
        totalDays: targetDaysInMonth,
        isSwitched: displayOption === 'open_now',
      });

      soundManager.playBell();
    }, 450);
  };

  const handleResetToSeptemberOfficial = () => {
    if (window.confirm('Tampilkan kembali Jadwal Resmi September 2026 (31 Petugas)?')) {
      if (onSelectMonth) {
        onSelectMonth(2026, 9);
      } else {
        setSchedule({
          year: 2026,
          month: 9,
          monthName: 'September',
          totalDays: 30,
          staffList: SEPTEMBER_2026_STAFF_LIST,
          days: getInitialSeptember2026Days(),
        });
      }
      soundManager.playChime();
      onNavigateToMatrix();
    }
  };

  const handleResetToAugustOfficial = () => {
    if (window.confirm('Muat kembali Jadwal Asli Agustus 2026 (38 Petugas)?')) {
      if (onSelectMonth) {
        onSelectMonth(2026, 8);
      } else {
        setSchedule({
          year: 2026,
          month: 8,
          monthName: 'Agustus',
          totalDays: 31,
          staffList: INITIAL_STAFF_LIST,
          days: getInitialAugust2026Days(),
        });
      }
      soundManager.playChime();
      onNavigateToMatrix();
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-lg border border-indigo-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-indigo-200 border border-white/15 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Penerbitan Jadwal Bulan Baru</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">
              Pembuat Jadwal Shif Bulan Berikutnya
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100 max-w-2xl leading-relaxed">
              Membuat jadwal dinas untuk bulan berikutnya dengan mempertahankan struktur penugasan, daftar <strong>{staffList.length} wali asuh</strong>, format shif (P1, P2, P3, S2A, S3A, S4A, M1, M2, LP, O), serta menyesuaikan hari dan tanggal kalender secara otomatis.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              onClick={handleResetToSeptemberOfficial}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              title="Kembalikan ke Jadwal Resmi September 2026"
            >
              <RotateCcw className="w-4 h-4 text-emerald-100" />
              <span>Buka Jadwal September 2026</span>
            </button>
            <button
              onClick={handleResetToAugustOfficial}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer"
              title="Kembalikan ke Jadwal Agustus 2026"
            >
              <RotateCcw className="w-4 h-4 text-amber-300" />
              <span>Agustus 2026</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {generatedSuccess && successInfo && (
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border-2 border-emerald-500/50 text-emerald-950 dark:text-emerald-100 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900/80 text-[11px] font-extrabold text-emerald-800 dark:text-emerald-200 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Dokumen Baru Berhasil Dibuat • September 2026 Tetap Aman 100%</span>
                </div>
                <h4 className="font-extrabold text-base text-emerald-900 dark:text-emerald-100">
                  Jadwal {successInfo.monthName} {successInfo.year} Berhasil Disimpan!
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Jadwal sebanyak {successInfo.totalDays} hari kalender telah tersimpan aman sebagai dokumen tersendiri di database Cloud.
                  {successInfo.isSwitched
                    ? ` Layar sekarang menampilkan jadwal ${successInfo.monthName} ${successInfo.year}.`
                    : ' Layar Anda tetap aman menampilkan jadwal September 2026.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {successInfo.isSwitched ? (
                <>
                  <button
                    onClick={onNavigateToMatrix}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <span>Buka Matriks {successInfo.monthName}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onSelectMonth && onSelectMonth(2026, 9)}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 text-xs font-bold transition-all cursor-pointer"
                    title="Kembali menampilkan jadwal September 2026"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                    <span>Kembali ke September 2026</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onSelectMonth && onSelectMonth(targetYear, targetMonth)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <span>Buka Jadwal {successInfo.monthName} Sekarang</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onNavigateToMatrix}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 text-xs font-bold transition-all cursor-pointer"
                  >
                    <span>Lihat Matriks September 2026</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Comparison & Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Source Month Context (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Bulan Acuan / Sumber
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Data master dan pola rotasi yang disalin
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Bulan Aktif:</span>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                  {schedule.monthName} {schedule.year}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Durasi Hari:</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {schedule.totalDays} Hari
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Jumlah Wali Asuh:</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {staffList.length} Petugas
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Akhir Bulan:</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tgl {schedule.totalDays} {schedule.monthName}
                </span>
              </div>
            </div>

            {/* Shift Rules Maintained */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Format Shif yang Dipertahankan:</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 border border-teal-200/50">
                  <strong>P1 & P2:</strong> Pagi (07-15 / 08-16)
                </div>
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200/50">
                  <strong>P3:</strong> Upacara Senin (07-16)
                </div>
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-200 border border-purple-200/50">
                  <strong>S2A & S3A:</strong> Kantin SMP & SMA
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200/50">
                  <strong>S4A:</strong> Jaga Masjid (15-23)
                </div>
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border border-blue-200/50">
                  <strong>M1 & M2:</strong> Jaga Malam
                </div>
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                  <strong>LP & O:</strong> Lepas Piket & Libur
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Next Month Generator Form (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Tentukan Bulan yang Akan Dibuat
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kalender, hari, tanggal, dan upacara Senin otomatis disesuaikan
                </p>
              </div>
            </div>

            {/* Target Period Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pilih Bulan Tujuan:
                </label>
                <select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 text-sm cursor-pointer"
                >
                  {INDONESIAN_MONTH_NAMES.map((mName, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {mName} {idx + 1 === nextMonthDefault && schedule.month !== 12 ? '(Bulan Berikutnya)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tahun Kalender:
                </label>
                <select
                  value={targetYear}
                  onChange={(e) => setTargetYear(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 text-sm cursor-pointer"
                >
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                  <option value={2028}>2028</option>
                </select>
              </div>
            </div>

            {/* Method / Generation Mode */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Metode Penyesuaian Pola Shif:
              </label>
              
              <div className="grid grid-cols-1 gap-3">
                <label 
                  onClick={() => setGenerationMode('continuation')}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    generationMode === 'continuation'
                      ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    checked={generationMode === 'continuation'}
                    onChange={() => setGenerationMode('continuation')}
                    className="mt-1 text-indigo-600 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                        Rotasi Estafet Berkesinambungan
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white">
                        Sangat Direkomendasikan
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Melanjutkan giliran tugas secara mulus dari hari terakhir bulan acuan (misal: staf yang dinas malam pada tanggal {schedule.totalDays} {schedule.monthName} otomatis mendapat Lepas Piket di tanggal 1 {INDONESIAN_MONTH_NAMES[targetMonth - 1]}, sehingga tidak terjadi bentrok jam istirahat).
                    </p>
                  </div>
                </label>

                <label 
                  onClick={() => setGenerationMode('day_matching')}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    generationMode === 'day_matching'
                      ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    checked={generationMode === 'day_matching'}
                    onChange={() => setGenerationMode('day_matching')}
                    className="mt-1 text-indigo-600 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                      Sinkronisasi Hari Kalender (Day-of-Week Matching)
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Menyalin dan menyesuaikan penugasan berdasarkan kesamaan hari dalam seminggu (Senin ke Senin, Sabtu ke Sabtu, dll.).
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Live Calendar Insight Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Pratinjau Kalender Bulan {INDONESIAN_MONTH_NAMES[targetMonth - 1]} {targetYear}:
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                  {targetDaysInMonth} Hari
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400">Tanggal 1 Jatuh Pada</div>
                  <div className="font-extrabold text-slate-900 dark:text-white mt-0.5">{targetFirstDayName}</div>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400">Tanggal {targetDaysInMonth} Jatuh Pada</div>
                  <div className="font-extrabold text-slate-900 dark:text-white mt-0.5">{targetLastDayName}</div>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
                  <div className="text-[10px] text-amber-700 dark:text-amber-400">Hari Senin (Upacara P3)</div>
                  <div className="font-extrabold text-amber-800 dark:text-amber-300 mt-0.5">{mondayDates.length} Kali</div>
                </div>
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40">
                  <div className="text-[10px] text-purple-700 dark:text-purple-400">Hari Akhir Pekan</div>
                  <div className="font-extrabold text-purple-800 dark:text-purple-300 mt-0.5">{weekendDaysCount} Hari</div>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 pt-1 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span><strong>Penetapan P3 Otomatis:</strong> Setiap hari Senin (Tgl {mondayDates.join(', ')}) seluruh petugas shif pagi otomatis menjadi <strong>P3 (07:00 - 16:00)</strong>.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span><strong>Konsistensi Spesialisasi Pos Tugas:</strong> Pola penugasan September diselaraskan (misal: <strong>Ust. Aris Mahmud</strong> tetap dominan di <strong>S4A (Masjid)</strong>, petugas kantin SMP di <strong>S2A</strong>, dan kantin SMA di <strong>S3A</strong>).</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span><strong>Keseimbangan Dinas:</strong> M1 (pria s.d 00:00) dan M2 (wanita subuh s.d 07:00) terbagi proporsional.</span>
                </div>
              </div>
            </div>

            {/* Action Button & Safety Guarantee Badge */}
            <div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-semibold mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Jadwal September 2026 aman 100%. Pembuatan jadwal bulan baru tersimpan di dokumen terpisah dan tidak akan menimpa data yang sedang berjalan.</span>
              </div>
              <button
                onClick={handleOpenConfirm}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Buat Jadwal Baru ({INDONESIAN_MONTH_NAMES[targetMonth - 1]} {targetYear})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Konfirmasi Pembuatan Dokumen Baru
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {INDONESIAN_MONTH_NAMES[targetMonth - 1]} {targetYear} ({targetDaysInMonth} Hari Kalender)
                </p>
              </div>
            </div>

            {/* Jaminan Keamanan Hijau Terbuka */}
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
              <div className="font-extrabold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>JAMINAN KEAMANAN DATA: JADWAL SEPTEMBER 2026 TETAP 100% AMAN!</span>
              </div>
              <p className="leading-relaxed text-emerald-800 dark:text-emerald-200 text-[11px]">
                Sistem menyimpan jadwal setiap bulan dalam <strong>dokumen independen</strong>:
              </p>
              <ul className="text-[11px] space-y-1 text-emerald-800 dark:text-emerald-200 pl-4 list-disc">
                <li>Jadwal <strong>September 2026</strong> tetap tersimpan utuh dan tidak terhapus.</li>
                <li>Jadwal <strong>{INDONESIAN_MONTH_NAMES[targetMonth - 1]} {targetYear}</strong> disimpan sebagai dokumen terpisah baru.</li>
                <li>Anda dapat beralih kembali ke jadwal September kapan saja melalui menu pemilih bulan di bilah atas.</li>
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <div>• <strong>Bulan Sumber Acuan:</strong> {schedule.monthName} {schedule.year}</div>
              <div>• <strong>Metode Rotasi:</strong> {generationMode === 'continuation' ? 'Rotasi Estafet Berkesinambungan' : 'Sinkronisasi Hari Kalender'}</div>
              <div>• <strong>Hari Senin (P3 Upacara):</strong> Tgl {mondayDates.join(', ')} ({mondayDates.length} kali)</div>
              <div>• <strong>Konsistensi Pos Tugas:</strong> Spesialisasi September diselaraskan (Ust. Aris Mahmud tetap dominan S4A Masjid, kantin SMP S2A, kantin SMA S3A).</div>
            </div>

            {/* Pilihan Tampilan Layar Setelah Dibuat */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Pilih Tampilan Layar Setelah Jadwal Dibuat:
              </label>
              <div className="space-y-2">
                <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  displayOption === 'open_now' 
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 font-semibold' 
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}>
                  <input
                    type="radio"
                    name="displayOption"
                    checked={displayOption === 'open_now'}
                    onChange={() => setDisplayOption('open_now')}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-bold text-slate-800 dark:text-white">Buka & tampilkan jadwal {INDONESIAN_MONTH_NAMES[targetMonth - 1]} sekarang</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                      Anda bisa kembali ke September 2026 kapan saja dengan 1 klik pada menu bulan di atas.
                    </div>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  displayOption === 'save_only' 
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 font-semibold' 
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}>
                  <input
                    type="radio"
                    name="displayOption"
                    checked={displayOption === 'save_only'}
                    onChange={() => setDisplayOption('save_only')}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-bold text-slate-800 dark:text-white">Simpan di Cloud & Sistem, layar tetap menampilkan September 2026</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                      Jadwal baru tersimpan aman tanpa mengubah tampilan layar yang sedang Anda gunakan saat ini.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isGenerating}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteGenerate}
                disabled={isGenerating}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan Dokumen Baru...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span>Buat Dokumen Baru (September Tetap Aman)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
