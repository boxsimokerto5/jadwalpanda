import React, { useState, useMemo } from 'react';
import { Printer, Download, FileSpreadsheet, FileDown, CheckCircle2, Loader2 } from 'lucide-react';
import { MonthSchedule, Staff, ShiftCode } from '../types';
import { SHIFT_DEFINITIONS, INSTITUTION_INFO, getStaffInitials } from '../data/initialSchedule';
import { calculateStaffSummary, calculateDailyStats, exportScheduleToCSV, downloadCSV } from '../utils/scheduler';
import { generateOfficialSchedulePDF } from '../utils/pdfExport';
import { exportScheduleToExcel } from '../utils/excelExport';

interface PrintReportModalProps {
  schedule: MonthSchedule;
  staffList: Staff[];
  onClose: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  schedule,
  staffList,
  onClose,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<string>('ALL');

  const displayedStaff = useMemo(() => {
    if (groupFilter === 'UTAMA') return staffList.filter((s) => s.id <= 20 && s.gender === undefined);
    if (groupFilter === 'BARU') return staffList.filter((s) => s.id > 20 && s.gender === undefined);
    if (groupFilter === 'LAKI') return staffList.filter((s) => s.gender === 'L');
    if (groupFilter === 'PEREMPUAN') return staffList.filter((s) => s.gender === 'P');
    return staffList;
  }, [staffList, groupFilter]);

  const staffSummaries = useMemo(() => {
    return displayedStaff.map((st) => calculateStaffSummary(st, schedule.days, schedule.totalDays));
  }, [displayedStaff, schedule.days, schedule.totalDays]);

