import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  Users,
  Eye,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import { MonthSchedule, Staff } from '../types';
import { parseScheduleCSV, CSVParseResult } from '../utils/csvScheduleImport';
import { soundManager } from '../utils/audio';
import { getLocalStaffList, saveStaffListToSupabase, unmarkStaffDeletedPermanently } from '../utils/staffService';

interface ImportScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  masterStaffList?: Staff[];
  selectedMonth: { year: number; month: number; monthName: string };
  onApplySchedule: (updatedSchedule: MonthSchedule) => void;
}

export const ImportScheduleModal: React.FC<ImportScheduleModalProps> = ({
  isOpen,
  onClose,
  staffList,
  masterStaffList,
  selectedMonth,
  onApplySchedule,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [targetYear, setTargetYear] = useState<number>(selectedMonth.year || 2026);
  const [targetMonth, setTargetMonth] = useState<number>(selectedMonth.month || 10);
  const [rawText, setRawText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const targetDaysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const effectiveMasterList = masterStaffList && masterStaffList.length > 0 ? masterStaffList : getLocalStaffList();

  const handleProcessCSVContent = (content: string, name?: string) => {
    setErrorMsg(null);
    if (!content.trim()) {
      setParseResult(null);
      return;
    }

    try {
      const result = parseScheduleCSV(content, staffList, targetDaysInMonth, undefined, effectiveMasterList);
      setParseResult(result);
      if (name) setFileName(name);
      if (!result.success && result.errors.length > 0) {
        setErrorMsg(result.errors.join(' '));
      } else {
        soundManager.playChime();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal memproses file CSV.');
      setParseResult(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawText(text);
      handleProcessCSVContent(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleApply = () => {
    if (!parseResult || !parseResult.success) return;

    setIsProcessing(true);
    try {
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
      ];
      const targetMonthName = monthNames[targetMonth - 1] || 'Bulan';

      const appliedStaffList =
        parseResult.finalStaffList && parseResult.finalStaffList.length > 0
          ? parseResult.finalStaffList
          : staffList;

      // Merge any newly discovered staff from CSV into the Master Bank Data without losing existing master records
      const mergedMasterMap = new Map<number, Staff>();
      effectiveMasterList.forEach((s) => mergedMasterMap.set(s.id, s));
      appliedStaffList.forEach((s) => {
        unmarkStaffDeletedPermanently(s.id);
        mergedMasterMap.set(s.id, s);
      });
      const updatedMasterList = Array.from(mergedMasterMap.values()).sort((a, b) => a.id - b.id);
      saveStaffListToSupabase(updatedMasterList, `Import CSV ${targetMonthName} ${targetYear}`).catch(() => {});

      const newSchedule: MonthSchedule = {
        year: targetYear,
        month: targetMonth,
        monthName: targetMonthName,
        totalDays: targetDaysInMonth,
        staffList: appliedStaffList,
        days: parseResult.days,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Administrator SRT 1 (Import CSV)',
      };

      onApplySchedule(newSchedule);
      soundManager.playBell();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menerapkan jadwal.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Import Jadwal & Roster Wali Asuh dari CSV
              </h2>
              <p className="text-xs text-white/80">
                Pembacaan otomatis berdasarkan Nama Wali Asuh (otomatis tambah nama baru & hapus nama yang tidak ada di CSV bulan ini)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Target Month Selection */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pilih Periode Bulan Tujuan:
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={`${targetYear}-${targetMonth}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split('-').map(Number);
                  setTargetYear(y);
                  setTargetMonth(m);
                  if (rawText) {
                    const daysCount = new Date(y, m, 0).getDate();
                    try {
                      const res = parseScheduleCSV(rawText, staffList, daysCount, undefined, effectiveMasterList);
                      setParseResult(res);
                    } catch {}
                  }
                }}
                className="text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-800 dark:text-slate-100 shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="2026-8">Agustus 2026 (31 Hari)</option>
                <option value="2026-9">September 2026 (30 Hari)</option>
                <option value="2026-10">Oktober 2026 (31 Hari)</option>
                <option value="2026-11">November 2026 (30 Hari)</option>
                <option value="2026-12">Desember 2026 (31 Hari)</option>
              </select>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 gap-4 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('upload')}
              className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 ${
                activeTab === 'upload'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Unggah File (.csv)</span>
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 ${
                activeTab === 'paste'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Tempel Teks (Paste CSV)</span>
            </button>
          </div>

          {/* Tab 1: Upload File */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,application/vnd.ms-excel"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300 dark:border-emerald-700 hover:border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-2xl p-6 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center gap-2"
              >
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-full shadow-2xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Klik untuk memilih file CSV
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Pilih file <span className="font-semibold text-emerald-700 dark:text-emerald-400">Jadwal_Shif_Wali_Asuh.csv</span> (bebas jumlah Wali Asuh: 40, 55, 99, dst.)
                  </p>
                </div>
                {fileName && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-semibold shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>File Terpilih: {fileName}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Paste Raw CSV */}
          {activeTab === 'paste' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Tempel Isi Spreadsheet / CSV:</span>
                <span className="text-[11px] text-slate-400 font-normal">Format: No, Nama, 1, 2, 3... 31</span>
              </label>
              <textarea
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  handleProcessCSVContent(e.target.value);
                }}
                placeholder="No,Nama,1,2,3,4,5...&#10;1,&quot;Aris Mahmud Syafi'i&quot;,P1,S2A,M1,LP,L..."
                rows={6}
                className="w-full text-xs font-mono p-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Gagal Membaca CSV:</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Parse Result Summary & Preview */}
          {parseResult && parseResult.success && (
            <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Struktur CSV & Nama Wali Asuh Berhasil Diverifikasi!</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 rounded-md font-semibold">
                    {parseResult.totalDays} Hari Terbaca
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-md font-semibold flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{parseResult.matchedStaffList.length} Wali Asuh di CSV</span>
                  </span>
                  {parseResult.newStaffList.length > 0 && (
                    <span className="px-2 py-0.5 bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 rounded-md font-bold flex items-center gap-1">
                      <UserPlus className="w-3 h-3" />
                      <span>+{parseResult.newStaffList.length} Baru</span>
                    </span>
                  )}
                  {parseResult.removedStaffList.length > 0 && (
                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-md font-bold flex items-center gap-1">
                      <UserMinus className="w-3 h-3" />
                      <span>-{parseResult.removedStaffList.length} Dihapus dari Bulan Ini</span>
                    </span>
                  )}
                </div>
              </div>

              {parseResult.warnings.length > 0 && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                  {parseResult.warnings.map((w, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Pratinjau Daftar Wali Asuh ({parseResult.matchedStaffList.length} Petugas):</span>
                  </span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Tgl 1 s.d. {parseResult.totalDays}
                  </span>
                </div>
                <div className="overflow-x-auto max-h-52">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 w-8">No</th>
                        <th className="px-2 py-1.5 min-w-[160px]">Nama Wali Asuh</th>
                        <th className="px-1.5 py-1.5 text-center">Tgl 1</th>
                        <th className="px-1.5 py-1.5 text-center">Tgl 2</th>
                        <th className="px-1.5 py-1.5 text-center">Tgl 3</th>
                        <th className="px-1.5 py-1.5 text-center">Tgl 4</th>
                        <th className="px-1.5 py-1.5 text-center">Tgl 5</th>
                        <th className="px-1.5 py-1.5 text-center">...</th>
                        <th className="px-1.5 py-1.5 text-center">Tgl {parseResult.totalDays}</th>
                        <th className="px-2 py-1.5 text-center">Total Dinas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {parseResult.matchedStaffList.map((item, idx) => (
                        <tr key={`${item.staff.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-2 py-1 font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-2 py-1 font-semibold text-slate-800 dark:text-slate-200 max-w-[190px]">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="truncate">{item.staff.name}</span>
                              {item.isNewStaff && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 dark:bg-emerald-900/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shrink-0">
                                  BARU
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-1.5 py-1 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                            {item.shifts[1] || '-'}
                          </td>
                          <td className="px-1.5 py-1 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                            {item.shifts[2] || '-'}
                          </td>
                          <td className="px-1.5 py-1 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                            {item.shifts[3] || '-'}
                          </td>
                          <td className="px-1.5 py-1 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                            {item.shifts[4] || '-'}
                          </td>
                          <td className="px-1.5 py-1 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                            {item.shifts[5] || '-'}
                          </td>
                          <td className="px-1.5 py-1 text-center text-slate-400">...</td>
                          <td className="px-1.5 py-1 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                            {item.shifts[parseResult.totalDays] || '-'}
                          </td>
                          <td className="px-2 py-1 text-center font-bold text-emerald-600 dark:text-emerald-400">
                            {item.shiftCount} shif
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Safety guarantee */}
              <div className="flex items-center gap-2 p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl text-[11px] text-blue-800 dark:text-blue-300">
                <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <span>
                  <strong>Sinkronisasi Roster & Jadwal Otomatis:</strong> Daftar Wali Asuh pada{' '}
                  <strong>
                    {targetMonth === 10
                      ? 'Oktober 2026'
                      : targetMonth === 9
                      ? 'September 2026'
                      : targetMonth === 11
                      ? 'November 2026'
                      : targetMonth === 12
                      ? 'Desember 2026'
                      : `Bulan ${targetMonth} ${targetYear}`}
                  </strong>{' '}
                  di Matriks Jadwal dan Menu Kelola Wali Asuh akan langsung disesuaikan menjadi tepat{' '}
                  <strong>{parseResult.matchedStaffList.length} Wali Asuh</strong> sesuai CSV ini. Bulan lainnya tetap aman tanpa perubahan.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            onClick={handleApply}
            disabled={!parseResult || !parseResult.success || isProcessing}
            className={`px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer ${
              parseResult && parseResult.success && !isProcessing
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/20 active:scale-95'
                : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>
              {isProcessing
                ? 'Menerapkan Jadwal...'
                : `Terapkan (${parseResult?.matchedStaffList.length || 0} Wali Asuh)`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