  const dailyStatsList = useMemo(() => {
    return Array.from({ length: schedule.totalDays }, (_, i) => calculateDailyStats(i + 1, schedule.days, displayedStaff));
  }, [schedule.days, schedule.totalDays, displayedStaff]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePrintOrSavePDF = () => {
    setIsExportingPdf(true);
    try {
      const fileName = generateOfficialSchedulePDF(schedule, displayedStaff);
      showToast(`File PDF berhasil disimpan: ${fileName}`);
    } catch (e) {
      console.error(e);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportExcel = () => {
    try {
      const monthName = schedule.monthName || 'September';
      const filename = `Jadwal_Resmi_${monthName}_${schedule.year}.xlsx`;
      exportScheduleToExcel(schedule, staffSummaries, filename);
      showToast(`File Excel (.xlsx) berhasil diunduh: ${filename}`);
    } catch (e) {
      console.error(e);
      showToast(`Gagal mengunduh file Excel.`);
    }
  };

  const handleExportCSV = () => {
    const csvContent = exportScheduleToCSV(schedule, staffSummaries);
    downloadCSV(`Jadwal_Resmi_${schedule.monthName}_${schedule.year}.csv`, csvContent);
    showToast(`File CSV berhasil diunduh!`);
  };

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Printer className="w-5 h-5 text-blue-600" />
          <div>
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">
              Pratinjau Format Resmi & Unduh PDF (Kemensos RI)
            </h2>
            <p className="text-[11px] text-slate-500">
              Bulan {schedule.monthName} {schedule.year} • {displayedStaff.length} Wali Asuh
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs mr-2">
            <span className="text-slate-500 font-medium">Grup:</span>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none max-w-[160px] sm:max-w-none truncate"
            >
              <option value="ALL">Semua Petugas ({staffList.length})</option>
              {schedule.month === 9 ? (
                <>
                  <option value="LAKI">Petugas Laki-laki (17)</option>
                  <option value="PEREMPUAN">Petugas Perempuan (14)</option>
                </>
              ) : (
                <>
                  <option value="UTAMA">Wali Asuh Utama (20)</option>
                  <option value="BARU">18 Wali Asuh Baru (SE 4749/2026)</option>
                </>
              )}
            </select>
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold cursor-pointer transition-all"
            title="Unduh jadwal lengkap ke file Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Unduh Excel</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-all"
            title="Unduh file format CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>CSV</span>
          </button>
          <button
            onClick={handlePrintOrSavePDF}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
            title="Klik untuk langsung mengunduh dan menyimpan dokumen sebagai file PDF"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
            <span>{isExportingPdf ? 'Menyimpan PDF...' : 'Cetak / Simpan PDF'}</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Official Document Canvas (Paper-like view) */}
      <div className="bg-white text-black p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-lg font-sans max-w-full overflow-x-auto print:border-none print:shadow-none print:p-0">
        {/* Kop Surat */}
        <div className="text-center border-b-2 border-black pb-3 mb-4 space-y-0.5">
          <div className="flex items-center justify-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
              RI
            </div>
            <div>
              <h2 className="text-xs font-bold tracking-widest text-slate-800 uppercase">
                {INSTITUTION_INFO.kementerian}
              </h2>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {INSTITUTION_INFO.pusat}
              </h3>
            </div>
          </div>
          <h1 className="text-sm font-black tracking-wide text-black uppercase">
            {INSTITUTION_INFO.sekolah}
          </h1>
          <p className="text-[11px] text-slate-700">{INSTITUTION_INFO.gedung}</p>
          <p className="text-[10px] text-slate-600">
            {INSTITUTION_INFO.alamat} • Pos-el: {INSTITUTION_INFO.email} Kode Pos: {INSTITUTION_INFO.kodepos}
          </p>
        </div>

        {/* Title */}
        <div className="text-center my-3">
          <h2 className="text-sm font-black uppercase underline tracking-wider">
            {INSTITUTION_INFO.judulJadwal}
          </h2>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800">
            {schedule.monthName.toUpperCase()} {schedule.year}
          </h3>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto my-3">
          <table className="w-full text-[10px] text-center border-collapse border border-black">
            <thead>
              <tr className="bg-slate-100 font-bold border-b border-black">
                <th className="border border-black p-1 w-6">No</th>
                <th className="border border-black p-1 text-left min-w-[140px]">Nama</th>
                {Array.from({ length: schedule.totalDays }, (_, i) => i + 1).map((d) => (
                  <th key={d} className="border border-black p-0.5 w-5 font-bold">
                    {d}
                  </th>
                ))}
                <th className="border border-black p-0.5 bg-amber-300 font-black text-slate-900">P FUL</th>
                <th className="border border-black p-0.5 bg-orange-400 font-black text-slate-900">S</th>
                <th className="border border-black p-0.5 bg-blue-300 font-black text-slate-900">M</th>
                <th className="border border-black p-0.5 bg-sky-300 font-black text-slate-900">LP</th>
                <th className="border border-black p-0.5 bg-rose-300 font-black text-slate-900">OFF</th>
                <th className="border border-black p-0.5 bg-yellow-100 font-bold">P1</th>
                <th className="border border-black p-0.5 bg-yellow-100 font-bold">P2</th>
                <th className="border border-black p-0.5 bg-yellow-100 font-bold">P3</th>
                <th className="border border-black p-0.5 bg-cyan-100 font-bold text-cyan-950">P4</th>
                <th className="border border-black p-0.5 bg-slate-300 font-black text-slate-900">JK</th>
              </tr>
            </thead>
            <tbody>
              {displayedStaff.map((staff) => {
                const summary = staffSummaries.find((s) => s.staffId === staff.id);
                return (
                  <tr key={staff.id} className="border-b border-black">
                    <td className="border border-black p-0.5 font-bold bg-slate-50">{staff.id}</td>
                    <td className="border border-black p-1 text-left font-semibold truncate bg-white max-w-[170px]">
                      <span>{staff.name}</span>
                      <span className="ml-1 text-[10px] font-mono text-slate-500 font-normal lowercase">({getStaffInitials(staff)})</span>
                    </td>
                    {Array.from({ length: schedule.totalDays }, (_, i) => i + 1).map((d) => {
                      const shift = schedule.days[d]?.[staff.id] || 'O';
                      let bg = 'bg-white text-black';
                      if (shift === 'P' || shift === 'P1' || shift === 'P2' || shift === 'P3') bg = 'bg-yellow-300 text-yellow-950 font-bold';
                      if (shift === 'P4') bg = 'bg-cyan-300 text-cyan-950 font-bold';
                      if (shift === 'S') bg = 'bg-orange-300 text-orange-950 font-bold';
                      if (shift === 'S2A') bg = 'bg-amber-400 text-amber-950 font-black';
                      if (shift === 'S3A') bg = 'bg-orange-400 text-orange-950 font-black';
                      if (shift === 'S4A') bg = 'bg-emerald-400 text-emerald-950 font-black';
                      if (shift === 'M') bg = 'bg-blue-300 text-blue-950 font-bold';
                      if (shift === 'M1') bg = 'bg-indigo-300 text-indigo-950 font-black';
                      if (shift === 'M2') bg = 'bg-blue-400 text-blue-950 font-black';
                      if (shift === 'M3') bg = 'bg-fuchsia-300 text-fuchsia-950 font-black';
                      if (shift === 'LP') bg = 'bg-white text-slate-900 font-bold border border-slate-300';
                      if (shift === 'O') bg = 'bg-rose-300 text-rose-950 font-black';
                      if (shift === 'C') bg = 'bg-emerald-300 text-emerald-950 font-bold';

                      return (
                        <td key={d} className={`border border-black p-0 text-[9px] ${bg}`}>
                          <div className="flex flex-col items-center justify-center py-0.5 leading-none">
                            <span className="font-bold">{shift}</span>
                            <span 
                              className="text-[6px] opacity-80 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[46px] tracking-tight leading-none mt-0.5"
                              title={`${staff.name}-${d}`}
                            >
                              {staff.name}-{d}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="border border-black p-0.5 font-black bg-amber-200 text-slate-900">{summary?.pFull}</td>
                    <td className="border border-black p-0.5 font-black bg-orange-200 text-slate-900">{summary?.s}</td>
                    <td className="border border-black p-0.5 font-black bg-blue-200 text-slate-900">{summary?.m}</td>
                    <td className="border border-black p-0.5 font-black bg-sky-200 text-slate-900">{summary?.lp}</td>
                    <td className="border border-black p-0.5 font-black bg-rose-200 text-slate-900">{summary?.off}</td>
                    <td className="border border-black p-0.5 font-medium bg-yellow-50">{(summary?.p1 || 0) + (summary?.p || 0)}</td>
                    <td className="border border-black p-0.5 font-medium bg-yellow-50">{summary?.p2}</td>
                    <td className="border border-black p-0.5 font-medium bg-yellow-50">{summary?.p3}</td>
                    <td className="border border-black p-0.5 font-medium bg-cyan-50 text-cyan-950 font-bold">{summary?.p4 || 0}</td>
                    <td className="border border-black p-0.5 font-black bg-slate-300 text-slate-950">{summary?.totalHours}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              {/* (P1) */}
              <tr className="bg-yellow-50 font-bold border-t-2 border-black">
                <td colSpan={2} className="border border-black p-0.5 text-right font-bold">(P1) 07:00 - 15:00</td>
                {dailyStatsList.map((st, i) => (
                  <td key={i} className="border border-black p-0.5">{(st.p1 || 0) + (st.p || 0)}</td>
                ))}
                <td colSpan={10} className="border border-black"></td>
              </tr>
              {/* (P2) */}
              <tr className="bg-yellow-50 font-bold">
                <td colSpan={2} className="border border-black p-0.5 text-right font-bold">(P2) 08:00 - 16:00</td>
                {dailyStatsList.map((st, i) => (
                  <td key={i} className="border border-black p-0.5">{st.p2}</td>
                ))}
                <td colSpan={10} className="border border-black"></td>
              </tr>
              {/* (P3) */}
              <tr className="bg-yellow-50 font-bold">
                <td colSpan={2} className="border border-black p-0.5 text-right font-bold">(P3) 07:00 - 16:00 (Upacara)</td>
                {dailyStatsList.map((st, i) => (
                  <td key={i} className="border border-black p-0.5">{st.p3}</td>
                ))}
                <td colSpan={10} className="border border-black"></td>
              </tr>
              {/* (P4) */}
              <tr className="bg-cyan-50 font-bold text-cyan-950">
                <td colSpan={2} className="border border-black p-0.5 text-right font-bold">(P4) 07:00 - 20:00 (Acara/Kunjungan)</td>
                {dailyStatsList.map((st, i) => (
                  <td key={i} className="border border-black p-0.5 text-cyan-950 font-black">{st.p4 || 0}</td>
                ))}
                <td colSpan={10} className="border border-black"></td>
              </tr>
              {/* (PAGI FULL) */}
              <tr className="bg-amber-300 font-black text-slate-950">
                <td colSpan={2} className="border border-black p-0.5 text-right font-black">(PAGI FULL)</td>
                {dailyStatsList.map((st, i) => (
                  <td key={i} className="border border-black p-0.5 font-black">{st.pagiFull}</td>
                ))}
                <td colSpan={10} className="border border-black"></td>
              </tr>
              {/* (S) TOTAL SORE */}
              <tr className="bg-orange-400 font-black text-slate-950">
                <td colSpan={2} className="border border-black p-0.5 text-right font-black">(S) TOTAL SORE (15:00 - 23:00)</td>
                {dailyStatsList.map((st, i) => (
                  <td key={i} className="border border-black p-0.5 font-black">{st.s}</td>
                ))}
                <td colSpan={10} className="border border-black"></td>
              </tr>
              {/* ↳ S2A */}
              <tr className="bg-amber-200 font-bold text-amber-950">
                <td colSpan={2} className="border border-black p-0.5 text-right font-bold">↳ S2A (Kantin SMP)</td>
                {dailyStatsList.map((st, i) => (
                  <td key={i} className="border border-black p-0.5 font-bold">{st.s2a}</td>
                ))}
                <td colSpan={10} className="border border-black"></td>
              </tr>
              {/* ↳ S3A */}
              <tr className="bg-orange-200 font-bold text-orange-950">
                <td colSpan={2} className="border border-black p-0.5 text-right font-bold">↳ S3A (Kantin SMA)</td>
                {dailyStatsList.map((st, i) => (
                  <td key={i} className="border border-black p-0.5 font-bold">{st.s3a}</td>
                ))}
                <td colSpan={10} className="border border-black"></td>
              </tr>
              {/* (M) */}
              <tr className="bg-blue-300 font-black text-slate-950">
                <td colSpan={2} className="border border-black p-0.5 text-right font-black">(M) TOTAL MALAM (15:00 - 07:00)</td>
                {dailyStatsList.map((st, i) => (
                  <td key={i} className="border border-black p-0.5 font-black">{st.m}</td>
                ))}
                <td colSpan={10} className="border border-black"></td>
              </tr>
              {/* ↳ M1 */}
              <tr className="bg-indigo-100 font-bold text-indigo-950">
                <td colSpan={2} className="border border-black p-0.5 text-right font-bold">↳ M1 (Malam Sesi 1 s.d 00:00)</td>
                {dailyStatsList.map((st, i) => (
                  <td key={i} className="border border-black p-0.5 font-bold">{st.m1}</td>
                ))}
                <td colSpan={10} className="border border-black"></td>
              </tr>
              {/* ↳ M2 */}
              <tr className="bg-blue-100 font-bold text-blue-950">
                <td colSpan={2} className="border border-black p-0.5 text-right font-bold">↳ M2 (Malam Sesi 2 Subuh-07:00)</td>
                {dailyStatsList.map((st, i) => (
                  <td key={i} className="border border-black p-0.5 font-bold">{st.m2}</td>
                ))}
                <td colSpan={10} className="border border-black"></td>
              </tr>
              {/* ↳ M3 */}
              <tr className="bg-fuchsia-100 font-bold text-fuchsia-950">
                <td colSpan={2} className="border border-black p-0.5 text-right font-bold">↳ M3 (Malam Pendamping 23:00-07:00)</td>
                {dailyStatsList.map((st, i) => (
                  <td key={i} className="border border-black p-0.5 font-bold">{st.m3 || 0}</td>
                ))}
                <td colSpan={10} className="border border-black"></td>
              </tr>
              {/* CUTI */}
              <tr className="bg-emerald-200 font-bold text-slate-950">
                <td colSpan={2} className="border border-black p-0.5 text-right font-bold">CUTI</td>
                {dailyStatsList.map((st, i) => (
                  <td key={i} className="border border-black p-0.5 font-bold">{st.cuti}</td>
                ))}
                <td colSpan={10} className="border border-black"></td>
              </tr>
              {/* OFF / LIBUR + LEPAS */}
              <tr className="bg-rose-300 font-black text-slate-950">
                <td colSpan={2} className="border border-black p-0.5 text-right font-black">OFF / LIBUR + LEPAS</td>
                {dailyStatsList.map((st, i) => (
                  <td key={i} className="border border-black p-0.5 font-black">{st.offDanLepas}</td>
                ))}
                <td colSpan={10} className="border border-black"></td>
              </tr>
              {/* JUMLAH */}
              <tr className="bg-slate-300 font-black text-slate-950">
                <td colSpan={2} className="border border-black p-0.5 text-right font-black">JUMLAH</td>
                {dailyStatsList.map((st, i) => (
                  <td key={i} className="border border-black p-0.5 font-black">{st.total}</td>
                ))}
                <td colSpan={10} className="border border-black font-black"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Legend & Signature Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-start pt-4 gap-6 text-[11px]">
          <div className="space-y-2 max-w-xl">
            <div>
              <div className="font-bold underline text-[10.5px]">PETUNJUK KODE:</div>
              <div className="text-[10px] text-slate-700 dark:text-slate-300 space-y-0.5 mt-0.5">
                <div><strong>P1</strong> (07:00-15:00) | <strong>P2</strong> (08:00-16:00) | <strong>P3</strong> : Upacara Senin (07:00-16:00) | <strong>P4</strong> : Kunjungan/Acara (07:00-20:00 / Pulang Makan Malam) | <strong>S2A / S3A / S4A</strong> : Jaga Sore (15:00 - 23:00)</div>
                <div><strong>M / M1 / M2 / M3</strong> : Jaga Malam (15:00 - 07:00) | <strong>LP</strong> : Lepas Piket | <strong>O</strong> : Off / Libur | <strong>C</strong> : Cuti</div>
              </div>
            </div>

            <div className="pt-0.5 p-1.5 rounded-sm bg-cyan-50/70 dark:bg-cyan-950/30 border-l-2 border-cyan-500">
              <div className="font-bold text-slate-900 dark:text-slate-100 underline text-[10.5px]">CATATAN KHUSUS PENUGASAN PAGI & KUNJUNGAN (P4):</div>
              <ol className="list-decimal list-inside text-[10px] text-slate-800 dark:text-slate-300 space-y-0.5 mt-0.5">
                <li><strong>Waktu & Ketentuan</strong>: Jam dinas 07:00 – 20:00 WIB (13 Jam Kerja). Digunakan saat jadwal personil yang seharusnya dinas Malam (M) dialihkan masuk Pagi (P) karena ada kunjungan/agenda penting yang membutuhkan banyak personil. <strong>Pulang setelah mendampingi sesi makan malam</strong>.</li>
                <li><strong>Pukul 07:00 – 15:00</strong>: Wajib bertugas aktif membantu dan mendampingi kelancaran kunjungan/acara pagi.</li>
                <li><strong>Pukul 15:00 – 20:00</strong>: Membantu shif Sore dengan fokus tugas pokok M, yaitu patroli & pengamanan area luar belakang (lapangan upacara, sepak bola, jogging track, voli, basket).</li>
                <li><strong>Sesi Makan Malam & Kepulangan</strong>: Membantu personil <strong>S2A</strong> (Kantin SMP) dan <strong>S3A</strong> (Kantin SMA), murni sebagai pendamping teknis (bukan sebagai evaluator). Setelah seluruh rangkaian makan malam santri selesai (pukul 20:00 WIB), personil P4 diperkenankan pulang dinas.</li>
              </ol>
            </div>

            <div className="pt-0.5">
              <div className="font-bold text-slate-900 dark:text-slate-100 underline text-[10.5px]">CATATAN KHUSUS PENUGASAN SORE:</div>
              <ol className="list-decimal list-inside text-[10px] text-slate-800 dark:text-slate-300 space-y-0.5 mt-0.5">
                <li><strong>S2A</strong>: Menjaga asrama, merawat anak asuh sakit, kantin SMP dan memimpin makan malam di SMP.</li>
                <li><strong>S3A</strong>: Menjaga asrama, merawat anak asuh sakit, kantin SMA dan memimpin makan malam di SMA.</li>
                <li><strong>S4A</strong>: Pengarahan dan pendampingan anak asuh ibadah di masjid, monitoring luar kantin dan asrama.</li>
              </ol>
            </div>

            <div className="pt-0.5">
              <div className="font-bold text-slate-900 dark:text-slate-100 underline text-[10.5px]">CATATAN KHUSUS PENUGASAN MALAM :</div>
              <ol className="list-decimal list-inside text-[10px] text-slate-800 dark:text-slate-300 space-y-0.5 mt-0.5">
                <li><strong>M1</strong>: Bertugas sampai jam 00:00 (Sesi 1 malam).</li>
                <li><strong>M2</strong>: Bertugas setelah subuh sampai jam 07:00 (Sesi 2 pagi).</li>
                <li><strong>M3</strong>: Datang jam 23:00, Pulang jam 07:00. Mendampingi full semua shif malam, datang wajib keliling asrama & lingkungan sekitar serta kirim foto ke grup, pukul 03:00 dan seterusnya menjalankan kode M2.</li>
                <li>Untuk laki-laki bertugas sampai jam 00:00, untuk perempuan bertugas setelah subuh sampai jam 07:00.</li>
              </ol>
            </div>
          </div>

          <div className="text-center sm:text-right space-y-1 self-end shrink-0">
            <div>{INSTITUTION_INFO.kepalaSekolah.kota}, {INSTITUTION_INFO.kepalaSekolah.tanggal}</div>
            <div className="font-bold uppercase">KEPALA</div>
            <div className="font-bold uppercase">{INSTITUTION_INFO.kepalaSekolah.jabatan}</div>
            <div className="h-14"></div>
            <div className="font-black underline">{INSTITUTION_INFO.kepalaSekolah.nama}</div>
            <div className="font-mono text-[10px]">NIP. {INSTITUTION_INFO.kepalaSekolah.nip}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
